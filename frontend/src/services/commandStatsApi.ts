const BASE = '/api/v1/ui/commands';

async function json<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
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

export interface CommandStatsData {
  rating: number;
  ratingsCount: number;
  weeklyUses: number;
  favorites: number;
}

export interface MyRating {
  rating: number | null;
  review: string | null;
  feedback?: 'useful' | 'not_useful' | null;
  reason?: 'didnt_work' | 'too_slow' | 'bad_results' | 'confusing' | null;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface RankingItem {
  command: string;
  weeklyUses: number;
  favorites: number;
  trendingScore: number;
  popularScore: number;
}

export interface CommandRankingsData {
  generatedAt: number;
  trending: RankingItem[];
  popular: RankingItem[];
}

export type ReviewBadge = 'power_user' | 'active_user' | 'new_user';

export interface Review {
  id: string;
  userId: number;
  rating: number;
  review: string;
  helpfulCount: number;
  isEdited: boolean;
  myHelpful: boolean;
  date: number;
  createdAt: number;
  userName?: string;
  userPhoto?: string;
  badge?: ReviewBadge;
  trustScore?: number;
  isSuspicious?: boolean;
  commandContext?: { args?: string; resultPreview?: string };
  repliesCount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  isVerified?: boolean;
  isTrustedUser?: boolean;
  isAIModerated?: boolean;
}

export interface ReviewReply {
  id: string;
  userId: number;
  isAdmin: boolean;
  content: string;
  createdAt: number;
  isHidden?: boolean;
  isEdited?: boolean;
  editedAt?: number;
  helpfulCount?: number;
  myHelpful?: boolean;
  userName?: string;
  userPhoto?: string;
}

export interface ReviewRepliesPage {
  items: ReviewReply[];
  total: number;
  hasMore: boolean;
}

export interface ReviewSummaryText {
  text: string;
  pros: string[];
  cons: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  trend: 'positive' | 'neutral' | 'negative' | 'none';
  trendMessage: string;
  totalReviews: number;
  updatedAt: number | null;
  positiveCount: number;
  negativeCount: number;
}

export interface ReviewsPage {
  items: Review[];
  total: number;
  hasMore: boolean;
}

export interface ReviewsSummary {
  avgRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

export interface MyReview {
  id: string;
  rating: number;
  review: string;
  helpfulCount: number;
  isEdited: boolean;
  createdAt: number;
  updatedAt: number;
  status?: 'pending' | 'approved' | 'rejected';
  moderationRejectionKey?: string | null;
}

const rankingsCache = new Map<string, { expiresAt: number; data: CommandRankingsData }>();
const rankingsInflight = new Map<string, Promise<CommandRankingsData>>();
const RANKINGS_CLIENT_TTL = 60_000;

// ── API calls ────────────────────────────────────

export function fetchCommandStats(command: string): Promise<CommandStatsData> {
  return json(`${BASE}/${encodeURIComponent(command)}/stats`);
}

export function fetchMyRating(command: string): Promise<MyRating> {
  return json(`${BASE}/${encodeURIComponent(command)}/my-rating`);
}

export async function fetchCommandRankings(
  trendingLimit = 6,
  popularLimit = 6,
): Promise<CommandRankingsData> {
  const key = `${trendingLimit}:${popularLimit}`;
  const now = Date.now();
  const cached = rankingsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  const inflight = rankingsInflight.get(key);
  if (inflight) return inflight;

  const req = json<CommandRankingsData>(
    `${BASE}/rankings?trendingLimit=${trendingLimit}&popularLimit=${popularLimit}`,
  )
    .then((data) => {
      rankingsCache.set(key, {
        data,
        expiresAt: Date.now() + RANKINGS_CLIENT_TTL,
      });
      return data;
    })
    .finally(() => {
      rankingsInflight.delete(key);
    });

  rankingsInflight.set(key, req);
  return req;
}

export async function submitRating(
  command: string,
  rating: number,
  review?: string,
  context?: { args?: string; resultPreview?: string },
): Promise<{ status?: string }> {
  return await json(`${BASE}/${encodeURIComponent(command)}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, ...(review ? { review } : {}), ...(context ? { context } : {}) }),
  });
}

export function fetchReviews(
  command: string,
  limit = 10,
  offset = 0,
  sort: 'recent' | 'relevant' = 'recent',
  rating?: number,
  type?: 'positive' | 'negative',
): Promise<ReviewsPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort });
  if (rating) params.set('rating', String(rating));
  if (type) params.set('type', type);
  return json(`${BASE}/${encodeURIComponent(command)}/reviews?${params}`);
}

export function fetchReviewsSummary(command: string): Promise<ReviewsSummary> {
  return json(`${BASE}/${encodeURIComponent(command)}/reviews/summary`);
}

export function fetchMyReview(command: string): Promise<{ review: MyReview | null }> {
  return json(`${BASE}/${encodeURIComponent(command)}/my-review`);
}

export function toggleReviewHelpful(reviewId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
  return json(`${BASE}/reviews/${encodeURIComponent(reviewId)}/helpful`, { method: 'POST', body: '{}' });
}

export function deleteMyReview(command: string): Promise<void> {
  return json(`${BASE}/${encodeURIComponent(command)}/delete-review`, { method: 'POST', body: '{}' });
}

export function adminDeleteReview(reviewId: string): Promise<void> {
  return json(`${BASE}/reviews/${encodeURIComponent(reviewId)}/admin-delete`, { method: 'POST', body: '{}' });
}

export function reportReview(reviewId: string, reason = 'spam'): Promise<void> {
  return json(`${BASE}/reviews/${encodeURIComponent(reviewId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function fetchReplies(reviewId: string, limit = 20, offset = 0): Promise<ReviewRepliesPage> {
  return json(`${BASE}/reviews/${encodeURIComponent(reviewId)}/replies?limit=${limit}&offset=${offset}`);
}

export function submitReply(reviewId: string, content: string): Promise<{ id: string; isAdmin: boolean }> {
  return json(`${BASE}/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function deleteReply(replyId: string): Promise<void> {
  return json(`${BASE}/reviews/replies/${encodeURIComponent(replyId)}/delete`, { method: 'POST', body: '{}' });
}

export function editReply(replyId: string, content: string): Promise<void> {
  return json(`${BASE}/reviews/replies/${encodeURIComponent(replyId)}/edit`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function hideReply(replyId: string): Promise<{ isHidden: boolean }> {
  return json(`${BASE}/reviews/replies/${encodeURIComponent(replyId)}/hide`, { method: 'POST', body: '{}' });
}

export function toggleReplyHelpful(replyId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
  return json(`${BASE}/reviews/replies/${encodeURIComponent(replyId)}/helpful`, { method: 'POST', body: '{}' });
}

export function fetchReviewSummaryText(command: string): Promise<ReviewSummaryText> {
  return json(`${BASE}/${encodeURIComponent(command)}/reviews/summary-text`);
}

export function submitReport(
  command: string,
  category: string,
  message: string,
  screenshots?: File[],
): Promise<void> {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('message', message);
  // Honeypot field — must be empty
  formData.append('_hp', '');

  if (screenshots?.length) {
    for (const file of screenshots) {
      formData.append('screenshots', file, file.name);
    }
  }

  return fetch(`${BASE}/${encodeURIComponent(command)}/report`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || `HTTP ${res.status}`);
    }
  });
}

export interface UserReport {
  id: string;
  command: string;
  message: string;
  category: string;
  screenshots: string[];
  createdAt: number;
  status: string;
  githubIssueUrl?: string;
}

export interface UserReportsPage {
  items: UserReport[];
  total: number;
  hasMore: boolean;
}

export function fetchMyReports(limit = 10, offset = 0): Promise<UserReportsPage> {
  return json(`${BASE}/my-reports?limit=${limit}&offset=${offset}`);
}

export function fetchMyReportStatus(command: string): Promise<{ reported: boolean }> {
  return json(`${BASE}/${encodeURIComponent(command)}/my-report-status`);
}

// ── Moderation Admin API ──────────────────────────

export interface ModerationMetrics {
  totalModerated: number;
  totalRejected: number;
  totalFlagged: number;
  blockedUsers: number;
  topReasons: Record<string, number>;
}

export function fetchPendingReviews(limit = 20, offset = 0): Promise<ReviewsPage> {
  return json(`${BASE}/moderation/pending?limit=${limit}&offset=${offset}`);
}

export function fetchRejectedReviews(limit = 20, offset = 0): Promise<ReviewsPage> {
  return json(`${BASE}/moderation/rejected?limit=${limit}&offset=${offset}`);
}

export function moderationApprove(reviewId: string): Promise<void> {
  return json(`${BASE}/moderation/${encodeURIComponent(reviewId)}/approve`, { method: 'POST', body: '{}' });
}

export function moderationReject(reviewId: string): Promise<void> {
  return json(`${BASE}/moderation/${encodeURIComponent(reviewId)}/reject`, { method: 'POST', body: '{}' });
}

export function fetchModerationMetrics(): Promise<ModerationMetrics> {
  return json(`${BASE}/moderation/metrics`);
}

// ── Command Preview API ───────────────────────────

export interface CommandPreviewResult {
  result: string | null;
  cached: boolean;
}

export function fetchCommandPreview(slug: string, input: string): Promise<CommandPreviewResult> {
  return json(`${BASE}/${encodeURIComponent(slug)}/preview?input=${encodeURIComponent(input)}`);
}

// ── Community Signals API ─────────────────────────

export interface CommandSignals {
  activeUsersNow: number;
  trendingScore: number;
  regionTrend: boolean;
  discussionsCount: number;
}

export function fetchCommandSignals(slug: string): Promise<CommandSignals> {
  return json(`${BASE}/${encodeURIComponent(slug)}/signals`);
}

// ── Knowledge Base API ────────────────────────────

export interface CommandKnowledge {
  knownIssues: string[];
  tips: string[];
  lastUpdated: number | null;
}

export function fetchCommandKnowledge(slug: string): Promise<CommandKnowledge> {
  return json(`${BASE}/${encodeURIComponent(slug)}/knowledge`);
}

// ── Report Timeline API ────────────────────────────

export interface ReportTimelineEvent {
  id: string;
  type: 'issue' | 'comment';
  action: string;
  actor: { username: string; avatarUrl: string };
  content?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface ReportTimelinePage {
  items: ReportTimelineEvent[];
  hasMore: boolean;
}

export function fetchReportTimeline(reportId: string, limit = 50, before?: number): Promise<ReportTimelinePage> {
  let url = `${BASE}/reports/${encodeURIComponent(reportId)}/timeline?limit=${limit}`;
  if (before) url += `&before=${before}`;
  return json(url);
}

export interface ReportDetail {
  id: string;
  command: string;
  message: string;
  category: string;
  screenshots: string[];
  createdAt: number;
  status: string;
  githubIssueUrl?: string;
  githubIssueNumber?: number;
  githubState: 'open' | 'closed' | null;
  githubLabels: string[];
  githubAssignees: string[];
  eventsCount: number;
  lastUpdate: number;
}

export function fetchReportDetail(reportId: string): Promise<{ report: ReportDetail }> {
  return json(`${BASE}/reports/${encodeURIComponent(reportId)}`);
}
