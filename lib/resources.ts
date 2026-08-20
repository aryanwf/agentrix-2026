/**
 * Curated crisis resources. This is the "RAG" of the proposal: a static, human-verified lookup
 * table, not a vector store. Six phone numbers do not need embeddings, and a model must never be
 * allowed to invent a helpline number.
 *
 * VERIFY EVERY NUMBER THE MORNING OF THE DEMO.
 */

export type Helpline = {
  name: string;
  /** Digits only where possible, so `tel:` links work on mobile. */
  number: string;
  detail: string;
};

export const HELPLINES: Helpline[] = [
  { name: "Tele-MANAS", number: "14416", detail: "Government of India, free, 24/7" },
  { name: "KIRAN", number: "1800-599-0019", detail: "Ministry of Social Justice, 24/7, 13 languages" },
  { name: "Vandrevala Foundation", number: "9999-666-555", detail: "Free counselling, 24/7" },
  { name: "AASRA", number: "+91-98204-66726", detail: "Mumbai-based, 24/7" },
  { name: "iCall", number: "9152987821", detail: "TISS, Mon-Sat 10am-8pm" },
  { name: "Emergency", number: "112", detail: "Immediate danger — police, fire, ambulance" },
];

/**
 * Spoken word-for-word when the lexicon or guard flags `high`/`imminent`. A constant, never a
 * generation: deterministic output under the highest-stakes condition is the entire point.
 */
export const CRISIS_SCRIPT = [
  "I'm really glad you told me.",
  "I'm not able to keep you safe on my own, and I want you to talk to someone who can, right now.",
  "Tele-MANAS is free and open 24 hours — 14416.",
  "If you're in immediate danger, call 112.",
  "Can you do that while I stay here with you?",
];

/**
 * Spoken when every model in the fallback chain fails. The avatar must always say something —
 * silence after a person has just opened up is the worst possible failure mode.
 */
export const FALLBACK_REPLY = [
  "Sorry, I lost my train of thought for a second there.",
  "I'm still here with you — could you tell me that part again?",
];
