export type RiskTier = "none" | "distress" | "high" | "imminent";
export function isCrisis(tier: RiskTier): boolean {
    return tier === "high" || tier === "imminent";
}
export const RISK_ORDER: Record<RiskTier, number> = {
    none: 0,
    distress: 1,
    high: 2,
    imminent: 3,
};
export function mergeRisk(a: RiskTier, b: RiskTier): RiskTier {
    return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}
