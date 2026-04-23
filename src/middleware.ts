import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Edge-compatible JWT verification ───────────────────────────
// The middleware runs in the Edge Runtime, which does not support
// Node.js `crypto` or `bcryptjs`. We replicate the minimal JWT
// verification logic here using the Web Crypto API, matching the
// HS256 / base64url scheme used in src/lib/auth.ts.

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  return secret;
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    // Verify signature using Web Crypto API (HMAC-SHA256)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getJwtSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const data = new TextEncoder().encode(`${header}.${body}`);

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

// ─── Route Protection Configuration ─────────────────────────────

interface RouteRule {
  /** HTTP methods this rule applies to. If omitted, applies to ALL methods. */
  methods?: string[];
  /** Roles allowed to access. Empty array = any authenticated user. */
  roles: string[];
}

// Public paths that never require authentication
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/tracking',
  '/api/calculate-rate',
  '/api/countries',
  '/api/routes',
];

// Path-specific protection rules (evaluated in order, first match wins)
const PROTECTED_ROUTES: { pattern: RegExp; rule: RouteRule }[] = [
  // Admin routes — ADMIN only
  {
    pattern: /^\/api\/admin(\/|$)/,
    rule: { roles: ['ADMIN'] },
  },
  // Warehouse routes — ADMIN or WAREHOUSE_STAFF
  {
    pattern: /^\/api\/warehouses(\/|$)/,
    rule: { roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  },
  // Shipment POST — any authenticated user
  {
    pattern: /^\/api\/shipments(\/|$)/,
    rule: { methods: ['POST'], roles: [] },
  },
  // Payment routes — any authenticated user
  {
    pattern: /^\/api\/payments(\/|$)/,
    rule: { roles: [] },
  },
  // Quotation routes — any authenticated user
  {
    pattern: /^\/api\/quotations(\/|$)/,
    rule: { roles: [] },
  },
  // Ticket routes — any authenticated user
  {
    pattern: /^\/api\/tickets(\/|$)/,
    rule: { roles: [] },
  },
  // Notification routes — any authenticated user
  {
    pattern: /^\/api\/notifications(\/|$)/,
    rule: { roles: [] },
  },
  // AI routes — any authenticated user
  {
    pattern: /^\/api\/ai(\/|$)/,
    rule: { roles: [] },
  },
  // Customer stats — any authenticated user
  {
    pattern: /^\/api\/customer(\/|$)/,
    rule: { roles: [] },
  },
  // Email routes — any authenticated user
  {
    pattern: /^\/api\/emails(\/|$)/,
    rule: { roles: [] },
  },
  // Shipment sub-routes (GET, PUT, PATCH, DELETE) — any authenticated user
  {
    pattern: /^\/api\/shipments(\/|$)/,
    rule: { roles: [] },
  },
  // Events (SSE) — any authenticated user
  {
    pattern: /^\/api\/events(\/|$)/,
    rule: { roles: [] },
  },
];

// ─── Middleware ──────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if this is a public path
  const isPublic = PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(publicPath + '/')
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Find matching protection rule
  const method = request.method.toUpperCase();
  let matchedRule: RouteRule | null = null;

  for (const { pattern, rule } of PROTECTED_ROUTES) {
    if (pattern.test(pathname)) {
      // If the rule specifies methods and this request's method isn't in the list, skip
      if (rule.methods && rule.methods.length > 0 && !rule.methods.includes(method)) {
        continue;
      }
      matchedRule = rule;
      break;
    }
  }

  // If no matching rule, allow through (let the route handler decide)
  if (!matchedRule) {
    return NextResponse.next();
  }

  // Extract JWT from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyTokenEdge(token);

  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Check role-based access (empty roles array = any authenticated user)
  if (matchedRule.roles.length > 0 && !matchedRule.roles.includes(payload.role)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Add user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ─── Matcher Config ─────────────────────────────────────────────

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
