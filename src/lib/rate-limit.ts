/**
 * Minimal in-memory, per-IP fixed-window rate limiter for public routes
 * (currently just /verify). No new infrastructure/account required —
 * that's the whole point for a cost-sensitive v1.
 *
 * Known limitation: state lives in the memory of whichever edge instance
 * handles the request. Vercel runs multiple instances, so this doesn't
 * give a single, globally-consistent count the way a shared store (e.g.
 * Upstash Redis) would — a determined attacker spreading requests across
 * instances or IPs can partially get around it. It's a reasonable first
 * line of defense against casual scraping, not a hard guarantee. If real
 * abuse shows up, upgrade to a shared store rather than trusting this
 * alone.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Crude bound on memory growth for a long-lived instance — if it ever fills
// up, just start over rather than tracking eviction.
const MAX_TRACKED_KEYS = 5000;

export function isRateLimited(
  key: string,
  { windowMs = 5 * 60_000, max = 20 }: { windowMs?: number; max?: number } = {},
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}

export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
