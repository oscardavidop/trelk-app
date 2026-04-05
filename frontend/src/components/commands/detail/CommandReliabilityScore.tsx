import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, ShieldCheck, ShieldAlert, Clock, CheckCircle2,
    XCircle, Activity, ChevronDown, ChevronUp, Zap,
    Scooter,
    GitGraph,
} from 'lucide-react';
import {
    fetchReliabilityScore,
    fetchReliabilityTimeline,
    type ReliabilityScore,
    type TimelinePoint,
} from '../../../services/commandReliabilityApi';

interface Props {
    slug: string;
}

// ── Mini Sparkline ──────────────────────────────
function Sparkline({ points, height = 32, width = '100%' }: { points: TimelinePoint[]; height?: number; width?: string }) {
    if (points.length < 2) return null;

    const maxVal = Math.max(...points.map((p) => p.success + p.failure), 1);
    const w = 200;
    const h = height;
    const padY = 2;

    const successPath = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - padY - ((p.success / maxVal) * (h - padY * 2));
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    const failurePath = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - padY - ((p.failure / maxVal) * (h - padY * 2));
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    // Area fill for success
    const areaPath = `${successPath} L${w},${h} L0,${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width, height }} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(34,197,94)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(34,197,94)" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sparkGrad)" />
            <path d={successPath} fill="none" stroke="rgb(34,197,94)" strokeWidth="1.5" strokeLinejoin="round" />
            {points.some((p) => p.failure > 0) && (
                <path d={failurePath} fill="none" stroke="rgb(239,68,68)" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3,2" />
            )}
        </svg>
    );
}

// ── Reliability Ring ────────────────────────────
function ReliabilityRing({ value, size = 52 }: { value: number; size?: number }) {
    const r = (size - 6) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (value / 100) * c;

    const color = value >= 99 ? 'rgb(34,197,94)' : value >= 95 ? 'rgb(234,179,8)' : value >= 80 ? 'rgb(249,115,22)' : 'rgb(239,68,68)';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-tg-border/20" />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={c}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-black text-tg-text leading-none">{Math.round(value)}%</span>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────
function CommandReliabilityScore({ slug }: Props) {
    const { t } = useTranslation('commandDetail');
    const [expanded, setExpanded] = useState(false);
    const [period, setPeriod] = useState<'1h' | '24h' | '7d'>('24h');

    const { data: score } = useQuery({
        queryKey: ['cmd-reliability', slug, period],
        queryFn: () => fetchReliabilityScore(slug, period),
        enabled: !!slug,
        staleTime: 60_000,
        retry: 1,
    });

    const { data: timeline } = useQuery({
        queryKey: ['cmd-reliability-timeline', slug],
        queryFn: () => fetchReliabilityTimeline(slug, 24, 24),
        enabled: !!slug && expanded,
        staleTime: 30_000,
        retry: 1,
    });

    if (!score || score.totalExecutions === 0) return null;

    const ShieldIcon = score.reliability >= 99 ? ShieldCheck : score.reliability >= 90 ? Shield : ShieldAlert;
    const statusColor = score.reliability >= 99 ? 'text-emerald-500' : score.reliability >= 95 ? 'text-yellow-500' : score.reliability >= 80 ? 'text-orange-500' : 'text-red-500';
    const statusLabel = score.reliability >= 99
        ? t('reliability_excellent', 'Excellent')
        : score.reliability >= 95
            ? t('reliability_good', 'Good')
            : score.reliability >= 80
                ? t('reliability_fair', 'Fair')
                : t('reliability_poor', 'Poor');

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-5 mt-4"
        >
            <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5 py-2">
                <GitGraph size={14} className="text-tg-hint/60" />
                Reliability and Signals
            </h2>
            <div className="bg-tg-secondary border border-tg-border/30 rounded-[18px] overflow-hidden shadow-sm">
                {/* ── Header Row ── */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-tg-hint/5 transition-colors"
                >
                    <ReliabilityRing value={score.reliability} size={48} />

                    <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                            <ShieldIcon size={14} className={statusColor} />
                            <span className="text-[13px] font-bold text-tg-text">
                                {t('reliability_score', 'Reliability Score')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[11px] font-bold ${statusColor}`}>{statusLabel}</span>
                            <span className="text-[10px] text-tg-hint">•</span>
                            <span className="text-[11px] text-tg-hint font-medium">
                                {score.totalExecutions} {t('executions', 'executions')}
                            </span>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center">
                            <div className="flex items-center gap-0.5">
                                <Clock size={10} className="text-tg-hint" />
                                <span className="text-[12px] font-bold text-tg-text">{score.avgResponseTimeMs}ms</span>
                            </div>
                            <span className="text-[9px] text-tg-hint font-medium uppercase tracking-wider">{t('avg', 'avg')}</span>
                        </div>
                        {expanded ? <ChevronUp size={16} className="text-tg-hint" /> : <ChevronDown size={16} className="text-tg-hint" />}
                    </div>
                </button>

                {/* ── Expanded Details ── */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 space-y-3 border-t border-tg-border/20">
                                {/* Period Selector */}
                                <div className="flex gap-1.5 pt-3">
                                    {(['1h', '24h', '7d'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${period === p
                                                ? 'bg-tg-accent text-white'
                                                : 'bg-tg-bg text-tg-hint border border-tg-border/30'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-tg-bg rounded-[12px] p-2.5 border border-tg-border/20">
                                        <div className="flex items-center gap-1 mb-1">
                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                            <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('success', 'Success')}</span>
                                        </div>
                                        <span className="text-[18px] font-black text-emerald-500 leading-none">{score.successCount}</span>
                                    </div>

                                    <div className="bg-tg-bg rounded-[12px] p-2.5 border border-tg-border/20">
                                        <div className="flex items-center gap-1 mb-1">
                                            <XCircle size={12} className="text-red-500" />
                                            <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">{t('failures', 'Failures')}</span>
                                        </div>
                                        <span className="text-[18px] font-black text-red-500 leading-none">{score.failureCount}</span>
                                    </div>

                                    <div className="bg-tg-bg rounded-[12px] p-2.5 border border-tg-border/20">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Zap size={12} className="text-tg-accent" />
                                            <span className="text-[10px] font-bold text-tg-hint uppercase tracking-wider">P95</span>
                                        </div>
                                        <span className="text-[18px] font-black text-tg-text leading-none">{score.p95ResponseTimeMs}<span className="text-[10px] font-bold text-tg-hint">ms</span></span>
                                    </div>
                                </div>

                                {/* Timeline Graph */}
                                {timeline && timeline.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Activity size={12} className="text-tg-accent" />
                                            <span className="text-[11px] font-bold text-tg-hint uppercase tracking-wider">
                                                {t('last_24h', 'Last 24h')}
                                            </span>
                                        </div>
                                        <div className="bg-tg-bg rounded-[12px] border border-tg-border/20 p-3">
                                            <Sparkline points={timeline} height={40} />
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-[9px] text-tg-hint font-medium">24h ago</span>
                                                <div className="flex gap-3">
                                                    <span className="flex items-center gap-1 text-[9px] text-tg-hint font-medium">
                                                        <span className="w-2 h-[2px] bg-emerald-500 rounded-full inline-block" /> {t('success', 'Success')}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[9px] text-tg-hint font-medium">
                                                        <span className="w-2 h-[2px] bg-red-500 rounded-full inline-block" style={{ opacity: 0.8 }} /> {t('failures', 'Failures')}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-tg-hint font-medium">{t('now', 'now')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default memo(CommandReliabilityScore);
