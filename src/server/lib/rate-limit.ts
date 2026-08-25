import type { RateLimitConfig } from "~/lib/rate-limit-config";

class SlidingWindowRateLimiter {
  private store = new Map<string, number[]>();

  check(key: string, maxRequests: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const timestamps = this.store.get(key) ?? [];
    const valid = timestamps.filter((ts) => now - ts < windowMs);

    if (valid.length >= maxRequests) {
      this.store.set(key, valid);
      return false;
    }

    valid.push(now);
    this.store.set(key, valid);
    return true;
  }
}

const globalRateLimiter = new SlidingWindowRateLimiter();

export function checkRateLimit(
  key: string,
  { maxRequests, windowSeconds }: RateLimitConfig,
): boolean {
  return globalRateLimiter.check(key, maxRequests, windowSeconds);
}

export function getRateLimitKey(options: {
  type: string;
  userId?: string;
  ip: string;
}): string {
  if (options.userId) {
    return `user:${options.userId}:${options.type}`;
  }
  return `ip:${options.ip}:${options.type}`;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = headers.get("x-real-ip");
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }
  return "unknown";
}
