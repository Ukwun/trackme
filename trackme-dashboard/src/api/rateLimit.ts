// Simple in-memory rate limiter (replace with Redis for production)
const RATE_LIMITS: Record<string, { count: number; start: number }> = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

export function rateLimit(key: string): boolean {
  const now = Date.now();
  if (!RATE_LIMITS[key]) {
    RATE_LIMITS[key] = { count: 1, start: now };
    return true;
  }
  const { count, start } = RATE_LIMITS[key];
  if (now - start > WINDOW_MS) {
    RATE_LIMITS[key] = { count: 1, start: now };
    return true;
  }
  if (count >= MAX_REQUESTS) {
    return false;
  }
  RATE_LIMITS[key].count++;
  return true;
}
