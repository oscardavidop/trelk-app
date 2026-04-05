import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ChevronRight, X, Package, Link, Video, Settings2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StickyHeader from '../../components/StickyHeader';
import { useTelegram } from '../../hooks/useTelegram';
import { commandConfigSchema } from '../../config/commandConfigSchema';
import { fetchUserCommandConfig } from '../../services/commandConfigApi';
import { staggerContainer, staggerItem, MOTION } from '../../design';

const USER_COMMAND_CONFIG_QUERY_KEY = ['user-command-config'];

const ICON_MAP: Record<string, LucideIcon> = {
  package: Package,
  link: Link,
  video: Video,
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
};

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export default function CommandsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { t } = useTranslation('commands');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: USER_COMMAND_CONFIG_QUERY_KEY,
    queryFn: fetchUserCommandConfig,
    staleTime: 5 * 60 * 1000,
  });

  const entries = useMemo(() => Object.entries(commandConfigSchema), []);

  const filtered = entries.filter(([key, schema]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return key.includes(q) || t(schema.titleKey).toLowerCase().includes(q);
  });

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-24 relative max-w-[480px] mx-auto"
    >
      <StickyHeader
        title={t('command_settings_title')}
        subtitle={t('command_settings_subtitle')}
      />

      {/* Search */}
      <motion.div variants={staggerItem} className="px-5 mt-4">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-tg-secondary/60 backdrop-blur-xl border border-tg-border/30 rounded-[16px] focus-within:border-tg-accent/40 focus-within:bg-tg-secondary/80 transition-all">
          <Search size={18} className="text-tg-hint/60 shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[15px] text-tg-text placeholder:text-tg-hint/50 outline-none w-full"
            placeholder={t('search_command_settings')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => { setSearch(''); haptic?.impactOccurred('light'); }}
              className="w-6 h-6 rounded-full bg-tg-text/[0.08] flex items-center justify-center text-tg-text hover:bg-tg-text/[0.15] active:scale-90 transition-all shrink-0"
            >
              <X size={14} strokeWidth={3} />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Command cards */}
      <motion.section variants={staggerItem} className="px-5 mt-6 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="rounded-[20px] bg-tg-secondary/60 border border-tg-border/30 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-[14px] bg-tg-text/[0.05]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-tg-text/[0.05] rounded" />
                  <div className="h-3 w-40 bg-tg-text/[0.04] rounded" />
                </div>
              </div>
              <div className="ml-[56px] h-5 w-32 bg-tg-text/[0.03] rounded-[6px]" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary/60 border border-tg-border/20 flex items-center justify-center mb-4 shadow-inner">
              <Settings2 size={28} className="text-tg-hint/30" />
            </div>
            <p className="text-[16px] font-extrabold text-tg-text tracking-tight">
              {search ? t('no_search_results') : t('no_configurable_commands')}
            </p>
            {search && (
              <p className="text-[13px] font-medium text-tg-hint/70 mt-1.5">
                {t('try_other_search')}
              </p>
            )}
          </div>
        ) : (
          filtered.map(([commandKey, schema], i) => {
            const Icon = ICON_MAP[schema.icon] ?? Settings2;
            const colors = COLOR_MAP[schema.color] ?? COLOR_MAP.emerald;
            const commandConfig = (data?.commands?.[commandKey] ?? {}) as Record<string, unknown>;

            const allFields = schema.groups.flatMap((g) => g.fields);
            const summary = allFields
              .map((field) => {
                const val = getByPath(commandConfig, field.key);
                if (val === undefined || val === null || val === '') return null;
                return `${t(field.labelKey)}: ${typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val)}`;
              })
              .filter(Boolean)
              .slice(0, 2)
              .join(' · ');

            return (
              <motion.button
                key={commandKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25, ease: 'easeOut' }}
                whileTap={MOTION.tap}
                onClick={() => {
                  haptic?.impactOccurred('light');
                  navigate(`/users/ui/${userId}/commands/${commandKey}`);
                }}
                className="w-full text-left rounded-[20px] bg-tg-secondary/70 backdrop-blur-xl border border-tg-border/30 p-4 hover:bg-tg-secondary/90 active:bg-tg-secondary transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={`w-11 h-11 rounded-[14px] ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={22} className={colors.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-extrabold text-tg-text tracking-tight">
                        {t(schema.titleKey)}
                      </span>
                      <span className="text-[11px] font-bold font-mono text-tg-hint/50 bg-tg-text/[0.03] px-1.5 py-0.5 rounded-[5px]">
                        /{commandKey}
                      </span>
                    </div>
                    <p className="text-[13px] text-tg-hint/70 truncate mt-0.5">
                      {t(schema.descriptionKey)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-tg-hint/25 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>

                {summary && (
                  <div className="ml-[56px]">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] bg-tg-accent/8 text-tg-accent/80 border border-tg-accent/15 inline-block max-w-full truncate">
                      {summary}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </motion.section>
    </motion.main>
  );
}