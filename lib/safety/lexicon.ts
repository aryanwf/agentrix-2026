import type { RiskTier } from "./types";
const imminentPattern = /\b(?:tonight|today|right now|this (?:morning|evening|week)|tomorrow|in \d+ (?:hours?|days?))\b.*\b(?:kill myself|end my life|suicide|overdose|shoot myself|hang myself|jump)\b|\b(?:kill myself|end my life|suicide|overdose|shoot myself|hang myself|jump)\b.*\b(?:tonight|today|right now|this (?:morning|evening|week)|tomorrow|in \d+ (?:hours?|days?))\b/i;
const highPattern = /\b(?:want to die|wish I were dead|kill myself|end my life|suicid(?:e|al)|hurt myself|harm myself|cut myself|hurt someone|harm someone|kill someone)\b/i;
const distressPattern = /\b(?:can't go on|cannot go on|no point (?:in )?living|hopeless|panic attack|being abused|abuse|violat(?:ed|ion)|unsafe at home)\b/i;
export function classifyLexicon(text: string): RiskTier {
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized)
        return "none";
    const contextual = normalized.replace(/\b(?:my friend|my partner|someone I know|they|he|she)\b[^.!?]{0,80}\b(?:want to die|suicide|kill themselves?)\b/g, "");
    if (imminentPattern.test(contextual))
        return "imminent";
    if (highPattern.test(contextual) && !/\b(?:don't|do not|never)\s+want to die\b/.test(contextual)) {
        return "high";
    }
    if (distressPattern.test(contextual))
        return "distress";
    return "none";
}
