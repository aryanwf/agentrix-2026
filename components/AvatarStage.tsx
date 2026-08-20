"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { loadTalkingHead, type Mood, type TalkingHead } from "@/lib/talkinghead";
import { synthesize } from "@/lib/tts/client";

export type SpeakResult =
  | { mode: "audio"; chars: number; cached: boolean; words: number }
  | { mode: "muted"; chars: number };

export type AvatarHandle = {
  /** The underlying TalkingHead instance, or null until the avatar has loaded. */
  head: () => TalkingHead | null;
  speak: (
    text: string,
    opts?: {
      /** Animate visemes only — no synthesis, no credits spent. */
      mute?: boolean;
      voiceId?: string;
      onWord?: (word: string) => void;
      signal?: AbortSignal;
    },
  ) => Promise<SpeakResult | null>;
  stop: () => void;
  /**
   * Fires once every utterance queued before it has finished *playing*. `speak` resolves at
   * enqueue time, so this is the only way to know the avatar has actually stopped talking.
   */
  marker: (onReached: () => void) => void;
  setMood: (mood: Mood) => void;
  gesture: (name: string, duration?: number) => void;
  /** Must be called from a user gesture before the first speak (autoplay policy). */
  resumeAudio: () => Promise<void>;
};

type Props = {
  ref?: Ref<AvatarHandle>;
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
};

export default function AvatarStage({ ref, onReady, onError, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<TalkingHead | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;
    let head: TalkingHead | null = null;

    loadTalkingHead(node, { onProgress: (f) => !cancelled && setProgress(f) })
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        head = instance;
        headRef.current = instance;
        
        
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __cura_head?: TalkingHead }).__cura_head = instance;
        }
        setStatus("ready");
        onReadyRef.current?.();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("error");
        onErrorRef.current?.(message);
      });

    return () => {
      cancelled = true;
      headRef.current = null;
      try {
        head?.stopSpeaking();
        head?.dispose();
      } catch {
        
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    (): AvatarHandle => ({
      head: () => headRef.current,
      resumeAudio: async () => {
        const ctx = headRef.current?.audioCtx;
        if (ctx && ctx.state !== "running") await ctx.resume();
      },
      speak: async (text, opts) => {
        const head = headRef.current;
        const trimmed = text.trim();
        if (!head || !trimmed) return null;
        await head.audioCtx?.resume();

        
        
        if (opts?.mute) {
          head.speakText(trimmed, { avatarMute: true }, opts?.onWord);
          return { mode: "muted", chars: trimmed.length };
        }

        const speech = await synthesize(trimmed, head.audioCtx, {
          voiceId: opts?.voiceId,
          signal: opts?.signal,
        });

        head.speakAudio(
          {
            audio: speech.audio,
            words: speech.words,
            wtimes: speech.wtimes,
            wdurations: speech.wdurations,
          },
          {},
          opts?.onWord,
        );

        return {
          mode: "audio",
          chars: trimmed.length,
          cached: speech.cached,
          words: speech.words.length,
        };
      },
      stop: () => headRef.current?.stopSpeaking(),
      marker: (onReached) => {
        const head = headRef.current;
        if (head) head.speakMarker(onReached);
        else onReached();
      },
      setMood: (mood) => headRef.current?.setMood(mood),
      gesture: (name, duration = 2) => headRef.current?.playGesture(name, duration),
    }),
    [],
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {status === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-sm text-zinc-400">
              <div className="h-1 w-40 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span>loading avatar… {Math.round(progress * 100)}%</span>
            </div>
          ) : (
            <div className="max-w-sm rounded-lg border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
              Avatar failed to load: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
