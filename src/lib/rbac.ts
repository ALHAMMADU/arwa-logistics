import { getSession } from './auth';
import { NextResponse } from 'next/server';

export type Role = 'ADMIN' | 'CUSTOMER' | 'WAREHOUSE_STAFF';

export interface RBACOptions {
  roles?: Role[];
}

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
 */
export function rateLimit(
  request: Request,
  options?: { windowMs?: number; maxRequests?: number }
): NextResponse | null {
  const windowMs = options?.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options?.maxRequests || 60; // 60 requests per minute

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const key = `${ip}:${request.url}`;

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
  if (forwarded) return forwarded.split(',')[0].trim();
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
