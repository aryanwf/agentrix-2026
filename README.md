# Cura

Voice-first, therapy-informed 3D avatar companion. You press Start, you talk, the avatar
listens, thinks, and talks back with lip-sync. Hackathon MVP — no auth, no tests, no CI.

Cura is a "therapy-informed guide", never a therapist. No diagnosis, no medication talk.

## Voice pipeline

```
mic → VAD (silence = turn ended) → /api/stt (Groq Whisper) → transcript
   → /api/chat (SSE, OpenRouter + safety) → sentences
   → /api/tts (ElevenLabs w/ timings) → TalkingHead.speakAudio() → visemes + subtitles
```

Safety: every user turn is screened in one place (`lib/chat/gate.ts`) — a four-tier lexicon
classifier (`lib/safety/lexicon.ts`). Crisis-tier turns bypass the model entirely and return
the fixed `CRISIS_SCRIPT`; the reply is never a generation.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/session` | **The product.** Voice loop, avatar, safety |
| `/3d` | Developer bench: type text, hear it, poke moods and gestures |
| `/chat` | Text-only chat, no avatar |
| `/journal` | Journal entries, Supabase-backed |

API routes: `/api/chat` (SSE with signals, used by `/session`), `/api/chat/simple`
(AI SDK UI-message stream, used by `/chat`), `/api/stt`, `/api/tts`, `/api/barge`, `/api/journal`.

## Setup

Requires [Bun](https://bun.sh) (the repo pins `bun@1.3.14` via `packageManager`; `bun.lock`
is the only lockfile).

```bash
bun install
cp .env.example .env   # fill in keys
bun dev
```

## Environment variables

| Variable | Required | Used by |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | Chat (`/api/chat`, `/api/chat/simple`) |
| `OPENROUTER_MODEL` | no | Primary chat model (default `google/gemini-2.5-flash-lite`) |
| `OPENROUTER_FALLBACK_MODEL` | no | Fallback when the primary fails |
| `OPENROUTER_GUARD_MODEL` | no | Off-topic guard |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | no | OpenRouter attribution headers |
| `ELEVENLABS_API_KEY` | yes | TTS |
| `ELEVENLABS_VOICE_ID` | yes | TTS voice |
| `ELEVENLABS_MODEL_ID` | no | Default `eleven_flash_v2_5` |
| `ELEVENLABS_OUTPUT_FORMAT` | no | Default `mp3_44100_128` |
| `TTS_CACHE_DIR` | no | Disk cache for generated speech |
| `GROQ_API_KEY` | yes | Speech-to-text |
| `GROQ_STT_MODEL` | no | Default `whisper-large-v3-turbo` |
| `GROQ_STT_PROMPT` | no | STT biasing prompt |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | for `/journal` | Journal persistence |

The service-role key bypasses RLS — server-only, never `NEXT_PUBLIC_`. See
`supabase/README.md` for the journal table setup.

## Build

```bash
bun run build
```

## Layout

- `app/` — Next.js App Router pages and API routes
- `components/` — `SessionClient` (voice loop), `Studio3D` (bench), `AvatarStage` (shared avatar mount)
- `lib/` — chat gate, safety lexicon, prompts, OpenRouter client, TTS queue/alignment, voice (VAD/STT/WAV), sentences
- `vendor/talkinghead/` — vendored TalkingHead (see its README for why)
- `public/avatars/`, `public/vad/` — avatar GLB and Silero VAD model
   