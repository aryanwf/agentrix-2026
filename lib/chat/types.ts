import type { Mood } from "@met4citizen/talkinghead";
import type { SuggestAction } from "@/lib/prompts";
import type { RiskTier } from "@/lib/safety/types";

export type { RiskTier, SuggestAction };

/** Client-held history. Nothing is persisted server-side — privacy is a product requirement. */
export type ChatRequest = {
  messages: { role: "user" | "assistant"; content: string }[];
  locale?: "en" | "hi" | "kn";
  /** Lexicon result computed on-device. Advisory only; the server always re-runs its own. */
  clientRisk?: RiskTier;
};

/** One JSON object per SSE `data:` line. */
export type ChatEvent =
  | { type: "risk"; tier: RiskTier; source: "lexicon" | "model" }
  | { type: "sentence"; index: number; text: string }
  | { type: "suggest"; action: SuggestAction }
  | { type: "mood"; value: Mood }
  | { type: "done"; usage?: { prompt: number; completion: number }; model?: string }
  | { type: "error"; message: string };

/** Conversation turns kept and sent upstream. 12 turns = 24 messages (PLAN §4.1). */
export const MAX_TURNS = 12;
export const MAX_MESSAGES = MAX_TURNS * 2;
/** Per-message character cap, so one pasted wall of text cannot blow the context budget. */
export const MAX_MESSAGE_CHARS = 2_000;
