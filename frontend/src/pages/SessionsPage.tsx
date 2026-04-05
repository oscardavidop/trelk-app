import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Smartphone, Tablet, Globe, Trash2, Check, X,
  Shield, Wifi, MapPin, Clock,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useHideIsland } from '../hooks/useHideIsland';
import { MOTION, staggerContainer, staggerItem } from '../design';
import { fetchSessions, revokeSession, revokeAllSessions } from '../services/sessionsApi';
import type { DeviceSession } from '../services/sessionsApi';
import { useToastStore } from '../stores';
import StickyHeader from '@/components/StickyHeader';

function getDeviceIcon(session: DeviceSession) {
  const d = (session.device || '').toLowerCase();
  if (d.includes('iphone') || d.includes('android')) return Smartphone;
  if (d.includes('ipad') || d.includes('tablet')) return Tablet;
  return Monitor;
}

function maskIp(ip?: string): string {
  if (!ip || ip === 'unknown') return '';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.replace(/:[\da-f]+:[\da-f]+$/i, ':*:*');
}

function timeAgo(dateStr: string, t: (k: string, o?: any) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('just_now');
  if (mins < 60) return t('mins_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hours_ago', { count: hours });
  const days = Math.floor(hours / 24);
  return t('days_ago', { count: days });
}

