/**
 * Centralized authenticated fetch wrapper.
 * Stores the session token in memory (NOT localStorage — XSS-safe).
 * All API calls go through this to automatically include Authorization: Bearer header.
 */

let _sessionToken: string | null = null;

/** Store the session token (called after login) */
export function setSessionToken(token: string | null) {
  _sessionToken = token;
}

/** Get current session token */
export function getSessionToken(): string | null {
  return _sessionToken;
}

/** Check if a session token exists */
export function hasSessionToken(): boolean {
  return _sessionToken !== null && _sessionToken.length > 0;
}

/**
 * Authenticated fetch — same API as native fetch() but automatically
 * adds Authorization: Bearer header when a session token is available.
 * Removes credentials: 'include' (no cookies).
 */
// export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
//   const headers = new Headers(init?.headers);

//   if (_sessionToken) {
//     headers.set('Authorization', `Bearer ${_sessionToken}`);
//   }

//   // Remove credentials to avoid sending cookies
//   const { credentials, ...restInit } = init ?? {};

//   return fetch(input, {
//     ...restInit,
//     headers,
//   });
// }

const API_BASE = import.meta.env.ENV === 'production'
  ? import.meta.env.VITE_API_URL_PROD
  : import.meta.env.VITE_API_URL_DEV;
console.log('API_BASE:', API_BASE);

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (_sessionToken) {
    headers.set('Authorization', `Bearer ${_sessionToken}`);
  }

  const { credentials, ...restInit } = init ?? {};

  // 🔥 Resolver URL
  let url = typeof input === 'string' ? input : input.toString();

  // Si es relativa (/api/...)
  if (url.startsWith('/')) {
    url = `${API_BASE}${url}`;
  }

  return fetch(url, {
    ...restInit,
    headers,
  });
}