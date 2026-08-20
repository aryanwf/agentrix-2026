import { isClearlyOffTopic, OFF_TOPIC_REPLY } from "@/lib/prompts";
import { CRISIS_SCRIPT } from "@/lib/resources";
import { classifyLexicon } from "@/lib/safety/lexicon";
import { isCrisis, type RiskTier } from "@/lib/safety/types";

/**
 * The one place a user turn is screened before it reaches a model.
 *
 * Both chat routes call this. Duplicated safety logic means one copy eventually goes stale, and
 * the copy that goes stale is the one nobody is looking at during a demo.
 *
 * Crisis bypasses the model entirely: the reply is the fixed `CRISIS_SCRIPT`, never a generation.
 * A generated crisis response can be talked out of itself, and this is the one moment that must
 * not vary.
 */
export type Gate =
  | { kind: "crisis"; tier: RiskTier; texts: string[] }
  | { kind: "off-topic"; tier: RiskTier; texts: string[] }
  | { kind: "model"; tier: RiskTier };

/**
 * `userText` must be the *server's* view of the last user turn. A `clientRisk` hint from the
 * request body is never trusted — the classification is always re-run here.
 */
export function gateUserTurn(userText: string): Gate {
  const tier = classifyLexicon(userText);

  if (isCrisis(tier)) return { kind: "crisis", tier, texts: [...CRISIS_SCRIPT] };
  if (isClearlyOffTopic(userText)) return { kind: "off-topic", tier, texts: [OFF_TOPIC_REPLY] };

  return { kind: "model", tier };
}
