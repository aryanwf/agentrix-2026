/**
 * Per-IP fixed-window limiter, in process memory. One implementation for every route.
 *
 * There were four near-identical copies of this before (chat, chat/simple, tts, stt, barge),
 * two counting up and two counting down. Same bug surface, four places to fix it.
 *
 * Deliberately not durable: this is a single-instance hackathon deploy, and a limiter that
 * resets on redeploy is still enough to stop one browser tab from burning the API budget.
 * Buckets are namespaced per `scope`, so a route's own limit is its own.
 */

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Best-effort client identity. Behind a proxy this is the real IP; locally it is "local". */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

export type RateLimitOptions = {
  /** Route namespace. Two routes with the same scope share one budget. */
  scope: string;
  limit?: number;
  windowMs?: number;
};

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export function rateLimit(
  key: string,
  { scope, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  // Cheap sweep so a long-lived process does not accumulate one entry per IP forever.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  const id = `${scope}:${key}`;
  const previous = buckets.get(id);
  const bucket =
    previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  buckets.set(id, bucket);

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Convenience for the common `if (!allow(req, ...)) return 429` shape. */
export function allow(req: Request, options: RateLimitOptions): boolean {
  return rateLimit(clientKey(req), options).ok;
}

export const RATE_LIMITED_MESSAGE = "Too many requests. Please try again shortly.";
