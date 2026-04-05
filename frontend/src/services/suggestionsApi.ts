import { authFetch } from '../lib/authFetch';

const BASE = '/api/v1/ui/suggestions';

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message || `HTTP ${res.status}`);
    err.error_key = body?.error_key;
    err.statusCode = body?.statusCode || res.status;
    throw err;
  }
  return res.json();
}

// ── Types ────────────────────────────────────────

export type SuggestionStatus = 'pending' | 'reviewing' | 'planned' | 'in_progress' | 'done' | 'declined';
export type SortMode = 'trending' | 'top' | 'new';

export interface SuggestionItem {
  id: string;
  userId: number;
  title: string;
  description: string;
  status: SuggestionStatus;
  votesCount: number;
  commentsCount: number;
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
  userName?: string;
  userPhoto?: string;
  myVote?: boolean;
}

export interface SuggestionDetail extends SuggestionItem {
  githubIssueUrl?: string;
}

export interface SuggestionComment {
  id: string;
  userId: number;
  content: string;
  isAdmin: boolean;
  createdAt: number;
  userName?: string;
  userPhoto?: string;
}

export interface SuggestionsPage {
  items: SuggestionItem[];
  total: number;
  hasMore: boolean;
}

export interface CommentsPage {
  items: SuggestionComment[];
  total: number;
  hasMore: boolean;
}

export interface SimilarSuggestion {
  id: string;
  title: string;
  votesCount: number;
  status: SuggestionStatus;
}

// ── API Functions ────────────────────────────────

export async function fetchSuggestions(
  sort: SortMode = 'trending',
  limit = 10,
  offset = 0,
  status?: string,
): Promise<SuggestionsPage> {
  const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
  if (status && status !== 'all') params.set('status', status);
  const res = await json<any>(`${BASE}?${params}`);
  return { items: res.items, total: res.total, hasMore: res.hasMore };
}

export async function fetchSuggestion(id: string): Promise<SuggestionDetail> {
  const res = await json<any>(`${BASE}/${encodeURIComponent(id)}`);
  return res.suggestion;
}

export async function createSuggestion(title: string, description: string): Promise<{ id: string }> {
  return json(`${BASE}`, {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });
}

export async function toggleVote(id: string): Promise<{ voted: boolean; votesCount: number }> {
  return json(`${BASE}/${encodeURIComponent(id)}/vote`, { method: 'POST', body: '{}' });
}

export async function addComment(id: string, content: string): Promise<{ id: string; isAdmin: boolean }> {
  return json(`${BASE}/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function fetchComments(id: string, limit = 10, offset = 0): Promise<CommentsPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await json<any>(`${BASE}/${encodeURIComponent(id)}/comments?${params}`);
  return { items: res.items, total: res.total, hasMore: res.hasMore };
}

export async function findSimilar(title: string): Promise<{ items: SimilarSuggestion[] }> {
  const params = new URLSearchParams({ title });
  return json(`${BASE}/similar?${params}`);
}

export async function updateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
  adminNote?: string,
): Promise<void> {
  await json(`${BASE}/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, adminNote }),
  });
}
