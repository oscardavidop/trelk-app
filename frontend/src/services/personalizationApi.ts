import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/personalization';

async function json<T = any>(url: string): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface PersonalizedItem {
  command: string;
  name: string;
  category: string;
  description: string;
  reason: string;
  score: number;
}

export interface PersonalizationData {
  ok: boolean;
  forYou: PersonalizedItem[];
  continueUsing: PersonalizedItem[];
  basedOnHistory: PersonalizedItem[];
  discover: PersonalizedItem[];
}

export function fetchPersonalization(): Promise<PersonalizationData> {
  return json<PersonalizationData>(BASE);
}
