"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { splitSentences } from "@/lib/sentences";
import { GESTURES, MOODS, type Mood } from "@/lib/talkinghead";
import { getTtsStatus, type TtsStatus } from "@/lib/tts/client";
import type { AvatarHandle } from "./AvatarStage";
type Voice = {
    id: string;
    name: string;
    description?: string;
};
const AvatarStage = dynamic(() => import("./AvatarStage"), {
    ssr: false,
    loading: () => (<div className="flex h-full items-center justify-center text-sm text-zinc-500">
      initialising renderer…
    </div>),
});
const SAMPLE = "I'm really glad you came back today. Take your time — there's no rush at all. How has this week been feeling for you?";
export default function Studio3D() {
    const avatar = useRef<AvatarHandle>(null);
    const [text, setText] = useState(SAMPLE);
    const [ready, setReady] = useState(false);
    const [subtitles, setSubtitles] = useState("");
    const [log, setLog] = useState<string[]>([]);
    const [moodIndex, setMoodIndex] = useState(0);
    const [status, setStatus] = useState<TtsStatus | null>(null);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [voiceId, setVoiceId] = useState<string>("");
    const [speaking, setSpeaking] = useState(false);
    const append = useCallback((line: string) => {
        setLog((prev) => [...prev.slice(-40), line]);
    }, []);
    const refreshStatus = useCallback(async () => {
        const next = await getTtsStatus();
        setStatus(next);
        setVoiceId((current) => current || next.voiceId || "");
        return next;
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        const probe = async () => {
            try {
                const next = await getTtsStatus(controller.signal);
                if (controller.signal.aborted)
                    return;
                setStatus(next);
                setVoiceId((current) => current || next.voiceId || "");
                append(next.configured
                    ? `tts: elevenlabs ready${next.quota ? ` — ${next.quota.remaining.toLocaleString()} credits left` : ""}`
                    : "tts: ELEVENLABS_API_KEY missing — silent lip-sync preview");
                if (next.quotaError)
                    append(`tts: quota unknown (${next.quotaError})`);
                if (!next.configured)
                    return;
                const res = await fetch("/api/tts/voices", { signal: controller.signal });
                const data = (await res.json()) as {
                    voices?: Voice[];
                };
                if (!controller.signal.aborted)
                    setVoices(data.voices ?? []);
            }
            catch (err) {
                if (!controller.signal.aborted)
                    append(`tts: probe failed (${(err as Error).message})`);
            }
        };
        void probe();
        return () => controller.abort();
    }, [append]);
    const handleReady = useCallback(() => {
        setReady(true);
        append("avatar ready");
    }, [append]);
    const handleError = useCallback((message: string) => append(`AVATAR FAILED: ${message}`), [append]);
    const speak = useCallback(async () => {
        const value = text.trim();
        if (!value || speaking)
            return;
        setSubtitles("");
        setSpeaking(true);
        await avatar.current?.resumeAudio();
        const sentences = splitSentences(value);
        const mute = status?.configured === false;
        append(`speaking ${sentences.length} sentence(s)${mute ? " (muted preview)" : ""}`);
        try {
            let billed = 0;
            for (const sentence of sentences) {
                const result = await avatar.current?.speak(sentence, {
                    mute,
                    voiceId: voiceId || undefined,
                    onWord: (word) => setSubtitles((prev) => (prev + word).slice(-400)),
                });
                if (result?.mode === "audio") {
                    if (!result.cached)
                        billed += result.chars;
                    append(`  ✓ ${result.words} words, ${result.chars} chars${result.cached ? " (cached, free)" : ""}`);
                }
            }
            if (billed > 0) {
                append(`spent ~${Math.ceil(billed / 2)} credits (flash bills 0.5/char)`);
                setTimeout(() => void refreshStatus().catch(() => { }), 3000);
            }
        }
        catch (err) {
            append(`TTS ERROR: ${(err as Error).message}`);
        }
        finally {
            setSpeaking(false);
        }
    }, [text, append, status, voiceId, speaking, refreshStatus]);
    const stop = useCallback(() => {
        avatar.current?.stop();
        append("stopped");
    }, [append]);
    const cycleMood = useCallback(() => {
        const next = (moodIndex + 1) % MOODS.length;
        const mood: Mood = MOODS[next];
        setMoodIndex(next);
        avatar.current?.setMood(mood);
        append(`mood → ${mood}`);
    }, [moodIndex, append]);
    const gesture = useCallback((name: string) => {
        avatar.current?.gesture(name, 3);
        avatar.current?.head()?.lookAtCamera(2000);
        append(`gesture → ${name}`);
    }, [append]);
    return (<div className="flex h-full min-h-0 flex-1 flex-col bg-[#12161c] text-zinc-100 lg:flex-row">
      <section className="relative min-h-[45vh] flex-1">
        <AvatarStage ref={avatar} onReady={handleReady} onError={handleError} className="h-full w-full" options={{ cameraY: 0.35 }}/>

        {subtitles && (<div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6">
            <p className="max-w-2xl rounded-lg bg-black/60 px-4 py-2 text-center text-base leading-relaxed backdrop-blur">
              {subtitles}
            </p>
          </div>)}
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 border-t border-zinc-800 bg-[#0d1117] p-5 lg:w-[360px] lg:border-l lg:border-t-0">
        <header>
          <h1 className="text-sm font-semibold tracking-wide">Cura — avatar bench</h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Developer bench for the avatar. The product is{" "}
            <a href="/session" className="text-emerald-400 underline underline-offset-2">
              /session
            </a>
            ; both drive the same <code className="text-zinc-300">AvatarStage</code>. ElevenLabs
            character timings via <code className="text-zinc-300">/api/tts</code> are folded
            into word timings that drive the visemes.
          </p>
        </header>

        {status?.configured === false && (<p className="rounded-md border border-amber-900/60 bg-amber-950/40 p-2 text-xs leading-relaxed text-amber-200">
            <code>ELEVENLABS_API_KEY</code> is not set, so speech is muted — visemes and
            subtitles still play with estimated timings. Add the key to <code>.env</code> for
            real audio.
          </p>)}

        {status?.quota && (<div className="rounded-md border border-zinc-800 bg-[#161b22] p-2 text-xs text-zinc-400">
            <div className="flex items-baseline justify-between">
              <span>credits ({status.quota.tier})</span>
              <span className="font-mono text-zinc-200">
                {status.quota.remaining.toLocaleString()} /{" "}
                {status.quota.limit.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${status.quota.remaining / status.quota.limit < 0.2
                ? "bg-red-500"
                : "bg-emerald-500"}`} style={{
                width: `${Math.max(0, (status.quota.remaining / status.quota.limit) * 100)}%`,
            }}/>
            </div>
            <p className="mt-1.5 leading-relaxed">
              Repeated lines are served from a server-side cache and cost nothing.
            </p>
          </div>)}

        {voices.length > 0 && (<label className="flex flex-col gap-1 text-xs text-zinc-400">
            voice
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="rounded-md border border-zinc-700 bg-[#161b22] p-2 text-sm text-zinc-100 outline-none focus:border-emerald-600">
              {voices.map((v) => (<option key={v.id} value={v.id}>
                  {v.name}
                  {v.description ? ` — ${v.description}` : ""}
                </option>))}
            </select>
          </label>)}

        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full resize-y rounded-md border border-zinc-700 bg-[#161b22] p-2 text-sm outline-none focus:border-emerald-600"/>

        <div className="flex gap-2">
          <button onClick={speak} disabled={!ready || speaking} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
            {speaking ? "Synthesising…" : `Speak (${text.trim().length} chars)`}
          </button>
          <button onClick={stop} disabled={!ready} className="rounded-md border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500">
            Stop
          </button>
        </div>

        <button onClick={cycleMood} disabled={!ready} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
          Mood: {MOODS[moodIndex]} → {MOODS[(moodIndex + 1) % MOODS.length]}
        </button>

        <div className="flex flex-wrap gap-2">
          {GESTURES.map((name) => (<button key={name} onClick={() => gesture(name)} disabled={!ready} className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500">
              {name}
            </button>))}
        </div>

        <pre className="mt-auto max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-500">
          {log.join("\n")}
        </pre>
      </aside>
    </div>);
}
