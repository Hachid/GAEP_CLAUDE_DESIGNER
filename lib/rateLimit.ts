/** Simple in-process rate limiter. Best-effort in serverless (per-instance). */

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

/**
 * Returns true if the key has exceeded `maxCalls` within `windowMs`.
 * Cleans up expired entries on every check.
 */
export function isRateLimited(key: string, maxCalls: number, windowMs: number): boolean {
  const now = Date.now()

  const bucket = store.get(key)

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count++
  if (bucket.count > maxCalls) return true
  return false
}
