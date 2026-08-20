# Cura — MVP Build Plan

Hackathon MVP. Voice-first therapy-informed avatar companion. No tests, no scripts, no CI.
Ship the demo path only.

## The product in one line

You press Start, you talk, a 3D avatar listens, thinks, and talks back with lip-sync.

## Pipeline

```
mic → VAD (silence = turn ended) → /api/stt (Groq Whisper) → transcript
   → /api/chat (SSE, OpenRouter + safety) → sentences
   → /api/tts (ElevenLabs w/ timings) → TalkingHead.speakAudio() → visemes + subtitles
```

---

## DONE

| # | Thing | Where |
|---|---|---|
| 1 | 3D avatar, local GLB, lip-sync, moods, gestures | `lib/talkinghead.ts`, `components/AvatarStage.tsx`, `public/avatars/cura.glb` |
| 2 | Turbopack ↔ TalkingHead build fix | `patches/@met4citizen%2Ftalkinghead@1.7.0.patch` |
| 3 | SSE chat route: streaming, signals, model fallback chain, timeouts | `app/api/chat/route.ts`, `lib/openrouter.ts` |
| 4 | Streaming sentence splitter | `lib/sentences.ts` |
| 5 | ElevenLabs TTS proxy + disk cache + word timings | `app/api/tts/route.ts`, `lib/tts/alignment.ts` |
| 6 | Pipelined gapless speech queue with cancel | `lib/tts/queue.ts` |
| 7 | Session orchestrator: text in → avatar speaks, abort-on-new-turn | `components/SessionClient.tsx` |
| 8 | **Safety: real lexicon + LLM guard raced in the route + crisis card** | `lib/safety/lexicon.ts`, `lib/safety/classify.ts`, `components/session/CrisisCard.tsx` |
| 9 | Landing page, text chat fallback, journal | `app/page.tsx`, `app/chat`, `app/journal` |
| 10 | All 4 API keys set and working | `.env` (OpenRouter, ElevenLabs, Groq) |
| 11 | **Voice in: Silero VAD + Groq Whisper, full loop wired** | `lib/voice/{vad,stt,wav}.ts`, `app/api/stt/route.ts`, `public/vad/`, `components/SessionClient.tsx` |

So: **the loop closes.** Talk → transcript → reply → avatar speaks → listening again. What's missing
is the agent's brain, memory, and the exercises.

---

## LEFT — 3 steps, in this order

### 1. Agent brain
- `lib/agent/prompt.ts` — phase-conditioned system prompt (`opening → exploring → working → closing`),
  phase advanced by the model's `phase:` signal, clamped by turn count
- `lib/agent/techniques.ts` — 8 techniques, one prompt fragment each, injected only when selected
- Extend the control line to `<<mood:X|suggest:Y|phase:Z|note:...>>`; `SignalExtractor.parse()` gets 2 keys
- Word cap per phase, truncated at a sentence boundary server-side (60/90/80 words)

**Done when:** a 10-turn session visibly moves through phases and names exactly one technique.

### 2. Memory + presence
- `lib/store.ts` — IndexedDB: turns, rolling ≤600-char formulation built from `note:` events, mood
- Reload mid-session = continue. Second session opens referencing the first. Delete-everything button.
- Non-verbal: nod on speech start, eye-contact cadence while listening, thinking tilt, `namaste` on greet

**Done when:** it feels like it remembers you and it's alive between sentences.

### 3. Exercises + deploy
- `BreathingExercise` (4-7-8) + `GroundingExercise` (5-4-3-2-1), voiced by the avatar, fired by `suggest`
- Routes: `/3d` = the product, `/3d/bench` = Studio3D, `/session` redirects
- `GET /api/health` (all providers green), deploy to Vercel with all 4 keys

**Done when:** public URL works on a phone.

---

## Rules while building

- Never a reasoning model for chat — it burns 3 s on chain-of-thought before speaking
- Crisis output is the constant `CRISIS_SCRIPT`, never a generation
- Nothing leaves the browser except text→OpenRouter and audio→Groq. No transcript on a server.
- Every reply is spoken aloud: no markdown, no lists, no emoji
- Cura is a "therapy-informed guide", never a therapist. No diagnosis, no medication talk.

## Not doing

Auth. Server persistence. Vector DB. Non-English. Tests. Scripts. CI.
