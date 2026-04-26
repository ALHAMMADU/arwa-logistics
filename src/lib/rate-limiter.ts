import redis from './redis';
import { NextResponse } from 'next/server';

interface RateLimitOptions {
  windowMs?: number;    // Time window in milliseconds
  maxRequests?: number; // Max requests in the window
  keyPrefix?: string;   // Redis key prefix
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Redis-based sliding window rate limiter
 * Uses a sorted set for precise sliding window implementation
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    windowMs = 60 * 1000,     // 1 minute default
    maxRequests = 60,          // 60 requests per minute default
    keyPrefix = 'ratelimit',
  } = options;

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `${keyPrefix}:${key}`;

  // Use Redis MULTI for atomicity
  const pipeline = redis.pipeline();

  // Remove expired entries
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  // Add current request
  pipeline.zadd(redisKey, now, `${now}:${Math.random().toString(36).slice(2)}`);
  // Count requests in window
  pipeline.zcard(redisKey);
  // Set expiry on the key
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number || 0;

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetTime = now + windowMs;

  return { allowed, remaining, resetTime };
}

/**
 * Express/Next.js middleware wrapper for rate limiting
 * Returns null if allowed, NextResponse if rate limited
 */
export async function rateLimitMiddleware(
  request: Request,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const {
    windowMs = 60 * 1000,
    maxRequests = 60,
  } = options;

  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ips = forwarded ? forwarded.split(',') : [];
  const ip = ips.length > 0 ? ips[ips.length - 1].trim() : (request.headers.get('x-real-ip')?.trim() || 'unknown');

  // Use pathname only
  let pathname: string;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = request.url;
  }

  const key = `${ip}:${pathname}`;

  try {
    const result = await checkRateLimit(key, { windowMs, maxRequests });

    if (!result.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests, please try again later' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      );
    }

    return null; // Request allowed
  } catch (error) {
    // If Redis is down, fall back to allowing the request
    console.error('[Rate Limiter] Redis error, allowing request:', error);
    return null;
  }
}

/**
 * Different rate limit tiers for different route types
 */
export const RATE_LIMIT_TIERS = {
  // Authentication routes - strict
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },     // 10 requests per 15 min
  // Standard API routes - moderate
  api: { windowMs: 60 * 1000, maxRequests: 60 },            // 60 requests per minute
  // AI chat - stricter due to cost
  ai: { windowMs: 60 * 1000, maxRequests: 10 },             // 10 requests per minute
  // File uploads - very strict
  upload: { windowMs: 60 * 1000, maxRequests: 20 },         // 20 uploads per minute
  // Public tracking - generous
  tracking: { windowMs: 60 * 1000, maxRequests: 30 },       // 30 requests per minute
} as const;
