import { COOKIE_NAME } from './auth';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
  domain?: string;
}

const DEFAULT_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
};

/**
 * Generate Set-Cookie header value
 */
export function setCookie(value: string, options: CookieOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts = [`${COOKIE_NAME}=${value}`];

  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);

  return parts.join('; ');
}

/**
 * Generate Set-Cookie header value to clear the cookie
 */
export function clearCookie(options: CookieOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, maxAge: 0 };
  return setCookie('', opts);
}

/**
 * Create a Response with the session cookie set
 */
export function createResponseWithCookie(body: Record<string, unknown>, token: string, status = 200): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie(token),
    },
  });
  return response;
}
