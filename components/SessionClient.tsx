"use client";

import { Mic, MicOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat/client";
import {
  MAX_MESSAGES,
  type ChatEvent,
  type RiskTier,
  type SuggestAction,
} from "@/lib/chat/types";
import { HELPLINES } from "@/lib/resources";
import { isCrisis } from "@/lib/safety/types";
import { getTtsStatus } from "@/lib/tts/client";
import { SpeechQueue } from "@/lib/tts/queue";
import { adjudicateBargeIn, classifyBargeIn } from "@/lib/voice/backchannel";
import { transcribe } from "@/lib/voice/stt";
import type { VadHandle } from "@/lib/voice/vad";
import type { AvatarHandle } from "./AvatarStage";

// `ssr: false` is mandatory (WebGL + window) and, per the Next 16 docs, is only valid inside a
// Client Component — which is why this lives here and not in app/session/page.tsx.
const AvatarStage = dynamic(() => import("./AvatarStage"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      initialising renderer…
    </div>
  ),
});

/**
 * PLAN §5.1. With voice on, `ready` *is* the listening state — the mic is hot exactly when nothing
 * else is happening, so the loop reads: ready → transcribing → thinking → speaking → ready.
 */
type SessionState =
  "idle" | "ready" | "transcribing" | "thinking" | "speaking" | "crisis";

type Turn = { role: "user" | "assistant"; content: string };

