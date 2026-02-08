/**
 * Rate Limiting Utility
 * Implements IP-based and user-based rate limiting with graceful 429 responses
 * Following OWASP best practices
 */

// In-memory store for rate limit tracking
// In production, this should use Redis or similar for distributed systems
const rateLimitStore = new Map();

/**
 * Clean up old entries to prevent memory leaks
 * @param {number} maxAge - Max age in milliseconds (default 60 seconds)
 */
function cleanupStore(maxAge = 60000) {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request
 * @param {Request} req - Incoming request
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Rate limit by IP address
 * @param {Request} req - Incoming request
 * @param {Object} options - Configuration options
 * @param {number} options.maxRequests - Max requests allowed (default: 100)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function rateLimitByIp(req, options = {}) {
  const { maxRequests = 100, windowMs = 60000 } = options;
  const ip = getClientIp(req);
  const key = `ip:${ip}`;

  return checkRateLimit(key, maxRequests, windowMs);
}

/**
 * Rate limit by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Configuration options
 * @param {number} options.maxRequests - Max requests allowed (default: 50)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function rateLimitByUser(userId, options = {}) {
  const { maxRequests = 50, windowMs = 60000 } = options;
  const key = `user:${userId}`;

  return checkRateLimit(key, maxRequests, windowMs);
}

/**
 * Combined rate limiting (IP + User)
 * @param {Request} req - Incoming request
 * @param {string} userId - User ID
 * @param {Object} options - Configuration options
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function rateLimitCombined(req, userId, options = {}) {
  const ipLimit = rateLimitByIp(req, { maxRequests: options.ipMaxRequests ?? 100, windowMs: options.windowMs ?? 60000 });
  const userLimit = userId ? rateLimitByUser(userId, { maxRequests: options.userMaxRequests ?? 50, windowMs: options.windowMs ?? 60000 }) : { allowed: true };

  return {
    allowed: ipLimit.allowed && userLimit.allowed,
    remaining: Math.min(ipLimit.remaining, userLimit.remaining),
    resetTime: Math.max(ipLimit.resetTime, userLimit.resetTime)
  };
}

/**
 * Core rate limit check
 * @private
 */
function checkRateLimit(key, maxRequests, windowMs) {
  cleanupStore(windowMs);
  
  const now = Date.now();
  const data = rateLimitStore.get(key);

  if (!data) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  const timeSinceFirstRequest = now - data.firstRequest;

  if (timeSinceFirstRequest < windowMs) {
    // Still within window
    if (data.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: data.resetTime };
    }
    
    data.count++;
    return { allowed: true, remaining: maxRequests - data.count, resetTime: data.resetTime };
  }

  // Window has passed, reset
  rateLimitStore.set(key, {
    count: 1,
    firstRequest: now,
    resetTime: now + windowMs
  });
  return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
}

/**
 * Format rate limit response headers
 * @param {Object} limitInfo - Rate limit information
 * @returns {Object} Headers object
 */
export function getRateLimitHeaders(limitInfo) {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': limitInfo.remaining.toString(),
    'X-RateLimit-Reset': new Date(limitInfo.resetTime).toISOString(),
    'Retry-After': Math.ceil((limitInfo.resetTime - Date.now()) / 1000).toString()
  };
}

/**
 * Create a graceful 429 response
 * @param {Object} limitInfo - Rate limit information
 * @returns {Response} 429 Too Many Requests response
 */
export function tooManyRequestsResponse(limitInfo) {
  const resetSeconds = Math.ceil((limitInfo.resetTime - Date.now()) / 1000);
  const headers = getRateLimitHeaders(limitInfo);
  
  return Response.json(
    {
      error: 'Too many requests',
      retryAfter: resetSeconds,
      resetTime: new Date(limitInfo.resetTime).toISOString()
    },
    {
      status: 429,
      headers
    }
  );
}