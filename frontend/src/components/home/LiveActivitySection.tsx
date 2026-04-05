import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchLiveMetrics } from '../../services/liveApi';

// ── Animated number (count-up) ───────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;

    const duration = 600;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(Math.round(from + (to - from) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

// ── Skeleton ─────────────────────────────────────
function LiveSkeleton() {
  return (
    <div className="mx-4">
      <div className="rounded-[20px] bg-tg-secondary border border-tg-border/15 overflow-hidden animate-pulse">
        <div className="px-4 pt-4 pb-3">
          <div className="h-3 w-16 rounded bg-tg-bg mb-4" />
          <div className="flex gap-3">
            <div className="flex-1 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-tg-bg" />
              <div>
                <div className="h-6 w-10 rounded bg-tg-bg" />
                <div className="h-2.5 w-20 rounded bg-tg-bg mt-1.5" />
              </div>
            </div>
            <div className="w-px bg-tg-border/15" />
            <div className="flex-1 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-tg-bg" />
              <div>
                <div className="h-6 w-8 rounded bg-tg-bg" />
                <div className="h-2.5 w-24 rounded bg-tg-bg mt-1.5" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-tg-bg/50 px-4 py-3 border-t border-tg-border/10">
          <div className="h-2.5 w-20 rounded bg-tg-border/20 mb-2" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-20 rounded-[10px] bg-tg-border/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────
function LiveActivitySection() {
  const { t } = useTranslation('home');

  const { data, isLoading } = useQuery({
    queryKey: ['live-metrics'],
    queryFn: fetchLiveMetrics,
    staleTime: 10_000,
    refetchInterval: 15_000,
    placeholderData: (prev) => prev, // keep previous data while refetching
  });

  if (isLoading && !data) return <LiveSkeleton />;
  if (!data) return null;

  const { activeUsers, commandsPerMinute, trending } = data;

  // Hide section if completely empty (no Redis, no Mongo data)
  if (activeUsers === 0 && commandsPerMinute === 0 && trending.length === 0) {
    return null;
  }

  return (
    <div className="mx-4">
      <div className="rounded-[20px] bg-tg-secondary border border-tg-border/15 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-[7px] w-[7px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-bold text-tg-hint uppercase tracking-[0.08em]">
              {t('live_now')}
            </span>
          </div>

          {/* Stats — two columns with animated big numbers */}
          <div className="flex gap-3">
            <div className="flex-1 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-tg-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users size={15} className="text-tg-hint" />
              </div>
              <div>
                <div className="text-[22px] font-black text-tg-text leading-none tracking-tight tabular-nums">
                  <AnimatedNumber value={activeUsers} />
                </div>
                <div className="text-[11px] text-tg-hint font-medium mt-0.5 leading-tight">
                  {t('live_users_label')}
                </div>
              </div>
            </div>
            <div className="w-px bg-tg-border/15 self-stretch my-1" />
            <div className="flex-1 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-tg-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={15} className="text-tg-hint" />
              </div>
              <div>
                <div className="text-[22px] font-black text-tg-text leading-none tracking-tight tabular-nums">
                  <AnimatedNumber value={commandsPerMinute} />
                </div>
                <div className="text-[11px] text-tg-hint font-medium mt-0.5 leading-tight">
                  {t('live_cmds_label')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trending — separated surface */}
        {trending.length > 0 && (
          <div className="bg-tg-bg/50 px-4 py-3 border-t border-tg-border/10">
            <span className="text-[11px] font-bold text-tg-hint uppercase tracking-[0.08em]">
              {t('trending_now')}
            </span>
            <div className="mt-2 flex gap-2">
              {trending.map((item, i) => {
                const isUp = item.growth > 0;
                const isDown = item.growth < 0;
                const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                const color = isUp
                  ? 'text-emerald-500'
                  : isDown
                    ? 'text-red-400'
                    : 'text-tg-hint';

                return (
                  <motion.span
                    key={item.slug}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] bg-tg-secondary border border-tg-border/15 text-[12px]"
                  >
                    <span className="font-bold text-tg-text tracking-tight">
                      /{item.slug}
                    </span>
                    <Icon size={11} className={color} />
                    <span className={`font-semibold tabular-nums ${color}`}>
                      {isUp ? '+' : ''}
                      {item.growth}%
                    </span>
                  </motion.span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(LiveActivitySection);
