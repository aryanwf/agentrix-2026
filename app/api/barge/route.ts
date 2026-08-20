/**
 * Barge-in adjudication (tier 2).
 *
 * Only reached for interruptions the local heuristic in `lib/voice/backchannel.ts` could not call.
 * Question: the user talked over Cura mid-answer — is the rest of that answer still worth
 * finishing, or has the user moved the conversation somewhere else?
 *
 * Deliberately tiny: a fast guard model, temperature 0, a handful of output tokens. It sits on the
 * critical path between "user stopped talking" and "Cura starts again", so it gets a short timeout
 * and fails toward `respond` — leaving a real question unanswered is far worse than answering an
 * interjection that turned out to be filler.
 */

import { complete, guardModel, OpenRouterError } from "@/lib/openrouter";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 15;

const RATE_LIMIT = 60;
const MAX_CHARS = 600;
const TIMEOUT_MS = 3_000;

export type BargeDecision = "continue" | "respond";

const SYSTEM = `You decide whether an interrupted answer should be finished.

A speaker was in the middle of saying something when the listener spoke over them.
Decide what the listener meant:

CONTINUE - the listener was only signalling attention or agreement (backchannelling),
encouraging the speaker to keep going, or reacting without asking for anything. The
speaker's unfinished point is still wanted.

RESPOND - the listener asked something, objected, corrected, changed the subject, asked
the speaker to stop or repeat, or otherwise took over the conversation. The unfinished
point is no longer what the listener wants.

Answer with exactly one word: CONTINUE or RESPOND.`;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  // Fails toward `respond`, same as every other failure path in this route.
  if (!allow(req, { scope: "barge", limit: RATE_LIMIT })) {
    return json({ decision: "respond", reason: "rate-limited" }, 429);
  }

  let body: { interrupted?: string; remaining?: string; utterance?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const utterance = (body.utterance ?? "").trim().slice(0, MAX_CHARS);
  if (!utterance) return json({ decision: "continue" }, 200);

  const interrupted = (body.interrupted ?? "").trim().slice(0, MAX_CHARS);
  const remaining = (body.remaining ?? "").trim().slice(0, MAX_CHARS);

  try {
    const raw = await complete({
      model: guardModel(),
      maxTokens: 4,
      temperature: 0,
      timeoutMs: TIMEOUT_MS,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            `Speaker was saying: "${interrupted}"`,
            remaining ? `Still unsaid: "${remaining}"` : null,
            `Listener interrupted with: "${utterance}"`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const decision: BargeDecision = /continue/i.test(raw) ? "continue" : "respond";
    return json({ decision }, 200);
  } catch (err) {
    
    
    const status = err instanceof OpenRouterError && err.status === 501 ? 501 : 200;
    return json({ decision: "respond", reason: "unavailable" }, status);
  }
}
