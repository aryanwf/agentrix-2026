import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { alignmentToWords, type Alignment, type WordTimings } from "@/lib/tts/alignment";
import { allow } from "@/lib/rate-limit";

const API_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_flash_v2_5";
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
const DEFAULT_FORMAT = "mp3_44100_128";

const MAX_CHARS = 400;
const RATE_LIMIT = 30;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}



export type SpeechPayload = WordTimings & {
//base64 MP3
  audio: string;
  cached: boolean;
};

const CACHE_DIR = process.env.TTS_CACHE_DIR || join(tmpdir(), "cura-tts-cache");

function cacheKey(text: string, voiceId: string, modelId: string): string {
  return createHash("sha256").update(`${modelId}|${voiceId}|${text}`).digest("hex");
}

async function readCache(key: string): Promise<Omit<SpeechPayload, "cached"> | null> {
  try {
    return JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), "utf8"));
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: Omit<SpeechPayload, "cached">): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(value), "utf8");
  } catch {
    
  }
}



export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return json({ configured: false, provider: "elevenlabs" }, 200);
  }

  const info: Record<string, unknown> = {
    configured: true,
    provider: "elevenlabs",
    voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE,
    modelId: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
  };

  
  try {
    const res = await fetch(`${API_BASE}/user/subscription`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(6_000),
    });
    if (res.ok) {
      const sub = (await res.json()) as {
        character_count?: number;
        character_limit?: number;
        tier?: string;
      };
      if (typeof sub.character_count === "number" && typeof sub.character_limit === "number") {
        info.quota = {
          used: sub.character_count,
          limit: sub.character_limit,
          remaining: Math.max(0, sub.character_limit - sub.character_count),
          tier: sub.tier ?? "unknown",
        };
      }
    } else {
      info.quotaError = `subscription lookup failed (${res.status})`;
    }
  } catch (err) {
    info.quotaError = (err as Error).message;
  }

  return json(info, 200);
}

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return json({ error: "ELEVENLABS_API_KEY is not configured on the server." }, 501);
  }

  if (!allow(req, { scope: "tts", limit: RATE_LIMIT })) {
    return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  }

  let body: { text?: string; voiceId?: string; modelId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const text = body.text?.trim();
  if (!text) return json({ error: "Missing text." }, 400);
  if (text.length > MAX_CHARS) {
    return json({ error: `Text too long (${text.length} > ${MAX_CHARS} chars).` }, 413);
  }

  const voiceId = body.voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const modelId = body.modelId || process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL;
  const format = process.env.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_FORMAT;

  const key = cacheKey(text, voiceId, modelId);
  const hit = await readCache(key);
  if (hit) {
    return json({ ...hit, cached: true } satisfies SpeechPayload, 200);
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${format}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ text, model_id: modelId }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    return json({ error: `TTS upstream unreachable: ${(err as Error).message}` }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");

    
    
    if (upstream.status === 402 && detail.includes("paid_plan_required")) {
      return json(
        {
          error: `Voice ${voiceId} is a library voice, which the free tier cannot use via the API. Pick one from GET /api/tts/voices.`,
          detail: detail.slice(0, 500),
        },
        402,
      );
    }

    return json(
      { error: `ElevenLabs returned ${upstream.status}`, detail: detail.slice(0, 500) },
      upstream.status === 401 || upstream.status === 429 ? upstream.status : 502,
    );
  }

  const data = (await upstream.json()) as {
    audio_base64?: string;
    alignment?: Alignment | null;
    normalized_alignment?: Alignment | null;
  };

  if (!data.audio_base64) {
    return json({ error: "ElevenLabs returned no audio." }, 502);
  }

  
  
  const alignment = data.normalized_alignment ?? data.alignment;
  const timings: WordTimings = alignment
    ? alignmentToWords(alignment)
    : { words: [], wtimes: [], wdurations: [] };

  const payload = { audio: data.audio_base64, ...timings };
  await writeCache(key, payload);

  return json({ ...payload, cached: false } satisfies SpeechPayload, 200);
}
