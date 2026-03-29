import { memo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import { GitBranch, Tag, Clock, Plus, Bug, Sparkles, Trash2, ChevronDown, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadChangelog, hasChangelog } from '../../../utils/changelogLoader';
import type { ParsedChangelog, ChangelogVersion, ChangeType } from '../../../utils/parseChangelog';
import CommandChangelogModal from './CommandChangelogModal';

/* ── Section styling by type ── */
export const SECTION_META: Record<ChangeType, { icon: typeof Plus; color: string; labelKey: string }> = {
  added: { icon: Plus, color: '#10b981', labelKey: 'changelog_added' },
  fixed: { icon: Bug, color: '#ef4444', labelKey: 'changelog_fixed' },
  improved: { icon: Sparkles, color: '#3b82f6', labelKey: 'changelog_improved' },
  removed: { icon: Trash2, color: '#f59e0b', labelKey: 'changelog_removed' },
};

/* ── Compact version card ── */
export function VersionCard({ v, defaultOpen }: { v: ChangelogVersion; defaultOpen?: boolean }) {
  const { t } = useTranslation('commandDetail');
  const [open, setOpen] = useState(false);

  const totalItems = v.sections.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <div className="border-b border-tg-border/20 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors active:bg-tg-text/[0.03]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[10px] h-[10px] rounded-full bg-tg-accent border-2 border-tg-accent/30 flex-shrink-0 shadow-sm shadow-tg-accent/20" />
          <div className="flex items-center gap-1.5 bg-tg-accent/10 border border-tg-accent/20 px-2 py-0.5 rounded-[8px]">
            <Tag size={11} className="text-tg-accent" />
            <span className="text-[12px] font-bold text-tg-accent font-mono">v{v.version}</span>
          </div>
          <span className="text-[10px] text-tg-hint/70 font-medium">{totalItems} {t('changelog_changes', 'changes')}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-tg-hint/80 bg-tg-bg/40 px-2 py-0.5 rounded-[6px] border border-tg-border/30">
            <Clock size={10} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{moment(v.date).fromNow()}</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-tg-hint/50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {v.sections.map((sec) => {
                const meta = SECTION_META[sec.type];
                return (
                  <div key={sec.type}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <meta.icon size={12} style={{ color: meta.color }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                        {t(meta.labelKey)}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-4">
                      {sec.items.map((item, j) => (
                        <li key={j} className="text-[13px] text-tg-text/90 flex items-start gap-2 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 opacity-60" style={{ background: meta.color }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main export ── */
interface Props {
  slug: string;
}

function CommandChangelogEnhanced({ slug }: Props) {
  const { t } = useTranslation('commandDetail');
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ParsedChangelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  useEffect(() => {
    if (!slug || !hasChangelog(slug)) { setLoading(false); return; }
    setLoading(true);
    loadChangelog(slug).then(d => { setData(d); setLoading(false); });
  }, [slug]);

  if (loading || !data || !data.versions.length) return null;

  const previewVersions = data.versions.slice(0, 2);
  const hasMore = data.versions.length > 2;
  const latestDate = data.versions[0]?.date;
  const updateCount = data.versions.filter(v => {
    const d = new Date(v.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <section className="px-5 mt-8">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider flex items-center gap-1.5 pl-1">
          <GitBranch size={15} className="text-tg-accent" />
          {t('changelog')}
        </h2>
        {updateCount > 0 && (
          <span className="text-[10px] font-bold text-tg-accent bg-tg-accent/10 border border-tg-accent/20 px-2 py-0.5 rounded-full">
            {updateCount}x {t('changelog_this_month', 'this month')}
          </span>
        )}
      </div>

      <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 overflow-hidden shadow-sm">
        <div className="relative">
          {previewVersions.map((v, i) => (
            <VersionCard key={v.version} v={v} defaultOpen={i === 0} />
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => {
              navigate("#changelog");
              setIsChangelogModalOpen(true);
            }} // <-- Cambiado
            className="w-full px-4 py-3 flex items-center justify-center gap-2 text-tg-accent text-[13px] font-semibold border-t border-tg-border/20 transition-colors active:bg-tg-accent/5"
          >
            <FileText size={14} />
            {t('changelog_view_all', 'View full changelog')} ({data.versions.length})
          </button>
        )}
      </div>

      {latestDate && (
        <p className="text-[10px] text-tg-hint/60 mt-2 pl-1">
          {t('changelog_last_update', 'Last update')}: {latestDate}
        </p>
      )}
      {isChangelogModalOpen && (
        <CommandChangelogModal
          isOpen={isChangelogModalOpen}
          slug={slug}
        />
      )}
    </section>
  );
}

export default memo(CommandChangelogEnhanced);
