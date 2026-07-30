import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) =>
    // Long-lived SSE must not consume the general API budget
    typeof req.originalUrl === 'string' &&
    req.originalUrl.includes('/notifications/stream'),
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits each IP to 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
});

/**
 * Rate limiter for password reset endpoints
 * Limits each IP to 3 requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: 'Too many password reset attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for checkout endpoints
 * Limits each authenticated user to 5 checkout sessions per hour
 * Prevents abuse and excessive Stripe session creation
 */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 checkout attempts per hour
  message: 'Too many checkout attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP for authenticated endpoints
    return (req.user?.userId as string) || req.ip || 'anonymous';
  },
  skip: (req) => {
    // Only count failed requests or successful ones
    return false;
  },
});

/**
 * Rate limiter for file upload endpoints
 * Limits each authenticated user to 20 uploads per hour
 * Prevents storage abuse and excessive S3 costs
 */
/**
 * Rate limiter for AI endpoints (validation, assist)
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'AI request limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.userId as string) || req.ip || 'anonymous',
  validate: { trustProxy: false },
});

export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each user to 20 uploads per hour
  message: 'Upload limit exceeded. Please try again later or contact support.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.user?.userId as string) || req.ip || 'anonymous';
  },
});
