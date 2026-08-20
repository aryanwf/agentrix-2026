/**
 * Shared safety vocabulary. Types only, no runtime dependencies, so both the route handler and
 * the browser bundle can import it.
 */

export type RiskTier = "none" | "distress" | "high" | "imminent";

/** Tiers that bypass the model entirely and play the fixed crisis script instead. */
export function isCrisis(tier: RiskTier): boolean {
  return tier === "high" || tier === "imminent";
}

export const RISK_ORDER: Record<RiskTier, number> = {
  none: 0,
  distress: 1,
  high: 2,
  imminent: 3,
};

/** Union of two assessments — the more severe one always wins. */
export function mergeRisk(a: RiskTier, b: RiskTier): RiskTier {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}
