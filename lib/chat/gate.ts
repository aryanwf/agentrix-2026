import { isClearlyOffTopic, OFF_TOPIC_REPLY } from "@/lib/prompts";
import { CRISIS_SCRIPT } from "@/lib/resources";
import { classifyLexicon } from "@/lib/safety/lexicon";
import { isCrisis, type RiskTier } from "@/lib/safety/types";
export type Gate = {
    kind: "crisis";
    tier: RiskTier;
    texts: string[];
} | {
    kind: "off-topic";
    tier: RiskTier;
    texts: string[];
} | {
    kind: "model";
    tier: RiskTier;
};
export function gateUserTurn(userText: string): Gate {
    const tier = classifyLexicon(userText);
    if (isCrisis(tier))
        return { kind: "crisis", tier, texts: [...CRISIS_SCRIPT] };
    if (isClearlyOffTopic(userText))
        return { kind: "off-topic", tier, texts: [OFF_TOPIC_REPLY] };
    return { kind: "model", tier };
}
