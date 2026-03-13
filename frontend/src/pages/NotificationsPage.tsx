import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CheckCircle,
  Star,
  Flame,
  Check,
} from 'lucide-react';
import { useNotificationsStore } from '../stores/notifications';
import type { NotificationType } from '../mocks/notifications';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(
  date: Date,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('just_now');
  if (mins < 60) return t('min_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hours_ago', { count: hours });
  return t('days_ago', { count: Math.floor(hours / 24) });
}

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  achievement: Star,
  command:     BellRing,
  subscription: Flame,
  system:      Bell,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  achievement:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  command:      'text-tg-accent bg-tg-accent/10 border-tg-accent/20',
  subscription: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  system:       'text-tg-hint bg-tg-secondary border-tg-border/40',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const { userId } = useParams();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotificationsStore();

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) => n.read);

  const handleMarkRead = (id: string) => {
    markRead(id);
  };

  return (
    <main className="pb-24 animate-fade-in relative">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-tg-bg/90 backdrop-blur-xl border-b border-tg-border/30 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center">
            <Bell size={18} className="text-tg-accent" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-tg-text leading-tight">
              {t('title')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-[12px] text-tg-hint leading-none mt-0.5">
                {unreadCount} {t('unread')}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tg-secondary text-tg-accent text-[12px] font-semibold active:scale-95 transition-all"
          >
            <Check size={13} strokeWidth={2.5} />
            {t('mark_all_read')}
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-tg-secondary border border-white/5 flex items-center justify-center mb-4">
            <Bell size={28} className="text-tg-hint/30" />
          </div>
          <p className="text-[17px] font-bold text-tg-text">{t('empty')}</p>
          <p className="text-[13px] text-tg-hint mt-1.5">{t('empty_desc')}</p>
        </div>
      )}

      {/* ── Unread section ── */}
      {unread.length > 0 && (
        <section className="px-5 mt-5 animate-slide-up">
          <h2 className="text-[11px] font-bold text-tg-hint uppercase tracking-wide mb-2 pl-1">
            {t('unread')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm divide-y divide-tg-border/20">
            {unread.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const colorCls = TYPE_COLOR[n.type];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3.5 p-4 bg-tg-accent/[0.04] active:bg-white/[0.02] transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${colorCls}`}>
                    <Icon size={18} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-tg-text leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[13px] text-tg-hint mt-0.5 truncate">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-tg-hint/60 mt-1.5">
                      {relativeTime(n.createdAt, t as (key: string, opts?: Record<string, unknown>) => string)}
                    </p>
                  </div>

                  {/* Mark read */}
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="w-7 h-7 rounded-full bg-tg-surface border border-tg-border/40 flex items-center justify-center text-tg-hint hover:text-tg-accent hover:border-tg-accent/40 transition-colors active:scale-90 shrink-0 mt-0.5"
                    aria-label={t('mark_read')}
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Read section ── */}
      {read.length > 0 && (
        <section className="px-5 mt-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-[11px] font-bold text-tg-hint uppercase tracking-wide mb-2 pl-1">
            {t('common:see_all')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/50 overflow-hidden shadow-sm divide-y divide-tg-border/20 opacity-70">
            {read.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const colorCls = TYPE_COLOR[n.type];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3.5 p-4 active:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${colorCls} grayscale`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-tg-text/70 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[13px] text-tg-hint/70 mt-0.5 truncate">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-tg-hint/50 mt-1.5">
                      {relativeTime(n.createdAt, t as (key: string, opts?: Record<string, unknown>) => string)}
                    </p>
                  </div>
                  <CheckCircle size={16} className="text-green-500/50 shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
}
