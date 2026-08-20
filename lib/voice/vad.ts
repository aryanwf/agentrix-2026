/**
 * Silero VAD wrapper: the "when did the user stop talking" half of the voice loop.
 *
 * Everything is local — model, wasm and worklet are served from `/vad`, so no audio and no
 * telemetry leaves the browser here. Only the finished segment goes to `/api/stt`.
 *
 * `@ricky0123/vad-web` touches `window` at import time, so this module must only ever be reached
 * through a dynamic `import()` inside an effect/handler.
 */

import type { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";

export type VadHandle = {
  /** Mic hot, frames flowing. */
  start(): Promise<void>;
  /** Mic muted without dropping the permission or the stream — used while the avatar talks. */
  pause(): Promise<void>;
  destroy(): Promise<void>;
  readonly listening: boolean;
};

export type VadCallbacks = {
  onSpeechStart?: () => void;
  /** Mono Float32 @ 16 kHz, ready for `encodeWav`. */
  onSpeechEnd: (audio: Float32Array) => void;
  onMisfire?: () => void;
  /** Live speech probability, for the mic orb. */
  onFrame?: (probability: number) => void;
};

const TUNING = {
  /** Silence that counts as "your turn is over". Long enough to survive a thinking pause. */
  redemptionMs: 1_200,
  /** Below this a "turn" is a cough or a keystroke. */
  minSpeechMs: 300,
  /** Recovers the consonant that always gets clipped off the front of the first word. */
  preSpeechPadMs: 320,
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.45,
} as const;

export async function createVad(callbacks: VadCallbacks): Promise<VadHandle> {
  const { MicVAD: Mic } = await import("@ricky0123/vad-web");

  const options: Partial<RealTimeVADOptions> = {
    model: "v5",
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",
    startOnLoad: false,
    // A pause must not trigger a turn: we pause precisely when we are *not* interested in audio.
    submitUserSpeechOnPause: false,
    ...TUNING,

    // Echo cancellation is load-bearing. Without it the avatar's own voice comes back through the
    // speakers, trips the VAD, and Cura ends up in conversation with itself.
    getStream: () =>
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }),
    // Default behaviour stops the tracks, which drops the mic indicator and costs a re-acquire on
    // every single turn. Toggling `enabled` keeps the stream warm instead.
    pauseStream: async (stream) => {
      for (const track of stream.getAudioTracks()) track.enabled = false;
    },
    resumeStream: async (stream) => {
      for (const track of stream.getAudioTracks()) track.enabled = true;
      return stream;
    },

    onSpeechStart: () => callbacks.onSpeechStart?.(),
    onSpeechEnd: (audio) => callbacks.onSpeechEnd(audio),
    onVADMisfire: () => callbacks.onMisfire?.(),
    onFrameProcessed: callbacks.onFrame
      ? (probs) => callbacks.onFrame?.(probs.isSpeech)
      : undefined,
  };

  let vad: MicVAD;
  try {
    vad = await Mic.new(options);
  } catch (err) {
    throw new VadError((err as Error).message);
  }

  return {
    start: () => vad.start(),
    pause: () => vad.pause(),
    destroy: () => vad.destroy(),
    get listening() {
      return vad.listening;
    },
  };
}

export class VadError extends Error {
  constructor(message: string) {
    super(
      /permission|denied|NotAllowed/i.test(message)
        ? "Microphone access was denied. Type instead, or allow the mic and reload."
        : `Microphone setup failed: ${message}`,
    );
    this.name = "VadError";
  }
}