export default function SessionClient() {
  const avatar = useRef<AvatarHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<SpeechQueue | null>(null);
  const turnStartRef = useRef<number>(0);
  const vadRef = useRef<VadHandle | null>(null);
  /** VAD callbacks are registered once but must always call the *current* send. */
  const sendRef = useRef<
    (text: string, opts?: { interruptedAnswer?: string }) => Promise<void>
  >(async () => {});
  /** Everything the model has generated this turn, delivered or not. */
  const spokenRef = useRef("");
  /** The sentence that was playing when the user cut in — context for adjudication. */
  const speakingNowRef = useRef("");
  /**
   * Set while the user is talking over a live answer. The answer is held, not cancelled: the SSE
   * stream keeps running and `SpeechQueue` keeps the undelivered text, so it can still be resumed.
   */
  const bargeRef = useRef<{ from: "thinking" | "speaking" } | null>(null);

  const [avatarReady, setAvatarReady] = useState(false);
  const [state, setState] = useState<SessionState>("idle");
  /** VAD callbacks fire outside React's flow and must read state without re-registering. */
  const stateRef = useRef<SessionState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [subtitles, setSubtitles] = useState("");
  const [muted, setMuted] = useState(false);
  const [risk, setRisk] = useState<RiskTier>("none");
  const [suggestion, setSuggestion] = useState<SuggestAction | null>(null);
  const [firstAudioMs, setFirstAudioMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [speechLevel, setSpeechLevel] = useState(0);

  // No key configured → animate visemes from estimated timings instead of failing. The session
  // stays usable (and free) without ElevenLabs.
  useEffect(() => {
    const controller = new AbortController();
    getTtsStatus(controller.signal)
      .then(
        (status) => !controller.signal.aborted && setMuted(!status.configured),
      )
      .catch(() => !controller.signal.aborted && setMuted(true));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      queueRef.current?.cancel();
    },
    [],
  );

  const send = useCallback(
    async (input: string, opts?: { interruptedAnswer?: string }) => {
      const text = input.trim();
      if (!text || state === "idle" || state === "crisis") return;

      // One in-flight turn at a time: a new question abandons the old answer outright. Note this
      // is the *committed* path — a barge-in only reaches here once we've decided the user really
      // did take the floor. A held answer never passes through here.
      abortRef.current?.abort();
      queueRef.current?.cancel();
      avatar.current?.stop();
      bargeRef.current = null;
      spokenRef.current = "";
      speakingNowRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      // A cut-off answer still happened as far as the user is concerned — they heard part of it.
      // Recording only the delivered part keeps the model from repeating what was already said, and
      // from referring back to the half it never got to speak.
      const interrupted = opts?.interruptedAnswer?.trim();
      const history = [
        ...turns,
        ...(interrupted
          ? [{ role: "assistant" as const, content: interrupted }]
          : []),
        { role: "user" as const, content: text },
      ].slice(-MAX_MESSAGES);
      setTurns(history);
      setSubtitles("");
      setError(null);
      setSuggestion(null);
      setFirstAudioMs(null);
      setState("thinking");
      turnStartRef.current = performance.now();

      let spoken = "";
      let crisis = false;

      const queue = new SpeechQueue({
        speak: async (sentence, index, onPlayed) => {
          if (controller.signal.aborted) return;
          speakingNowRef.current = sentence;
          await avatar.current?.speak(sentence, {
            mute: muted,
            signal: controller.signal,
            onWord: (word) => setSubtitles((prev) => (prev + word).slice(-400)),
            onPlayed,
          });
          if (controller.signal.aborted) return;
          if (index === 0) {
            setFirstAudioMs(
              Math.round(performance.now() - turnStartRef.current),
            );
            setState((current) =>
              current === "thinking" ? "speaking" : current,
            );
          }
        },
        onError: (err) => setError(err.message),
        onIdle: () => {
          // `speak` resolves at enqueue time, so the avatar is still talking here. The marker rides
          // the tail of TalkingHead's own queue and fires when the last word has actually played.
          avatar.current?.marker(() => {
            if (controller.signal.aborted) return;
            setState((current) => (current === "crisis" ? current : "ready"));
          });
        },
      });
      queueRef.current = queue;

      const onEvent = (event: ChatEvent) => {
        switch (event.type) {
          case "risk":
            setRisk(event.tier);
            if (isCrisis(event.tier)) {
              crisis = true;
              setState("crisis");
            }
            break;
          case "mood":
            avatar.current?.setMood(event.value);
            break;
          case "suggest":
            setSuggestion(event.action);
            break;
          case "sentence":
            spoken = spoken ? `${spoken} ${event.text}` : event.text;
            spokenRef.current = spoken;
            queue.push(event.text);
            break;
          case "error":
            setError(event.message);
            break;
          case "done":
            queue.end();
            break;
        }
      };

      try {
        await streamChat(
          { messages: history },
          { onEvent, signal: controller.signal },
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError((err as Error).message);
          setState("ready");
        }
        queue.end();
        return;
      }

      if (controller.signal.aborted) return;
      if (spoken) {
        setTurns((prev) =>
          [...prev, { role: "assistant" as const, content: spoken }].slice(
            -MAX_MESSAGES,
          ),
        );
      }
      if (!crisis && !spoken) setState("ready");
    },
    [state, turns, muted],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /**
   * VAD heard speech start. Go quiet immediately so the user has the floor.
   *
   * Nothing is cancelled here — this is a *hold*, not a stop. The /api/chat stream keeps running
   * and keeps buffering sentences; `SpeechQueue.pause` rewinds everything not yet heard back onto
   * its own pending list. Clearing the avatar's buffer is safe precisely because the queue is now
   * the only copy, which is what lets the answer resume intact if this turns out to be a "mm-hmm".
   */
  const onSpeechStart = useCallback(() => {
    const current = stateRef.current;
    if (current !== "speaking" && current !== "thinking") return;
    if (bargeRef.current) return;
    bargeRef.current = { from: current };
    avatar.current?.stop();
    queueRef.current?.pause();
  }, []);

  /** Put the held answer back on the air, from the start of the sentence that got cut off. */
  const resumeHeldAnswer = useCallback(() => {
    const barge = bargeRef.current;
    bargeRef.current = null;
    if (!barge) return;
    // Restore the state first: `resume()` can drain and fire `onIdle` synchronously, and that path
    // is allowed to overrule us with `ready` when the answer turns out to be finished.
    setState((current) =>
      current === "crisis" || current === "idle" ? current : barge.from,
    );
    queueRef.current?.resume();
  }, []);

  /** The part of this turn's answer the user actually heard before cutting in. */
  const deliveredSoFar = useCallback(() => {
    const all = spokenRef.current.trim();
    const held = (queueRef.current?.undelivered ?? "").trim();
    if (!all) return "";
    // `held` is by construction a suffix of `all` — same sentences, same order, same joiner.
    if (held && all.endsWith(held)) return all.slice(0, all.length - held.length).trim();
    return held ? "" : all;
  }, []);

  /**
   * One VAD segment: audio → transcript → turn. Silence quietly returns to listening.
   *
   * If a barge-in is being held, this is where it is judged. "mm-hmm" resumes the answer; a real
   * turn abandons it and responds instead. Only the ambiguous middle costs a round trip.
   */
  const onSpeechEnd = useCallback(
    async (audio: Float32Array) => {
      setSpeechLevel(0);
      const held = bargeRef.current;
      setState((current) =>
        current === "ready" || current === "thinking" || current === "speaking"
          ? "transcribing"
          : current,
      );

      let text = "";
      try {
        text = await transcribe(audio);
      } catch (err) {
        setError((err as Error).message);
        if (held) resumeHeldAnswer();
        else setState((c) => (c === "transcribing" ? "ready" : c));
        return;
      }

      if (!held) {
        if (!text) {
          setState((c) => (c === "transcribing" ? "ready" : c));
          return;
        }
        try {
          await sendRef.current(text);
        } catch (err) {
          setError((err as Error).message);
          setState((c) => (c === "transcribing" ? "ready" : c));
        }
        return;
      }

      let verdict = classifyBargeIn(text);
      if (verdict === "unclear") {
        verdict = await adjudicateBargeIn({
          interrupted: speakingNowRef.current,
          remaining: queueRef.current?.undelivered ?? "",
          utterance: text,
        });
      }

      if (verdict === "backchannel") {
        resumeHeldAnswer();
        return;
      }

      // The user took the floor. Capture what they heard *before* `send` cancels the queue, so the
      // abandoned half of the answer still lands in history as context.
      const interruptedAnswer = deliveredSoFar();
      bargeRef.current = null;
      try {
        await sendRef.current(text, { interruptedAnswer });
      } catch (err) {
        setError((err as Error).message);
        setState((c) => (c === "transcribing" ? "ready" : c));
      }
    },
    [resumeHeldAnswer, deliveredSoFar],
  );

  /** VAD decided that wasn't speech after all. Anything held goes straight back on the air. */
  const onMisfire = useCallback(() => {
    setSpeechLevel(0);
    if (bargeRef.current) resumeHeldAnswer();
  }, [resumeHeldAnswer]);

  const enableVoice = useCallback(async () => {
    if (vadRef.current) {
      setVoice(true);
      return;
    }
    setMicBusy(true);
    try {
      const { createVad } = await import("@/lib/voice/vad");
      vadRef.current = await createVad({
        onSpeechStart,
        onSpeechEnd: (audio) => void onSpeechEnd(audio),
        onFrame: (probability) => setSpeechLevel(probability),
        onMisfire,
      });
      setVoice(true);
    } catch (err) {
      setError((err as Error).message);
      setVoice(false);
    } finally {
      setMicBusy(false);
    }
  }, [onSpeechEnd, onSpeechStart, onMisfire]);

  const disableVoice = useCallback(() => {
    setVoice(false);
    setSpeechLevel(0);
    // Turning the mic off mid-hold must not leave the answer stranded — put it back on the air.
    if (bargeRef.current) resumeHeldAnswer();
    void vadRef.current?.pause();
  }, [resumeHeldAnswer]);

  // The mic stays hot through `thinking` and `speaking` too, so the user can barge in — it only
  // goes quiet during `transcribing` (already processing a segment) and non-conversational states.
  // Relies on getUserMedia's echoCancellation (lib/voice/vad.ts) to keep Cura's own voice from
  // re-triggering herself; see onSpeechStart/onSpeechEnd/onMisfire above for the two-stage
  // pause-then-confirm barge-in logic that also guards against false positives.
  useEffect(() => {
    const vad = vadRef.current;
    if (!vad) return;
    const micShouldBeHot =
      voice && (state === "ready" || state === "thinking" || state === "speaking");
    if (micShouldBeHot) void vad.start();
    else void vad.pause();
  }, [voice, state]);

  useEffect(() => () => void vadRef.current?.destroy(), []);

  const start = useCallback(async () => {
    // The only place AudioContext.resume() may run is inside a user gesture — and the same click
    // is the one that may raise the mic prompt, so the whole loop is armed from here.
    await avatar.current?.resumeAudio();
    setState("ready");
    await enableVoice();
  }, [enableVoice]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    queueRef.current?.cancel();
    avatar.current?.stop();
    // Explicit Stop is the one place the user really does mean "discard it".
    bargeRef.current = null;
    setState((current) => (current === "crisis" ? current : "ready"));
  }, []);

  const acknowledgeCrisis = useCallback(() => {
    setState("ready");
    setRisk("none");
  }, []);

  const busy = state === "thinking" || state === "speaking";
  // The mic is actually hot (barge-in armed) through thinking/speaking too — see the gating effect
  // above — but the label should still read "thinking"/"speaking" rather than "listening" then.
  const micHot = voice && (state === "ready" || busy);
  const listening = voice && state === "ready";
  const statusLabel = listening ? "listening" : state;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#12161c] text-zinc-100 lg:flex-row">
      <section className="relative min-h-[45vh] flex-1">
        <AvatarStage
          ref={avatar}
          onReady={() => setAvatarReady(true)}
          onError={(message) => setError(`Avatar failed: ${message}`)}
          className="h-full w-full"
        />

        {state === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <button
              onClick={start}
              disabled={!avatarReady}
              className="rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {avatarReady ? "Start session" : "Loading avatar…"}
            </button>
          </div>
        )}

        {state !== "idle" && (
          <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center gap-2">
            <button
              onClick={voice ? disableVoice : () => void enableVoice()}
              disabled={micBusy}
              title={voice ? "Mute microphone" : "Talk to Cura"}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
                listening
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : voice
                    ? "border-zinc-600 bg-black/40 text-zinc-400"
                    : "border-zinc-700 bg-black/50 text-zinc-500"
              }`}
            >
              {/* Ring scales with live speech probability — the "it hears me" feedback. Shown
                  through thinking/speaking too since the mic stays armed then, for barge-in. */}
              {micHot && (
                <span
                  className="absolute inset-0 rounded-full border border-emerald-400/60"
                  style={{
                    transform: `scale(${1 + speechLevel * 0.5})`,
                    opacity: 0.15 + speechLevel * 0.6,
                    transition: "transform 80ms linear, opacity 80ms linear",
                  }}
                />
              )}
              {voice ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <span className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-300 backdrop-blur">
              {micBusy ? "starting mic…" : statusLabel}
            </span>
          </div>
        )}

        {subtitles && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6">
            <p className="max-w-2xl rounded-lg bg-black/60 px-4 py-2 text-center text-base leading-relaxed backdrop-blur">
              {subtitles}
            </p>
          </div>
        )}
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 border-t border-zinc-800 bg-[#0d1117] p-5 lg:w-[380px] lg:border-l lg:border-t-0">
        <header className="flex items-baseline justify-between">
          <h1 className="text-sm font-semibold tracking-wide">
            Cura — session
          </h1>
          <span className="font-mono text-[11px] text-zinc-500">
            {statusLabel}
          </span>
        </header>

        {state === "crisis" && (
          <div className="rounded-md border border-red-800 bg-red-950/50 p-3 text-sm">
            <p className="font-semibold text-red-200">
              Please talk to someone who can help.
            </p>
            <ul className="mt-2 space-y-1">
              {HELPLINES.map((line) => (
                <li
                  key={line.name}
                  className="flex items-baseline justify-between gap-2"
                >
                  <a
                    href={`tel:${line.number.replace(/[^+\d]/g, "")}`}
                    className="font-medium text-red-100 underline underline-offset-2"
                  >
                    {line.name} {line.number}
                  </a>
                  <span className="shrink-0 text-[11px] text-red-300/70">
                    {line.detail}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={acknowledgeCrisis}
              className="mt-3 w-full rounded-md border border-red-700 px-3 py-1.5 text-xs text-red-100 transition-colors hover:bg-red-900/40"
            >
              I understand — continue talking
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
          {turns.length === 0 && (
            <p className="text-zinc-500">
              {voice
                ? "Just talk — Cura answers when you stop. The reply is spoken sentence by sentence as it streams, so she starts before the model has finished thinking."
                : "Type something below, or turn the mic on to talk instead."}
            </p>
          )}
          {turns.map((turn, i) => (
            <p
              key={i}
              className={
                turn.role === "user"
                  ? "ml-6 rounded-lg bg-emerald-900/30 px-3 py-2 text-emerald-100"
                  : "mr-6 rounded-lg bg-zinc-800/60 px-3 py-2 text-zinc-200"
              }
            >
              {turn.content}
            </p>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-amber-900/60 bg-amber-950/40 p-2 text-xs text-amber-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
          {firstAudioMs !== null && (
            <span
              className={
                firstAudioMs <= 2500 ? "text-emerald-400" : "text-amber-400"
              }
            >
              first audio {firstAudioMs}ms
            </span>
          )}
          {risk !== "none" && (
            <span className="text-amber-400">risk {risk}</span>
          )}
          {suggestion && <span>suggest {suggestion}</span>}
          {muted && (
            <span className="text-amber-400">muted preview (no TTS key)</span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft;
            setDraft("");
            void send(text);
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              state === "idle"
                ? "Start the session first"
                : "How are you feeling?"
            }
            disabled={state === "idle" || state === "crisis"}
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-[#161b22] px-3 py-2 text-sm outline-none focus:border-emerald-600 disabled:text-zinc-500"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={state === "idle" || state === "crisis" || !draft.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              Send
            </button>
          )}
        </form>

        <p className="text-[11px] leading-relaxed text-zinc-500">
          Cura is an AI companion, not a therapist or emergency service. Nothing
          you type is stored on our servers.
        </p>
      </aside>
    </div>
  );
}
