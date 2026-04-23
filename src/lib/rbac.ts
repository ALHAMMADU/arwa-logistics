import { getSession } from './auth';
import { NextResponse } from 'next/server';

export type Role = 'ADMIN' | 'CUSTOMER' | 'WAREHOUSE_STAFF';

export interface RBACOptions {
  roles?: Role[];
}

// Simple in-memory rate limiting store with periodic cleanup
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Periodic cleanup of expired rate limit entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if a request has proper authentication and authorization
 * Returns the session if allowed, or a NextResponse error if not
 */
export function checkAccess(
  request: Request,
  options?: RBACOptions
): { allowed: true; session: { id: string; email: string; role: string } } | { allowed: false; response: NextResponse } {
  const session = getSession(request);

  if (!session) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (options?.roles && !options.roles.includes(session.role as Role)) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, session };
}

/**
 * Rate limiting middleware - returns null if allowed, NextResponse if rate limited
 * Uses pathname only (not full URL) to prevent bypass via query params
 */
export function rateLimit(
  request: Request,
  options?: { windowMs?: number; maxRequests?: number }
): NextResponse | null {
  const windowMs = options?.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options?.maxRequests || 60; // 60 requests per minute

  const forwarded = request.headers.get('x-forwarded-for');
  // Use the rightmost IP in the chain (set by trusted reverse proxy)
  const ips = forwarded ? forwarded.split(',') : [];
  const ip = ips.length > 0 ? ips[ips.length - 1].trim() : (request.headers.get('x-real-ip')?.trim() || 'unknown');

  // Use pathname only — not full URL — to prevent bypass via query params
  let pathname: string;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = request.url;
  }
  const key = `${ip}:${pathname}`;

  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (record.count >= maxRequests) {
    return NextResponse.json(
      { success: false, error: 'Too many requests, please try again later' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
        },
      }
    );
  }

  record.count++;
  return null;
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[ips.length - 1].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    const { db } = await import('./db');
    await db.auditLog.create({ data });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
