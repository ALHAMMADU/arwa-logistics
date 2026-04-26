// Client-side API helper
// Supports both HttpOnly cookie-based auth (browser sends cookie automatically)
// and Authorization header (for backward compatibility with mobile/API clients)

const API_BASE = '/api';

// In-memory token store (NOT localStorage — avoids XSS exposure)
let clientToken: string | null = null;

/**
 * Set the client-side token (received from login/register response).
 * The HttpOnly cookie is set by the server automatically — this token
 * is only used as a fallback Authorization header.
 */
export function setClientToken(token: string | null) {
  clientToken = token;
}

/**
 * Get the current client-side token
 */
export function getClientToken(): string | null {
  return clientToken;
}

/**
 * Clear the client-side token (on logout)
 */
export function clearClientToken() {
  clientToken = null;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  // Send Authorization header as fallback (cookie is sent automatically by browser)
  if (clientToken) {
    headers['Authorization'] = `Bearer ${clientToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res.json();
}

/**
 * Logout: call the server to clear the HttpOnly cookie, then clear client state
 */
export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch {
    // Even if the server call fails, clear client state
  }
  clearClientToken();
}
