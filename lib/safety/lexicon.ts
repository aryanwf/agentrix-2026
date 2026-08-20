import type { RiskTier } from "./types";

/**
 * ============================================================================
 * STUB — NOT YET IMPLEMENTED. Build step 4 replaces this file wholesale.
 * ============================================================================
 *
 * This deliberately returns "none" for every input so that step 2's streaming path can be built
 * and measured. /api/chat already calls it, already emits the `risk` event, and already has the
 * crisis-bypass branch wired, so step 4 is a change to this file and `classify.ts` only — the
 * route handler does not need to be touched.
 *
 * Until step 4 lands, THE APP HAS NO SAFETY NET. Do not demo it to anyone as a mental-health
 * tool in this state.
 *
 * Target behaviour (PLAN §6.2):
 *   imminent  means + plan + timeframe ("tonight", "I have the pills")
 *   high      suicidal ideation, self-harm intent, "want to die", harm to others
 *   distress  hopelessness, "can't go on", panic, abuse disclosure
 *   none      everything else
 *
 * With negation/quotation guards ("my friend said…", "I used to feel…") to cut false positives,
 * and the standing rule: when ambiguous, escalate.
 */

/** Flipped to `true` by step 4. Read by /api/chat to warn loudly while the net is down. */
export const LEXICON_IMPLEMENTED = false;

export function classifyLexicon(_text: string): RiskTier {
  void _text;
  return "none";
}
