import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/security';

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface PinStatus {
  ok: boolean;
  pinEnabled: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
  lockAfterMinutes: number;
  verified: boolean;
  failedAttempts: number;
  hasSecurityQuestions: boolean;
}

export function fetchPinStatus(): Promise<PinStatus> {
  return json<PinStatus>(`${BASE}/status`);
}

export function setPin(pin: string, currentPin?: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/set-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin, currentPin }),
  });
}

export function verifyPin(pin: string): Promise<{ ok: boolean; success: boolean; attemptsLeft?: number }> {
  return json(`${BASE}/verify`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export function disablePin(pin: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/disable`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export function updatePinSettings(lockAfterMinutes: number): Promise<{ ok: boolean }> {
  return json(`${BASE}/settings`, {
    method: 'PATCH',
    body: JSON.stringify({ lockAfterMinutes }),
  });
}

// ── Security Questions ──

export function fetchAvailableQuestions(): Promise<{ ok: boolean; questions: string[] }> {
  return json(`${BASE}/questions`);
}

export function setSecurityQuestions(
  questions: { questionId: string; answer: string }[],
): Promise<{ ok: boolean }> {
  return json(`${BASE}/questions`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
}

export function fetchMyQuestions(): Promise<{ ok: boolean; questionIds: string[] }> {
  return json(`${BASE}/my-questions`);
}

// ── Recovery ──

export function verifyRecoveryAnswers(
  answers: { questionId: string; answer: string }[],
): Promise<{ ok: boolean; success: boolean; attemptsLeft?: number }> {
  return json(`${BASE}/recovery/verify`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function resetPinAfterRecovery(pin: string): Promise<{ ok: boolean }> {
  return json(`${BASE}/recovery/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}
