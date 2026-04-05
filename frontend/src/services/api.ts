import { authFetch } from '../lib/authFetch';

const API_BASE = '/api/users';

interface ApiRequestBody {
  method: string;
  [key: string]: unknown;
}

interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean;
  error?: string;
  msg?: string;
  [key: string]: unknown;
}

export async function apiRequest<T = Record<string, unknown>>(
  method: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
  const body = new URLSearchParams();
  body.append('method', method);

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        body.append(key, JSON.stringify(value));
      } else {
        body.append(key, String(value));
      }
    }
  }

  const response = await authFetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function authenticate(initData: string) {
  return apiRequest('auth', { _auth: initData });
}

export async function changeSettings(
  settings: Record<string, unknown>,
) {
  return apiRequest('changeSettings', { settings });
}

export async function updateConfig(config: Record<string, unknown>) {
  return apiRequest('updateConfig', { config });
}

/** Update user profile via REST API */
export async function updateProfile(fields: Record<string, string>): Promise<ApiResponse> {
  const res = await authFetch('/api/v1/ui/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}
