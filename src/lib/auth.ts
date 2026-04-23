import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
}
const JWT_SECRET: string = _jwtSecret;
const SALT_ROUNDS = 12;

// ─── bcrypt Password Hashing (Primary) ──────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Try bcrypt first (new hashes start with $2)
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }
  // Fallback to legacy SHA-256 for migration
  const oldHash = hashPasswordLegacy(password);
  if (oldHash === hash) {
    return true;
  }
  return false;
}

export function needsRehash(hash: string): boolean {
  return !hash.startsWith('$2');
}

// ─── Legacy SHA-256 (for migration only) ────────────────────

const LEGACY_SALT = 'arwa-salt-2026';

function hashPasswordLegacy(password: string): string {
  return crypto.createHash('sha256').update(password + LEGACY_SALT).digest('hex');
}

// ─── JWT Token Management ───────────────────────────────────

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function getSession(request: Request): TokenPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function requireAuth(request: Request, roles?: string[]): TokenPayload | { error: string; status: number } {
  const session = getSession(request);
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (roles && !roles.includes(session.role)) return { error: 'Forbidden', status: 403 };
  return session;
}

// ─── Password Reset Token ───────────────────────────────────

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
