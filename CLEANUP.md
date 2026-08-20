# Cleanup Checklist

Ordered by risk-to-leave-undone, not by effort. Do them top to bottom — later items
assume earlier ones landed. Each task has a **Do** and a **Verify**.

Suggested cadence: one commit per section.

---

## 0. Safety first

### [x] 0.1 — Fix the lying comment in `lib/safety/lexicon.ts`

The header comment (lines 3–24) says `STUB — NOT YET IMPLEMENTED` and
`THE APP HAS NO SAFETY NET. Do not demo it to anyone as a mental-health tool in this state.`

This is false. Line 26 is `export const LEXICON_IMPLEMENTED = true;` and lines 28–50 are a
working classifier. In a mental-health app, a comment falsely claiming crisis detection is a
no-op is the highest-stakes defect in the repo.

**Do:** delete the stub block, replace with a short accurate docstring describing the four
tiers (`imminent` / `high` / `distress` / `none`) and the negation-guard behaviour.

**Verify:** `rg -n "NOT YET IMPLEMENTED|NO SAFETY NET" lib/` returns nothing.

### [x] 0.2 — Decide the fate of `LEXICON_IMPLEMENTED`

`app/api/chat/route.ts:95` guards on `process.env.NODE_ENV !== "production" && !LEXICON_IMPLEMENTED`.
Since the constant is now permanently `true`, that branch is dead.

**Do:** remove the constant and the dead branch, or keep it if you want the escape hatch —
but not both silently.

**Verify:** `rg -n "LEXICON_IMPLEMENTED"` matches only what you intended.

---

## 1. Delete dead weight

No behaviour change. ~700KB and ~500 lines. Do these as one commit.

### [x] 1.1 — `app/globals.css.bak`
13KB backup committed to git. Git is the backup.
```bash
git rm app/globals.css.bak
```

### [x] 1.2 — `carecompanion.tex` (repo root)
Byte-identical to `demo/carecompanion/carecompanion.tex` (confirmed via `diff -q`).
```bash
git rm carecompanion.tex
```
> If you delete `demo/` in 1.5, keep **one** copy of the `.tex` somewhere deliberate first.

### [x] 1.3 — `package-lock.json`
252KB. `packageManager` is `bun@1.3.14` and `bun.lock` is committed. Two lockfiles drift.
```bash
git rm package-lock.json
```

