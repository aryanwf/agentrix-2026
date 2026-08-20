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

export const LEXICON_IMPLEMENTED = true;

const imminentPattern =
  /\b(?:tonight|today|right now|this (?:morning|evening|week)|tomorrow|in \d+ (?:hours?|days?))\b.*\b(?:kill myself|end my life|suicide|overdose|shoot myself|hang myself|jump)\b|\b(?:kill myself|end my life|suicide|overdose|shoot myself|hang myself|jump)\b.*\b(?:tonight|today|right now|this (?:morning|evening|week)|tomorrow|in \d+ (?:hours?|days?))\b/i;
const highPattern =
  /\b(?:want to die|wish I were dead|kill myself|end my life|suicid(?:e|al)|hurt myself|harm myself|cut myself|hurt someone|harm someone|kill someone)\b/i;
const distressPattern =
  /\b(?:can't go on|cannot go on|no point (?:in )?living|hopeless|panic attack|being abused|abuse|violat(?:ed|ion)|unsafe at home)\b/i;

export function classifyLexicon(text: string): RiskTier {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "none";

  // Common negations and reports about someone else should not escalate by themselves.
  const contextual = normalized.replace(
    /\b(?:my friend|my partner|someone I know|they|he|she)\b[^.!?]{0,80}\b(?:want to die|suicide|kill themselves?)\b/g,
    "",
  );
  if (imminentPattern.test(contextual)) return "imminent";
  if (highPattern.test(contextual) && !/\b(?:don't|do not|never)\s+want to die\b/.test(contextual)) {
    return "high";
  }
  if (distressPattern.test(contextual)) return "distress";
  return "none";
}
