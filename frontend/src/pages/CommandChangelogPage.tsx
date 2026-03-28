import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, ArrowLeft, Calendar, Layers } from 'lucide-react';
import { findCommand, cmdSlug } from '../data/botCommands';
import { loadChangelog, hasChangelog } from '../utils/changelogLoader';
import type { ParsedChangelog } from '../utils/parseChangelog';
import { VersionCard, SECTION_META } from '../components/commands/detail/CommandChangelogEnhanced';

export default function CommandChangelogPage() {
  const { command: slug, userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('commandDetail');

  const cmd = slug ? findCommand(slug) : null;
  const mainSlug = cmd ? cmdSlug(cmd) : slug ?? '';

  const [data, setData] = useState<ParsedChangelog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mainSlug || !hasChangelog(mainSlug)) { setLoading(false); return; }
    setLoading(true);
    loadChangelog(mainSlug).then(d => { setData(d); setLoading(false); });
  }, [mainSlug]);

  const totalVersions = data?.versions.length ?? 0;
  const months = data ? new Set(data.versions.map(v => v.date.slice(0, 7))).size : 0;
  const totalChanges = data?.versions.reduce((sum, v) => sum + v.sections.reduce((s, sec) => s + sec.items.length, 0), 0) ?? 0;
  const latestDate = data?.versions[0]?.date;

  return (
    <div className="pb-8">
      {/* ── Sticky header ── */}
      <div
        className="sticky z-30 bg-tg-bg/95 backdrop-blur-xl border-b border-tg-border/40"
        style={{ top: 'var(--tg-top-offset, 0px)' }}
      >
        <div className="absolute left-0 right-0 bottom-full h-[150px] bg-tg-bg pointer-events-none" />
        <div className="px-5 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-tg-secondary border border-tg-border/30 text-tg-hint transition-colors active:bg-tg-text/[0.06]"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
              <GitBranch size={14} className="text-tg-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-tg-text truncate leading-tight">
                {t('changelog')}
              </h1>
              <p className="text-[11px] text-tg-hint/70 truncate leading-tight">
                /{mainSlug}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats banner ── */}
      {data && data.versions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-5 mt-4 flex gap-2"
        >
          <div className="flex-1 bg-tg-secondary/60 border border-tg-border/30 rounded-[14px] p-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-tg-accent/10 flex items-center justify-center">
              <Layers size={14} className="text-tg-accent" />
            </div>
            <div>
              <p className="text-[16px] font-extrabold text-tg-text leading-none">{totalVersions}</p>
              <p className="text-[10px] text-tg-hint/70 font-medium mt-0.5">{t('changelog_versions', 'versions')}</p>
            </div>
          </div>
          <div className="flex-1 bg-tg-secondary/60 border border-tg-border/30 rounded-[14px] p-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-emerald-500/10 flex items-center justify-center">
              <GitBranch size={14} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[16px] font-extrabold text-tg-text leading-none">{totalChanges}</p>
              <p className="text-[10px] text-tg-hint/70 font-medium mt-0.5">{t('changelog_changes', 'changes')}</p>
            </div>
          </div>
          {latestDate && (
            <div className="flex-1 bg-tg-secondary/60 border border-tg-border/30 rounded-[14px] p-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-violet-500/10 flex items-center justify-center">
                <Calendar size={14} className="text-violet-500" />
              </div>
              <div>
                <p className="text-[12px] font-extrabold text-tg-text leading-tight">{latestDate}</p>
                <p className="text-[10px] text-tg-hint/70 font-medium mt-0.5">{t('changelog_last_update', 'latest')}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="px-5 mt-5 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[16px] bg-tg-secondary/50 animate-pulse" style={{ height: `${80 - i * 8}px` }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && (!data || !data.versions.length) && (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center">
          <div className="w-[56px] h-[56px] rounded-[16px] bg-tg-hint/10 flex items-center justify-center mb-4 shadow-inner">
            <GitBranch size={28} className="text-tg-hint/40" />
          </div>
          <p className="text-[18px] font-bold text-tg-text mb-1">No changelog</p>
          <p className="text-[13px] text-tg-hint max-w-[220px] mx-auto">
            No changelog entries available for this command.
          </p>
        </div>
      )}

      {/* ── Timeline ── */}
      {data && data.versions.length > 0 && (
        <div className="mx-5 mt-4 relative">
          {/* Timeline spine */}
          <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-tg-accent/30 via-tg-border/20 to-transparent pointer-events-none" />

          <div className="space-y-3">
            {data.versions.map((v, i) => (
              <motion.div
                key={v.version}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div className={`absolute left-[13px] top-[18px] w-[11px] h-[11px] rounded-full border-2 ${i === 0 ? 'bg-tg-accent border-tg-accent/30 shadow-sm shadow-tg-accent/30' : 'bg-tg-secondary border-tg-border/50'}`} />

                <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[16px] border border-tg-border/30 overflow-hidden shadow-sm">
                  <VersionCard v={v} defaultOpen={false} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
