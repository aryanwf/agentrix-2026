import type { Mood } from "@met4citizen/talkinghead";
import type { SuggestAction } from "@/lib/prompts";
import type { RiskTier } from "@/lib/safety/types";
export type { RiskTier, SuggestAction };
export type ChatRequest = {
    messages: {
        role: "user" | "assistant";
        content: string;
    }[];
    locale?: "en" | "hi" | "kn";
    clientRisk?: RiskTier;
};
export type ChatEvent = {
    type: "risk";
    tier: RiskTier;
    source: "lexicon" | "model";
} | {
    type: "sentence";
    index: number;
    text: string;
} | {
    type: "suggest";
    action: SuggestAction;
} | {
    type: "mood";
    value: Mood;
} | {
    type: "done";
    usage?: {
        prompt: number;
        completion: number;
    };
    model?: string;
} | {
    type: "error";
    message: string;
};
export const MAX_TURNS = 12;
export const MAX_MESSAGES = MAX_TURNS * 2;
export const MAX_MESSAGE_CHARS = 2000;
