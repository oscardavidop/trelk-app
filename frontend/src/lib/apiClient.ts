/**
 * Centralized API client — wraps authFetch with:
 * - Automatic error parsing into typed ApiError
 * - JSON content-type headers
 * - Generic typed responses
 *
 * Usage in service files:
 *   import { api } from '../lib/apiClient';
 *   const data = await api.get<MyType>('/api/v1/ui/something');
 *   const result = await api.post<Result>('/api/v1/ui/something', { body: JSON.stringify(payload) });
 */
import { authFetch } from './authFetch';
import { ApiError } from './api-error';

const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Core request function — sends request via authFetch, parses errors into ApiError.
 */
async function request<T = any>(url: string, init?: RequestInit): Promise<T> {
  const headers = { ...JSON_HEADERS, ...((init?.headers as Record<string, string>) || {}) };

  const res = await authFetch(url, { ...init, headers });

  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const api = {
  /** GET request */
  get<T = any>(url: string, init?: RequestInit): Promise<T> {
    return request<T>(url, { ...init, method: 'GET' });
  },

  /** POST request */
  post<T = any>(url: string, init?: RequestInit): Promise<T> {
    return request<T>(url, { ...init, method: 'POST' });
  },

  /** PUT request */
  put<T = any>(url: string, init?: RequestInit): Promise<T> {
    return request<T>(url, { ...init, method: 'PUT' });
  },

  /** PATCH request */
  patch<T = any>(url: string, init?: RequestInit): Promise<T> {
    return request<T>(url, { ...init, method: 'PATCH' });
  },

  /** DELETE request */
  del<T = any>(url: string, init?: RequestInit): Promise<T> {
    return request<T>(url, { ...init, method: 'DELETE' });
  },

  /** Raw request with full control (for file uploads, etc.) */
  raw: request,
};
