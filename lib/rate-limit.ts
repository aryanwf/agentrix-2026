const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60000;
const MAX_BUCKETS = 5000;
const buckets = new Map<string, {
    count: number;
    resetAt: number;
}>();
export function clientKey(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || req.headers.get("x-real-ip") || "local";
}
export type RateLimitOptions = {
    scope: string;
    limit?: number;
    windowMs?: number;
};
export type RateLimitResult = {
    ok: boolean;
    remaining: number;
    resetAt: number;
};
export function rateLimit(key: string, { scope, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    if (buckets.size > MAX_BUCKETS) {
        for (const [k, v] of buckets)
            if (v.resetAt <= now)
                buckets.delete(k);
    }
    const id = `${scope}:${key}`;
    const previous = buckets.get(id);
    const bucket = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(id, bucket);
    return {
        ok: bucket.count <= limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
    };
}
export function allow(req: Request, options: RateLimitOptions): boolean {
    return rateLimit(clientKey(req), options).ok;
}
export const RATE_LIMITED_MESSAGE = "Too many requests. Please try again shortly.";
