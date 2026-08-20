import type { WordTimings } from "./alignment";

export type TtsStatus = {
  configured: boolean;
  provider: string;
  voiceId?: string;
  modelId?: string;
  quota?: { used: number; limit: number; remaining: number; tier: string };
  quotaError?: string;
};

export type Speech = WordTimings & {
  audio: AudioBuffer;
  cached: boolean;
};

export class TtsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "TtsError";
  }
}

export async function getTtsStatus(signal?: AbortSignal): Promise<TtsStatus> {
  const res = await fetch("/api/tts", { signal });
  if (!res.ok) throw new TtsError(`status probe failed`, res.status);
  return res.json();
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function synthesize(
  text: string,
  audioCtx: AudioContext,
  opts: { voiceId?: string; signal?: AbortSignal } = {},
): Promise<Speech> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, voiceId: opts.voiceId }),
    signal: opts.signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new TtsError(data?.error ?? `TTS failed (${res.status})`, res.status, data?.detail);
  }

  const audio = await audioCtx.decodeAudioData(base64ToArrayBuffer(data.audio));

  return {
    audio,
    words: data.words ?? [],
    wtimes: data.wtimes ?? [],
    wdurations: data.wdurations ?? [],
    cached: Boolean(data.cached),
  };
}
