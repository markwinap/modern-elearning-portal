export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIG: Record<
  "public" | "protected" | "strict" | "quizAttempt" | "adminMutation",
  RateLimitConfig
> = {
  public: { maxRequests: 60, windowSeconds: 60 },
  protected: { maxRequests: 120, windowSeconds: 60 },
  strict: { maxRequests: 10, windowSeconds: 60 },
  quizAttempt: { maxRequests: 20, windowSeconds: 60 },
  adminMutation: { maxRequests: 30, windowSeconds: 60 },
};
