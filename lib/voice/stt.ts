import { durationSeconds, encodeWav } from "./wav";

/** Anything shorter than this is not a sentence — skip the round trip. */
const MIN_SECONDS = 0.35;

export class SttError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SttError";
  }
}

/** Transcribes one VAD segment. Returns `""` for silence, noise, or a Whisper hallucination. */
export async function transcribe(
  audio: Float32Array,
  signal?: AbortSignal,
): Promise<string> {
  if (durationSeconds(audio) < MIN_SECONDS) return "";

  const form = new FormData();
  form.append("audio", encodeWav(audio), "turn.wav");

  const res = await fetch("/api/stt", { method: "POST", body: form, signal });
  const data = await res.json().catch(() => ({}));

  if (!res.ok)
    throw new SttError(
      data?.error ?? `Transcription failed (${res.status})`,
      res.status,
    );
  return (data.text ?? "").trim();
}

export async function getSttStatus(
  signal?: AbortSignal,
): Promise<{ configured: boolean }> {
  const res = await fetch("/api/stt", { signal });
  if (!res.ok) throw new SttError("status probe failed", res.status);
  return res.json();
}
