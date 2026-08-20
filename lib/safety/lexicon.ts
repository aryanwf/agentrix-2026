import type { RiskTier } from "./types";

/**
 * Fast, deterministic first-pass risk classifier over the user's latest turn.
 *
 * Runs before any model call so that `/api/chat` can bypass the LLM entirely on a crisis.
 * Pattern-based, so it is cheap and never fails open on a network error; it is a floor, not a
 * ceiling — a guard model may escalate further, but never de-escalate what this returns.
 *
 * Tiers:
 *   imminent  self-harm means paired with a timeframe ("kill myself tonight")
 *   high      suicidal ideation or self-harm/other-harm intent ("want to die", "hurt myself")
 *   distress  hopelessness, panic, abuse disclosure ("can't go on", "unsafe at home")
 *   none      everything else
 *
 * Guards: third-party reports ("my friend wants to die") are stripped before matching, and
 * explicit negation ("I don't want to die") suppresses the `high` tier. The guards are
 * deliberately narrow — when a phrase is ambiguous, it escalates.
 */

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
