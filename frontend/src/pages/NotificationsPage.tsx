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
  if (mins < 60) return t('min_ago', { count: mins, defaultValue: `${mins}m ago` });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hours_ago', { count: hours, defaultValue: `${hours}h ago` });
  return t('days_ago', { count: Math.floor(hours / 24), defaultValue: `${Math.floor(hours / 24)}d ago` });
}

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  achievement: Star,
  command:     BellRing,
  subscription: Flame,
  system:      Bell,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  achievement:  'text-amber-500 bg-amber-500/10 border-amber-500/20',
  command:      'text-tg-accent bg-tg-accent/10 border-tg-accent/20',
  subscription: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  system:       'text-tg-text bg-tg-hint/10 border-tg-border/40',
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
    <main className="pb-28 animate-fade-in relative max-w-[480px] mx-auto min-h-screen">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-tg-bg/85 backdrop-blur-xl border-b border-tg-border/20 px-5 pt-4 pb-3 flex items-center justify-between shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[14px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-sm">
            <Bell size={20} className="text-sky-500" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-tg-text leading-tight tracking-tight">
              {t('title', 'Notifications')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-[13px] font-medium text-tg-hint leading-snug mt-0.5">
                {unreadCount} {t('unread', 'Unread')}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-tg-accent/10 text-tg-accent border border-tg-accent/20 text-[13px] font-bold active:scale-95 transition-all shadow-sm"
          >
            <Check size={16} strokeWidth={2.5} />
            {t('mark_all_read', 'Mark All Read')}
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center animate-fade-in">
          <div className="w-[72px] h-[72px] rounded-[24px] bg-tg-secondary border border-tg-border/40 flex items-center justify-center mb-5 shadow-sm">
            <Bell size={32} className="text-tg-hint/50" />
          </div>
          <p className="text-[20px] font-bold text-tg-text mb-1">{t('empty', 'No notifications')}</p>
          <p className="text-[14px] font-medium text-tg-hint leading-relaxed max-w-[250px] mx-auto">
            {t('empty_desc', 'You are all caught up! New alerts will appear here.')}
          </p>
        </div>
      )}

      {/* ── Unread section ── */}
      {unread.length > 0 && (
        <section className="px-5 mt-5 animate-slide-up">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
            {t('unread', 'Unread')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">
            {unread.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const colorCls = TYPE_COLOR[n.type];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3.5 p-4 bg-tg-accent/[0.04] active:bg-tg-hint/5 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95 ${colorCls}`}>
                    <Icon size={18} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[15px] font-semibold text-tg-text leading-tight">
                      {n.title}
                    </p>
                    <p className="text-[13px] font-medium text-tg-hint/90 mt-1 leading-snug">
                      {n.message}
                    </p>
                    <p className="text-[11px] font-bold text-tg-hint/60 mt-2 uppercase tracking-wide">
                      {relativeTime(n.createdAt, t as (key: string, opts?: Record<string, unknown>) => string)}
                    </p>
                  </div>

                  {/* Mark read button */}
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="w-8 h-8 rounded-[10px] bg-tg-bg border border-tg-border/40 flex items-center justify-center text-tg-hint hover:text-tg-accent hover:border-tg-accent/40 transition-all active:scale-90 shrink-0 shadow-sm"
                    aria-label={t('mark_read', 'Mark as read')}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Read section ── */}
      {read.length > 0 && (
        <section className="px-5 mt-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider mb-2.5 pl-1">
            {t('common:see_all', 'Earlier')}
          </h2>
          <div className="rounded-[20px] bg-tg-secondary border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20 opacity-80">
            {read.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const colorCls = TYPE_COLOR[n.type];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3.5 p-4 active:bg-tg-hint/5 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-[12px] border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-active:scale-95 ${colorCls} grayscale opacity-70`}>
                    <Icon size={18} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[15px] font-semibold text-tg-text/80 leading-tight">
                      {n.title}
                    </p>
                    <p className="text-[13px] font-medium text-tg-hint/80 mt-1 leading-snug">
                      {n.message}
                    </p>
                    <p className="text-[11px] font-bold text-tg-hint/50 mt-2 uppercase tracking-wide">
                      {relativeTime(n.createdAt, t as (key: string, opts?: Record<string, unknown>) => string)}
                    </p>
                  </div>

                  {/* Checked Indicator */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} className="text-emerald-500/40" strokeWidth={2.5} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
}