export default function SessionsPage() {
  useHideIsland();
  const { t } = useTranslation('sessions');
  const { haptic } = useTelegram();
  const toast = useToastStore();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.show(t('revoked'), 'success');
      haptic?.notificationOccurred('success');
      setConfirmId(null);
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.show(t('revoked_all', { count }), 'success');
      haptic?.notificationOccurred('success');
      setConfirmAll(false);
    },
  });

  const current = sessions.find((s) => s.isCurrent);
  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title={t('title')} subtitle={t('subtitle')} />

      <motion.div variants={staggerContainer} initial="initial" animate="animate">
        {/* ── Current Session ── */}
        {current && (
          <motion.section variants={staggerItem} className="px-5 mt-2">
            <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider pl-2 mb-2.5">{t('current')}</h2>
            <div className="rounded-[20px] bg-tg-secondary border border-tg-accent/20 overflow-hidden shadow-sm relative">
              <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-tg-accent/5 to-transparent pointer-events-none" />
              <CurrentSessionCard session={current} t={t} />
            </div>
          </motion.section>
        )}

        {/* ── Other Sessions ── */}
        {others.length > 0 && (
          <motion.section variants={staggerItem} className="mt-8 px-5">
            <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider pl-2 mb-2.5">
              {t('other_devices')} ({others.length})
            </h2>
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
              <AnimatePresence mode="popLayout">
                {others.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {confirmId === s.id ? (
                      <ConfirmBar
                        label={t('revoke_confirm')}
                        loading={revokeMutation.isPending}
                        onConfirm={() => revokeMutation.mutate(s.id)}
                        onCancel={() => setConfirmId(null)}
                        t={t}
                      />
                    ) : (
                      <OtherSessionRow
                        session={s}
                        t={t}
                        showBorder={idx < others.length - 1 && confirmId !== others[idx + 1]?.id}
                        onRevoke={() => { haptic?.impactOccurred('medium'); setConfirmId(s.id); }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Revoke All */}
            <div className="mt-4">
              {confirmAll ? (
                <ConfirmBar
                  label={t('revoke_all_confirm')}
                  loading={revokeAllMutation.isPending}
                  onConfirm={() => revokeAllMutation.mutate()}
                  onCancel={() => setConfirmAll(false)}
                  t={t}
                  standalone
                />
              ) : (
                <motion.button
                  whileTap={MOTION.tap}
                  onClick={() => { haptic?.impactOccurred('heavy'); setConfirmAll(true); }}
                  className="w-full py-3.5 rounded-[16px] bg-red-500/8 border border-red-500/15 text-red-400 text-[13px] font-bold flex items-center justify-center gap-2 active:bg-red-500/15 transition-colors"
                >
                  <Trash2 size={14} />
                  {t('revoke_all')}
                </motion.button>
              )}
            </div>
          </motion.section>
        )}

        {/* ── Empty State ── */}
        {!isLoading && others.length === 0 && current && (
          <motion.section variants={staggerItem} className="mt-8 px-5">
            <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 py-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield size={22} className="text-emerald-500" />
              </div>
              <p className="text-[13px] font-medium text-tg-hint/60">{t('no_other')}</p>
            </div>
          </motion.section>
        )}

        {/* ── Loading Skeleton ── */}
        {isLoading && (
          <div className="px-5 mt-4 space-y-3">
            <div className="h-[100px] rounded-[20px] bg-tg-secondary/60 animate-pulse" />
            <div className="h-[180px] rounded-[20px] bg-tg-secondary/60 animate-pulse" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Sub-components ── */

function CurrentSessionCard({ session, t }: { session: DeviceSession; t: (k: string, o?: any) => string }) {
  const Icon = getDeviceIcon(session);
  return (
    <div className="p-4 relative">
      <div className="flex items-center gap-3.5">
        <div className="w-[42px] h-[42px] rounded-[12px] bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-tg-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-tg-text truncate">
              {session.device || t('unknown_device')}
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-tg-accent/15 text-tg-accent flex-shrink-0">
              {t('current')}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-tg-hint/70">
            {session.platform && (
              <span className="flex items-center gap-1">
                <Globe size={11} className="text-tg-hint/50" />
                {session.platform}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Wifi size={11} className="text-emerald-500" />
              {t('active_now')}
            </span>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 pt-3 border-t border-tg-border/15 flex items-center gap-4 text-[11px] text-tg-hint/50">
        {session.ip && (
          <span className="flex items-center gap-1">
            <Shield size={10} />
            {maskIp(session.ip)}
          </span>
        )}
        {session.location && (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {session.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {new Date(session.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function OtherSessionRow({ session, t, showBorder, onRevoke }: {
  session: DeviceSession; t: (k: string, o?: any) => string; showBorder: boolean; onRevoke: () => void;
}) {
  const Icon = getDeviceIcon(session);
  return (
    <div className={`flex items-center gap-3.5 p-4 ${showBorder ? 'border-b border-tg-border/15' : ''}`}>
      <div className="w-[38px] h-[38px] rounded-[10px] bg-tg-hint/8 border border-tg-border/20 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-tg-hint/60" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-semibold text-tg-text truncate block">
          {session.device || t('unknown_device')}
        </span>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-tg-hint/50">
          {session.location && (
            <span className="flex items-center gap-0.5">
              <MapPin size={9} />
              {session.location}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock size={9} />
            {timeAgo(session.lastUsed, t)}
          </span>
        </div>
      </div>
      <motion.button
        whileTap={MOTION.tap}
        onClick={onRevoke}
        className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-red-500/8 border border-red-500/15 active:bg-red-500/20 transition-colors flex-shrink-0"
      >
        <Trash2 size={14} className="text-red-400" />
      </motion.button>
    </div>
  );
}

function ConfirmBar({ label, loading, onConfirm, onCancel, t, standalone }: {
  label: string; loading: boolean; onConfirm: () => void; onCancel: () => void;
  t: (k: string, o?: any) => string; standalone?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3.5 ${
      standalone ? 'bg-red-500/5 border border-red-500/15 rounded-[16px]' : 'bg-red-500/5'
    }`}>
      <span className="flex-1 text-[13px] font-medium text-red-400 leading-tight">{label}</span>
      <motion.button
        whileTap={MOTION.tap}
        onClick={onCancel}
        disabled={loading}
        className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-tg-secondary border border-tg-border/30 flex-shrink-0"
      >
        <X size={14} className="text-tg-hint" />
      </motion.button>
      <motion.button
        whileTap={MOTION.tap}
        onClick={onConfirm}
        disabled={loading}
        className="px-4 py-1.5 rounded-[10px] text-[12px] font-bold text-white bg-red-500 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Check size={12} />
        )}
        {t('confirm')}
      </motion.button>
    </div>
  );
}
