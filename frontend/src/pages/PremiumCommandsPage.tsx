import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Trash2, Search, Zap, Loader2, Shield, Crown, Gauge, Terminal, Sparkles } from 'lucide-react';
import { useConfigStore } from '../stores/config';
import { useToastStore } from '../stores';
import { useTelegram } from '../hooks/useTelegram';
import Select from '@/components/Select';
import { useHideIsland } from '@/hooks/useHideIsland';
import { BOT_COMMANDS } from '@/data/botCommands';
import { fetchSubscription, type ProFeatures } from '@/services/subscriptionApi';
import { useNoSafeProps } from '@/hooks/useNoSafeProps';
import { MOTION, staggerContainer, staggerItem } from '../design';
import StickyHeader from '@/components/StickyHeader';

const ALLOWED_ALIAS = BOT_COMMANDS.map((cmd) => cmd.uniqueName).filter(Boolean) as string[];

export default function PremiumCommandsPage() {
  const { userId } = useParams();
  const { haptic } = useTelegram();
  const { t } = useTranslation('subscription');
  const showToast = useToastStore((s) => s.show);
  const { config, loading, load, savePremiumCommand, removePremiumCommand } = useConfigStore();
  useHideIsland();
  useNoSafeProps();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [proFeatures, setProFeatures] = useState<ProFeatures | null>(null);

  useEffect(() => {
    if (!config) load();
    fetchSubscription().then((res) => {
      if (res.ok) setProFeatures(res.pro_features);
    }).catch(() => { });
  }, [config, load]);

  const premiumCmds = config?.premium_commands ?? {};
  const entries = Object.entries(premiumCmds).filter(([k]) =>
    !search || k.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    const key = newKey.trim().replace(/^\//, '').replace(/\s+/g, '_').toLowerCase();
    const alias = newAlias.trim();
    if (!key || !alias) return;
    try {
      await savePremiumCommand(key, alias);
      showToast(t('premium_created'), 'success');
      setNewKey('');
      setNewAlias('');
      setShowAdd(false);
      haptic?.notificationOccurred('success');
    } catch (error: any) {
      showToast(error.message || t('common:create_error'), 'error');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await removePremiumCommand(key);
      showToast(t('common:deleted'), 'success');
      haptic?.notificationOccurred('warning');
    } catch (error: any) {
      showToast(error.message || t('common:delete_error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-tg-hint animate-spin" />
      </div>
    );
  }

  const usedCommands = proFeatures?.custom_commands.used_commands ?? 0;
  const maxCommands = proFeatures?.custom_commands.max_commands ?? 0;
  const pct = maxCommands > 0 ? Math.min((usedCommands / maxCommands) * 100, 100) : 0;

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-20 relative max-w-[480px] mx-auto"
    >
      <StickyHeader title={t('premium_commands')} subtitle={t('premium_desc')} />

      {/* ── Capacity + Plan Strip ── */}
      {proFeatures && (
        <motion.div variants={staggerItem} className="px-5 mt-4">
          <div className="bg-tg-secondary/70 backdrop-blur-xl rounded-[20px] border border-tg-border/30 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-tg-accent/10 flex items-center justify-center">
                  <Terminal size={15} className="text-tg-accent" />
                </div>
                <span className="text-[13px] font-semibold text-tg-text">{t('custom_commands_label', { defaultValue: 'Custom Commands' })}</span>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                proFeatures.subscription.tier === 'ultra' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                proFeatures.subscription.tier === 'pro' ? 'bg-tg-accent/15 text-tg-accent' :
                'bg-tg-hint/10 text-tg-hint'
              }`}>
                {proFeatures.subscription.tier !== 'free' && <Shield size={10} className="inline mr-1 -mt-px" />}
                {proFeatures.subscription.tier}
              </div>
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-[24px] font-extrabold text-tg-text leading-none">
                {usedCommands}<span className="text-[14px] font-semibold text-tg-hint">/{maxCommands}</span>
              </span>
              <span className="text-[11px] font-medium text-tg-hint flex items-center gap-1">
                <Gauge size={11} /> {proFeatures.performance.queue_priority} priority
              </span>
            </div>
            <div className="h-[5px] rounded-full bg-tg-border/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-tg-accent'}`}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Search ── */}
      <motion.div variants={staggerItem} className="px-5 mt-4">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-tg-secondary/60 border border-tg-border/30 rounded-[14px] focus-within:border-tg-accent/40 transition-colors">
          <Search className="w-4 h-4 text-tg-hint/60 shrink-0" />
          <input
            type="search"
            className="flex-1 bg-transparent text-[14px] text-tg-text placeholder:text-tg-hint/50 outline-none"
            placeholder={t('search_premium')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </motion.div>

      {/* ── Add Command ── */}
      <motion.div variants={staggerItem} className="px-5 mt-4">
        <button
          className="w-full flex items-center gap-3 p-3.5 rounded-[16px] bg-tg-accent/8 border border-tg-accent/20 text-left active:scale-[0.98] transition-all"
          onClick={() => { setShowAdd(!showAdd); haptic?.impactOccurred('light'); }}
        >
          <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center transition-colors ${
            showAdd ? 'bg-tg-accent text-white' : 'bg-tg-accent/15 text-tg-accent'
          }`}>
            <Plus className={`w-5 h-5 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
          </div>
          <span className="text-[14px] font-semibold text-tg-accent">{t('common:add_command', { defaultValue: 'Add command' })}</span>
        </button>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-tg-hint/70 uppercase pl-1">{t('trigger')}</label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-tg-secondary/60 rounded-[12px] border border-tg-border/30 focus-within:border-tg-accent/40 transition-colors">
                    <span className="text-tg-hint/50 font-mono font-bold text-[15px]">/</span>
                    <input
                      className="w-full bg-transparent text-[14px] text-tg-text outline-none font-mono placeholder:text-tg-hint/40 placeholder:font-sans"
                      placeholder={t('trigger_placeholder')}
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-tg-hint/70 uppercase pl-1">{t('alias')}</label>
                  <Select
                    options={ALLOWED_ALIAS.map((alias) => ({ label: alias, value: alias }))}
                    onChange={(value) => setNewAlias(value)}
                    value={newAlias}
                    searchable={true}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2.5 rounded-[12px] text-[13px] font-bold bg-tg-secondary/60 text-tg-text active:scale-95 transition-all"
                    onClick={() => setShowAdd(false)}
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-[12px] text-[13px] font-bold bg-tg-accent text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    onClick={handleAdd}
                    disabled={!newKey.trim() || !newAlias.trim()}
                  >
                    <Zap size={14} className="fill-white/20" /> {t('common:save')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Commands List ── */}
      <motion.div variants={staggerItem} className="px-5 mt-5">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">
          {t('management', { count: entries.length })}
        </h2>

        {entries.length === 0 && !showAdd ? (
          <div className="py-12 text-center rounded-[20px] bg-tg-secondary/40 border border-tg-border/20">
            <Sparkles size={32} className="text-tg-hint/25 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-tg-text">{t('no_premium_configured')}</p>
            <p className="text-[12px] text-tg-hint mt-1">{t('tap_add_premium')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(([key, cmd], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="flex items-center justify-between p-3.5 rounded-[16px] bg-tg-secondary/60 border border-tg-border/20 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[12px] bg-tg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Terminal size={16} className="text-tg-accent" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[14px] font-bold text-tg-text font-mono block truncate">/{key}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-medium text-tg-hint bg-tg-bg/50 px-1.5 py-0.5 rounded-md truncate">
                        {cmd.alias}
                      </span>
                      {cmd.created_at && (
                        <span className="text-[10px] text-tg-hint/60">
                          {new Date(cmd.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-tg-hint/40 hover:bg-red-500/10 hover:text-red-400 active:scale-90 transition-all flex-shrink-0"
                  onClick={() => handleDelete(key)}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Footer ── */}
      <motion.p variants={staggerItem} className="text-[12px] text-tg-hint/60 text-center mt-6 px-8 leading-relaxed">
        {t('premium_only_desc')}
      </motion.p>
    </motion.main>
  );
}