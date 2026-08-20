/**
 * Speech-to-text proxy. Audio in (WAV, 16 kHz mono from the browser VAD), transcript out.
 *
 * Groq's Whisper endpoint is OpenAI-compatible. The key never reaches the client, and nothing is
 * written to disk here — the audio buffer dies with the request.
 */

import { allow } from "@/lib/rate-limit";

const API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3-turbo";

/** ~30 s of 16 kHz 16-bit mono, well inside Groq's 25 MB limit. */
const MAX_BYTES = 8 * 1024 * 1024;

const RATE_LIMIT = 60;

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export type SttPayload = { text: string };

export async function GET() {
  return json(
    { configured: Boolean(process.env.GROQ_API_KEY), provider: "groq" },
    200,
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json(
      { error: "GROQ_API_KEY is not configured on the server." },
      501,
    );
  }

  if (!allow(req, { scope: "stt", limit: RATE_LIMIT })) {
    return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  }

  let audio: Blob;
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob))
      return json({ error: "Missing audio file." }, 400);
    audio = file;
  } catch {
    return json(
      { error: "Expected multipart/form-data with an `audio` field." },
      400,
    );
  }

  if (audio.size > MAX_BYTES) {
    return json(
      { error: `Audio too large (${audio.size} > ${MAX_BYTES} bytes).` },
      413,
    );
  }
  // A clipped VAD segment shorter than ~0.1 s is a door slam, not a sentence.
  if (audio.size < 4_000) return json({ text: "" } satisfies SttPayload, 200);

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "turn.wav");
  upstreamForm.append("model", process.env.GROQ_STT_MODEL || DEFAULT_MODEL);
  upstreamForm.append("response_format", "json");
  upstreamForm.append("temperature", "0");
  upstreamForm.append("language", "en");
  const hint = process.env.GROQ_STT_PROMPT?.trim();
  if (hint) upstreamForm.append("prompt", hint);

  let upstream: Response;
  try {
    upstream = await fetch(API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return json(
      { error: `STT upstream unreachable: ${(err as Error).message}` },
      502,
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json(
      {
        error: `Groq returned ${upstream.status}`,
        detail: detail.slice(0, 500),
      },
      upstream.status === 401 || upstream.status === 429
        ? upstream.status
        : 502,
    );
  }

  const data = (await upstream.json().catch(() => ({}))) as { text?: string };
  const text = (data.text ?? "").trim();

  // Whisper hallucinates boilerplate on silence ("Thank you.", "[BLANK_AUDIO]"). Drop it rather
  // than letting the avatar answer a sound the user never made.
  const noise = /^(\[.*\]|\(.*\)|thanks? (you|for watching).*|you|bye|\.|,)$/i;
  return json({ text: noise.test(text) ? "" : text } satisfies SttPayload, 200);
}