### [x] 1.4 — `create-next-app` boilerplate SVGs
Zero references in `app/`, `components/`, `lib/`.
```bash
git rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

### [x] 1.5 — `demo/`
Static HTML prototypes superseded by the real `app/page.tsx`. Not served, not linked.
```bash
git rm -r demo/
```

### [x] 1.6 — Unused shadcn components
Pulled in by `assistant-ui add`, never imported.
```bash
git rm components/ui/scroll-area.tsx components/ui/textarea.tsx
```

### [x] 1.7 — `components/assistant-ui/thread-list.tsx` (434 lines)
Never imported. There is no thread list, no cloud persistence, no `useRemoteThreadListRuntime`.
```bash
git rm components/assistant-ui/thread-list.tsx
```
> After this, re-check `components/ui/input.tsx` and `components/ui/skeleton.tsx` — `input.tsx`
> was used *only* by `thread-list.tsx` and becomes dead too.

### [x] 1.8 — Stray build artifact
```bash
rm tsconfig.tsbuildinfo
```
Gitignored, so it's untracked — just clear it from the working tree.

**Verify the whole section:**
```bash
npx tsc --noEmit && npm run build
```

---

## 2. Fix config and env bugs

### [ ] 2.1 — Resolve the `OPENROUTER_*` name collision

The same OpenRouter `X-Title` header is read from two different names:
- `app/api/chat/simple/route.ts:85` → `OPENROUTER_APP_NAME`
- `lib/openrouter.ts:59` → `OPENROUTER_SITE_NAME`

`.env.example` lists only `OPENROUTER_SITE_NAME`; `README.md` documents only
`OPENROUTER_APP_NAME`. One of the two routes always falls back to a hardcoded default.

**Do:** pick one name, update both call sites, `.env`, `.env.example`, and the README.

**Verify:** `rg -n "OPENROUTER_APP_NAME|OPENROUTER_SITE_NAME"` shows a single consistent name.

### [ ] 2.2 — Complete `.env.example`

Missing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, both required by `lib/supabase.ts:4-5`
for `/api/journal`. A fresh clone silently fails on the journal feature.

Also confirm these documented-in-code vars are represented:
`ELEVENLABS_MODEL_ID`, `ELEVENLABS_OUTPUT_FORMAT`, `ELEVENLABS_VOICE_ID`,
`GROQ_STT_MODEL`, `GROQ_STT_PROMPT`, `OPENROUTER_FALLBACK_MODEL`,
`OPENROUTER_GUARD_MODEL`, `TTS_CACHE_DIR`.

**Verify:** every `process.env.X` in `app/` and `lib/` has an entry in `.env.example`:
```bash
rg -oh 'process\.env\.([A-Z_]+)' -r '$1' app lib | sort -u
```

### [ ] 2.3 — Make ESLint ignore `vendor/`

114 of the 119 lint problems come from the vendored 217KB `talkinghead.mjs`, which drowns
out the 5 real errors.

**Do:** add `"vendor/**"` to `globalIgnores([...])` in `eslint.config.mjs:9`.

**Verify:** `npx eslint .` reports ~5 problems, all in `components/`.

### [ ] 2.4 — Drop `zod` or start using it

`zod@4.4.3` is a direct dependency with zero imports across `app/`, `components/`, `lib/`, `types/`.

**Verify:** `rg -n "from \"zod\"|require\(.zod.\)"` — if empty, `bun remove zod`.

### [ ] 2.5 — Drop `@ai-sdk/react`

Zero imports. `@assistant-ui/react-ai-sdk` owns that layer.
```bash
bun remove @ai-sdk/react
```

### [ ] 2.6 — Add a trailing newline to `.gitignore`

The file ends mid-line at `/skills-lock.json` with no `\n`. Causes noisy diffs on the next append.

---

## 3. Fix the 5 real lint errors

All in vendored assistant-ui registry components. These are React 19 correctness violations
that misbehave under concurrent rendering. Do them one at a time.

### [ ] 3.1 — `components/assistant-ui/attachment.tsx:44`
`Calling setState synchronously within an effect can trigger cascading renders`

### [ ] 3.2 — `components/assistant-ui/image.tsx:261`
`Calling setState synchronously within an effect can trigger cascading renders`

### [ ] 3.3 — `components/assistant-ui/file.tsx:133`
`Cannot create components during render`

### [ ] 3.4 — `components/assistant-ui/reasoning.tsx:84`
`Cannot access refs during render` (the `prevStreamingRef` read)

### [ ] 3.5 — Check upstream first
Before hand-patching, see whether the registry already fixed these:
```bash
npx assistant-ui@latest doctor
```
If upstream is fixed, re-add the components instead of patching. Note that local edits will
be clobbered by a future `assistant-ui add`, so record any manual fix in a comment.

**Verify:** `npx eslint .` is clean (after 2.3).

---

## 4. Resolve the architectural duplication

The big one. Two commits minimum. Don't start until 0–3 are done.

### [ ] 4.1 — Collapse the two chat backends

You have two complete, divergent chat backends:

| Route | Lines | Style | Only consumer |
|---|---|---|---|
| `app/api/chat/route.ts` | 195 | custom SSE, model fallback chain, `<<mood:X>>` signals, sentence splitting | `lib/chat/client.ts` → `SessionClient` |
| `app/api/chat/simple/route.ts` | 149 | AI SDK v7 UI-message stream | `app/chat/page.tsx` |

They independently duplicate rate limiting, crisis bypass, prompt assembly, and OpenRouter
header construction. Task 2.1 exists precisely because that duplication already drifted —
and duplicated safety logic means one copy eventually goes stale.

**Do:** keep both endpoints if the wire formats genuinely differ (SSE-with-signals for the
avatar vs. UI-message-stream for text chat), but extract the shared parts into `lib/chat/`:
- rate limiter
- crisis bypass + `CRISIS_SCRIPT` short-circuit
- system prompt assembly
- OpenRouter client/header construction (already partly in `lib/openrouter.ts`)

**Verify:** safety classification and rate limiting each exist in exactly one file.

### [ ] 4.2 — Collapse the two avatar harnesses

`/session` (`SessionClient`, 624 lines) and `/3d` (`Studio3D`, 295 lines) are two avatar
harnesses. `PLAN.md` step 3 already calls for `/3d` = product and `/3d/bench` = Studio3D,
with `/session` redirecting. Reality is currently the inverse.

**Do:** either execute that plan or delete the plan item. Pick one and make the routes match.

### [ ] 4.3 — Re-evaluate the vendored TalkingHead

`vendor/talkinghead/` (317KB) duplicates `node_modules/@met4citizen/talkinghead` (432KB).
`lib/talkinghead.ts:49` dynamic-imports the vendored copy while `lib/talkinghead.ts:6`
type-imports the package.

Vendoring to dodge a Turbopack bundling bug is defensible, but `build` is already pinned to
`--webpack`, so the original reason may be gone.

**Do:** try importing the package directly and run `npm run build`. If it still breaks, keep
the vendor copy and add a one-line comment at `lib/talkinghead.ts:49` explaining why, plus the
upstream issue link. Undocumented vendoring is how 317KB lives forever.

### [ ] 4.4 — Resolve the AI SDK major-version mismatch

Installed: `ai@7.0.70` but `@ai-sdk/openai@4.0.44`. The `^4` range in `package.json` pins you
to the pre-v7 provider line.

**Do:** check whether a v7-compatible `@ai-sdk/openai` exists and upgrade, or document why the
v4 provider is intentional.
```bash
npm view @ai-sdk/openai versions --json | tail -20
```

---

## 5. Documentation

### [ ] 5.1 — Rewrite `README.md`

Currently ~90% unmodified `create-next-app` filler (Geist fonts, "Learn Next.js", Vercel
deploy CTA) with one real section wedged in the middle.

Should cover: what Cura is, the voice pipeline in one diagram, `bun install && bun dev`,
the real env vars (post-2.1/2.2), and the route map.

### [ ] 5.2 — Update or delete `PLAN.md`

It cites four paths that do not exist:
- `patches/@met4citizen%2Ftalkinghead@1.7.0.patch` — no `patches/` directory at all
- `lib/safety/classify.ts` — never created; `/api/chat` imports only `lexicon.ts`
- `components/session/CrisisCard.tsx` — no `components/session/` directory
- `/3d` = product, `/session` = redirect — currently inverted (see 4.2)

**Do:** bring the DONE table in line with reality, or archive the file. A plan that
misdescribes the tree is worse than no plan.

### [ ] 5.3 — Fix one nit in `supabase/README.md`

Otherwise accurate and genuinely useful — the best doc in the repo. It just says to put vars
in `.env.local` while the project uses `.env`.

### [ ] 5.4 — Fill in `next.config.ts`

Empty stub with a `/* config options here */` placeholder. Either add real config or drop the
placeholder comment.

---

## Final verification

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

Then smoke-test each route: `/`, `/chat`, `/session`, `/3d`, `/journal`.
