import { useCallback } from 'react';
import type { AlertItem } from '../services/alertsApi';

/**
 * Format seconds into human-readable countdown.
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/**
 * Format a timestamp into a human-friendly relative label.
 */
export function formatRelativeTime(runAt: number): string {
  const now = Date.now();
  const diff = runAt - now;

  if (diff <= 0) return 'Expired';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `In ${seconds}s`;
  if (seconds < 3600) return `In ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `In ${Math.floor(seconds / 3600)}h`;

  const d = new Date(runAt);
  const today = new Date();
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (d.toDateString() === tom.toDateString()) {
    return `Tomorrow at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ` at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Get the urgency level for an alert based on time left.
 * Returns a key: 'expired' | 'urgent' | 'soon' | 'normal'
 */
export function getAlertUrgency(item: AlertItem): 'expired' | 'urgent' | 'soon' | 'normal' {
  if (item.status === 'expired') return 'expired';
  if (item.secondsLeft <= 30) return 'urgent';
  if (item.secondsLeft <= 120) return 'soon';
  return 'normal';
}

/**
 * Progress ratio: 1.0 = just created, 0.0 = about to fire.
 */
export function getProgress(item: AlertItem): number {
  const total = item.runAt - item.createdAt;
  if (total <= 0) return 0;
  const remaining = item.runAt - Date.now();
  return Math.max(0, Math.min(1, remaining / total));
}

/**
 * Format full date for detail view.
 */
export function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
