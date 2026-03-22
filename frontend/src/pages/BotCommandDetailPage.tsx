import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore } from '../stores';
import { BOT_COMMANDS, findCommand, cmdSlug, CATEGORY_META } from '../data/botCommands';
import { getExamples, getChangelog, getComments } from '../data/commandMocks';
import { fetchCommandStats, fetchMyRating, submitRating, type CommandStatsData } from '../services/commandStatsApi';
import CommandStats from '../components/commands/CommandStats';
import CommandExamples from '../components/commands/CommandExamples';
import CommandChangelog from '../components/commands/CommandChangelog';
import CommandComments from '../components/commands/CommandComments';
import RelatedCommands from '../components/commands/RelatedCommands';
import ReportErrorModal from '../components/commands/ReportErrorModal';

import {
  Heart, Copy, Share, Send, AlertTriangle,
  Hash, MessageSquare, Lock, Settings2,
  Flag, ArrowLeft, ArrowRight, CheckCircle2,
  Star
} from 'lucide-react';
import { StickySectionHeader } from '@/components/StickyHeader';
import { useScrollHeader } from '@/hooks/useScrollCollapse';
import { useCommandFavoritesStore } from '../stores/commandFavorites';
import CommandFeedback from '@/components/commands/CommandFeedback';

/* ─── Mock screenshots for preview ─── */
const MOCK_SCREENSHOTS = [
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+1',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+2',
  'https://placehold.co/280x500/1a2026/7d8b97?text=Preview+3',
];

export default function BotCommandDetailPage() {
  const { command: slug, userId } = useParams();
  const navigate = useNavigate();
  const { haptic, webApp } = useTelegram();
  const { t } = useTranslation('commandDetail');
  const showToast = useToastStore((s) => s.show);

  const cmd = slug ? findCommand(slug) : undefined;
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [review, setReview] = useState('');
  const [stats, setStats] = useState<CommandStatsData | null>(null);
  const [reported, setReported] = useState(false);
  const { isFavorite, toggle: toggleFav, loaded: favLoaded, loadFavorites } = useCommandFavoritesStore();
  const mainSlug = cmd ? cmdSlug(cmd) : '';
  const isFav = favLoaded && isFavorite(mainSlug);
  const [copied, setCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const collapsed = useScrollHeader(110);

  // Load favorites set if not loaded
  useEffect(() => { if (!favLoaded) loadFavorites(); }, [favLoaded, loadFavorites]);

  // Load real stats + user's own rating
  useEffect(() => {
    if (!mainSlug) return;
    fetchCommandStats(mainSlug).then(setStats).catch(() => { });
    fetchMyRating(mainSlug).then((data) => {
      if (data.rating != null) {
        setRating(data.rating);
        setHasRated(true);
        if (data.review) setReview(data.review);
      }
    }).catch(() => { });
  }, [mainSlug]);

  /* ─── Navigation helpers ─── */
  const currentIdx = cmd ? BOT_COMMANDS.findIndex((c) => cmdSlug(c) === cmdSlug(cmd)) : -1;
  const prevCmd = currentIdx > 0 ? BOT_COMMANDS[currentIdx - 1] : undefined;
  const nextCmd = currentIdx < BOT_COMMANDS.length - 1 ? BOT_COMMANDS[currentIdx + 1] : undefined;

  const goTo = useCallback((s: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}/bot-commands/${s}`, { replace: true });
  }, [navigate, userId, haptic]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      haptic?.notificationOccurred('success');
      showToast(t('copied_clipboard'), 'success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      haptic?.notificationOccurred('error');
    }
  }, [haptic, showToast]);

  /* ─── Estado: No Encontrado ─── */
  if (!cmd) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 px-5 text-center animate-fade-in pb-28 max-w-[480px] mx-auto">
        <div className="w-[72px] h-[72px] rounded-[24px] bg-tg-secondary border border-tg-border/40 flex items-center justify-center mb-5 shadow-sm">
          <AlertTriangle size={32} className="text-tg-hint/50" />
        </div>
        <h1 className="text-[20px] font-bold text-tg-text mb-2">{t('command_not_found')}</h1>
        <p className="text-tg-hint text-[14px] leading-relaxed">{t('command_not_registered', { slug })}</p>
        <button
          onClick={() => navigate(`/users/ui/${userId}/bot-commands`, { replace: true })}
          className="mt-8 px-6 py-3.5 rounded-[16px] bg-tg-accent/10 text-tg-accent font-bold text-[15px] active:scale-95 transition-transform shadow-sm"
        >
          {t('back_to_directory')}
        </button>
      </div>
    );
  }

  const cat = CATEGORY_META[cmd.category] ?? { label: cmd.category, color: '#6b7280', icon: '📦' };
  
  return (
    <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto">

      <StickySectionHeader>
        <section
          className={`relative px-5 transition-all duration-300 ${
            collapsed ? 'pt-2 pb-2' : 'pt-4 pb-2'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={`flex items-center justify-center transition-all duration-300 shadow-sm flex-shrink-0 ${
                collapsed ? 'w-[42px] h-[42px] rounded-[12px] text-[20px]' : 'w-[72px] h-[72px] rounded-[20px] text-[32px]'
              }`}
              style={{
                backgroundColor: `${cat.color}15`,
                border: `1px solid ${cat.color}30`
              }}
            >
              {typeof cat.icon !== 'string'
                ? <cat.icon className={collapsed ? "w-5 h-5" : "w-8 h-8"} style={{ color: cat.color }} />
                : cat.icon}
            </div>

            {/* Text */}
            <div className="flex-1 pr-10 min-w-0">
              <h1
                className={`font-bold font-mono text-tg-text truncate transition-all duration-300 leading-tight ${
                  collapsed ? 'text-[18px]' : 'text-[24px]'
                }`}
              >
                /{mainSlug}
              </h1>

              {/* description */}
              <p
                className={`text-tg-hint font-medium transition-all duration-300 overflow-hidden text-[13px] mt-1 leading-snug ${
                  collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[60px] opacity-100'
                }`}
              >
                {cmd.description}
              </p>

              {/* badges */}
              <div
                className={`flex flex-wrap gap-2 transition-all duration-300 ${
                  collapsed ? 'max-h-0 opacity-0 mt-0 overflow-hidden' : 'max-h-[50px] opacity-100 mt-2.5'
                }`}
              >
                <span
                  className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm"
                  style={{
                    color: cat.color,
                    backgroundColor: `${cat.color}10`,
                    border: `1px solid ${cat.color}30`
                  }}
                >
                  {cat.label}
                </span>

                {cmd.supportsInline && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-sky-500 bg-sky-500/10 border border-sky-500/20 uppercase tracking-wider shadow-sm">
                    Inline
                  </span>
                )}

                {cmd.requireArgs && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-amber-500 bg-amber-500/10 border border-amber-500/20 uppercase tracking-wider shadow-sm">
                    Args*
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fav Button */}
          <button
            onClick={async () => {
              haptic?.impactOccurred('light');
              const added = await toggleFav(mainSlug);
              showToast(added ? t('added_to_favorites') : t('removed_from_favorites'), 'info');
            }}
            className={`absolute right-5 transition-all duration-300 flex items-center justify-center rounded-full bg-tg-secondary border border-tg-border/40 shadow-sm active:scale-90 ${
              collapsed ? 'top-2.5 w-[38px] h-[38px]' : 'top-6 w-[42px] h-[42px]'
            }`}
          >
            <Heart
              size={18}
              className={`transition-all ${
                isFav ? 'text-pink-500 fill-pink-500 scale-110' : 'text-tg-hint/60'
              }`}
            />
          </button>
        </section>
      </StickySectionHeader>

      {/* ── Stats Strip ── */}
      {stats && <div className="mt-4"><CommandStats stats={stats} /></div>}

      {/* ── Botón de Acción Rápida (Ejecutar) ── */}
      <section className="px-5 mt-6">
        <button
          onClick={() => {
            // window.open(`https://t.me/TrelkBot?start=${mainSlug}`, '_blank');
            webApp?.openTelegramLink(`https://t.me/TrelkBot?start=${mainSlug}`);
            haptic?.impactOccurred('medium');
          }}
          className="w-full py-3.5 rounded-[20px] bg-tg-accent text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-200 shadow-md"
        >
          <Send size={18} className="fill-white/20" />
          {t('run_in_telegram', 'Run in Telegram')}
        </button>
      </section>

      {/* ── Bloque de Uso (Usage) ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('command_usage', 'Usage')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4">
            <code className="text-[15px] font-mono font-bold text-tg-text truncate">{cmd.usage}</code>
            <button
              onClick={() => copyText(cmd.usage)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[12px] font-bold transition-all active:scale-95 flex-shrink-0 ml-3 ${
                copied ? 'bg-emerald-500/15 text-emerald-500' : 'bg-tg-hint/10 text-tg-text hover:bg-tg-hint/20'
              }`}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} className="text-tg-hint" />}
              {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Aliases ── */}
      {cmd.name.length > 1 && (
        <section className="px-5 mt-8">
          <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5 flex items-center gap-1.5">
            <Hash size={14} className="text-tg-hint/60" /> {t('allowed_aliases', 'Aliases')}
          </h2>

          <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-4 shadow-sm">
            <div className="flex flex-wrap gap-2.5">
              {cmd.name.map((alias) => (
                <button
                  key={alias}
                  onClick={() => copyText(`/${alias}`)}
                  title="Copiar alias"
                  className="px-3 py-1.5 rounded-[12px] bg-tg-hint/10 border border-tg-border/20 text-[14px] font-mono font-semibold text-tg-text active:scale-95 transition-transform shadow-sm"
                >
                  /{alias}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Parámetros (Ajustes Estilo iOS) ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('technical_details', 'Technical Details')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm">
          <div className="flex flex-col">

            {/* Row: Argumentos */}
            <div className="flex items-center gap-3.5 p-3.5 active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
              <div className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-sm ${cmd.requireArgs ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <Hash size={18} className={cmd.requireArgs ? 'text-amber-500' : 'text-emerald-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-tg-text leading-tight">
                  {cmd.requireArgs ? t('args_required', 'Arguments Required') : t('no_args', 'No Arguments')}
                </div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">
                  {cmd.requireArgs ? t('args_required_desc') : t('no_args_desc')}
                </div>
              </div>
            </div>

            {/* Row: Inline */}
            {cmd.supportsInline && (
              <div className="flex items-center gap-3.5 p-3.5 active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MessageSquare size={18} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('supports_inline', 'Supports Inline')}</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">{t('inline_desc', { slug: mainSlug })}</div>
                </div>
              </div>
            )}

            {/* Row: Solo Privado */}
            {cmd.supportInGroups === false && (
              <div className="flex items-center gap-3.5 p-3.5 active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Lock size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('private_only', 'Private Only')}</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">{t('private_only_desc')}</div>
                </div>
              </div>
            )}

            {/* Row: Max Length */}
            {cmd.maxLengthArgs != null && (
              <div className="flex items-center gap-3.5 p-3.5 active:bg-tg-hint/10 transition-colors border-b border-tg-border/20 last:border-0">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Settings2 size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-tg-text leading-tight">{t('char_limit', { count: cmd.maxLengthArgs, defaultValue: `${cmd.maxLengthArgs} Char Limit` })}</div>
                  <div className="text-[12px] font-medium text-tg-hint mt-0.5 leading-snug">{t('char_limit_desc')}</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className="px-5 mt-8">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-3">{t('preview', 'Preview')}</h2>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {
            cmd.photos && cmd.photos.length > 0 ? (
              cmd.photos.map((url, i) => (
                <img
                  key={i}
                  src={`https://cdn.trelk.site/assets/img/commands/md5/1.jpg`}
                  alt={`Screenshot ${i + 1}`}
                  className="w-[180px] h-[320px] rounded-[20px] object-cover border border-tg-border/40 shadow-sm flex-shrink-0"
                />
              ))
            ) : (
              MOCK_SCREENSHOTS.map((src, i) => (
                <div key={i} className="flex-shrink-0 w-[180px] h-[320px] rounded-[20px] overflow-hidden bg-tg-hint/5 border border-tg-border/40 shadow-sm">
                  <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover opacity-80" loading="lazy" />
                </div>
              ))
            )
          }
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="px-5 mt-4">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('how_it_works', 'How it works')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 p-5 shadow-sm">
          <div className="space-y-6">
            {[
              { step: '1', text: t('step_1', { cmd: cmd.usage.split(' ')[0], defaultValue: `Send ${cmd.usage.split(' ')[0]}` }) },
              { step: '2', text: t('step_2', 'Wait for processing') },
              { step: '3', text: t('step_3', 'Get your result') },
            ].map(({ step, text }, i, arr) => (
              <div key={step} className="flex items-start gap-4 relative">
                {/* Línea conectora adaptada al tema */}
                {i !== arr.length - 1 && <div className="absolute left-[13px] top-8 bottom-[-24px] w-[2px] bg-tg-border/50" />}

                <div className="w-[28px] h-[28px] rounded-[8px] bg-tg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5 z-10 shadow-sm">
                  <span className="text-[13px] font-bold text-tg-accent">{step}</span>
                </div>
                <p className="text-[14px] font-medium text-tg-text leading-relaxed pt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ejemplos de Uso, Changelog, Comentarios, etc. ── */}
      {getExamples(mainSlug).length > 0 && <CommandExamples examples={getExamples(mainSlug)} />}
      {getChangelog(mainSlug).length > 0 && <CommandChangelog entries={getChangelog(mainSlug)} />}
      {/* {getComments(mainSlug).length > 0 && <CommandComments comments={getComments(mainSlug)} />} */}

      {mainSlug && <RelatedCommands slug={mainSlug} />}

      {/* ── Calificar Comando ── */}
      <section className="px-5 mt-8 mb-8">
        <div className="bg-tg-secondary rounded-[24px] border border-tg-border/40 p-5 text-center shadow-sm relative overflow-hidden">
          
          {hasRated ? (
            /* ── Estado: Calificado (Éxito) ── */
            <div className="py-2 animate-fade-in relative z-10">
              <div className="w-[52px] h-[52px] mx-auto bg-amber-500/10 rounded-[16px] flex items-center justify-center mb-3 shadow-sm">
                <Star size={28} className="text-amber-500 fill-amber-500 drop-shadow-sm" />
              </div>
              <p className="text-[16px] font-bold text-tg-text leading-tight mb-1">{t('thanks_rating', 'Thanks for your feedback!')}</p>
              <p className="text-[13px] font-medium text-tg-hint">
                {t('you_rated', { count: rating, defaultValue: `You rated this ${rating} stars` })}
              </p>
            </div>
          ) : (
            /* ── Estado: Sin Calificar ── */
            <div className="relative z-10">
              <p className="text-[15px] font-semibold text-tg-text mb-4">{t('rate_question', 'Rate this command')}</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    disabled={ratingLoading}
                    onClick={async () => {
                      setRatingLoading(true);
                      try {
                        await submitRating(mainSlug, n);
                        setRating(n);
                        setHasRated(true);
                        haptic?.notificationOccurred('success');
                        fetchCommandStats(mainSlug).then(setStats).catch(() => { });
                      } catch {
                        showToast(t('common:error'), 'error');
                      } finally {
                        setRatingLoading(false);
                      }
                    }}
                    className="w-11 h-11 rounded-[12px] bg-tg-hint/5 border border-tg-border/30 flex items-center justify-center active:scale-90 transition-all hover:bg-amber-500/10 hover:border-amber-500/30 group shadow-sm disabled:opacity-50"
                    title={t('rate_stars', { count: n })}
                  >
                    <Star
                      size={24}
                      className={`transition-colors duration-200 ${
                        n <= rating
                          ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                          : 'text-tg-hint/40 group-hover:text-amber-500/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Share & Report ── */}
      <section className="px-5 mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            const text = encodeURIComponent(t('share_command_text', { slug: mainSlug }));
            window.open(`https://t.me/share/url?url=https://t.me/TrelkBot&text=${text}`, '_blank');
            haptic?.impactOccurred('light');
          }}
          className="w-full py-3.5 rounded-[16px] bg-tg-secondary border border-tg-border/40 text-tg-text text-[15px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
        >
          <Share size={18} className="text-tg-hint/80" />
          {t('common:share', 'Share')}
        </button>

        <button
          onClick={() => { setShowReportModal(true); haptic?.impactOccurred('light'); }}
          disabled={reported}
          className={`w-full py-3.5 rounded-[16px] border text-[15px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm ${
            reported
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-tg-secondary border-tg-border/40 text-tg-text'
          }`}
        >
          {reported ? <CheckCircle2 size={18} /> : <Flag size={18} className="text-tg-hint/80" />}
          {reported ? t('reported', 'Reported') : t('report_error', 'Report')}
        </button>
      </section>

      <div className="px-5 mt-10 animate-fade-in">
        <div className="w-full h-px bg-tg-border/40 mb-8" />
        <CommandFeedback command={cmd.uniqueName!} />
      </div>

      {/* ── Navigation (Anterior / Siguiente) ── */}
      <section className="px-5 mt-8">
        <div className="flex gap-3">
          {prevCmd ? (
            <button
              onClick={() => goTo(cmdSlug(prevCmd))}
              className="flex-1 bg-tg-secondary rounded-[20px] border border-tg-border/40 p-4 text-left active:scale-[0.98] transition-transform shadow-sm group"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-tg-hint uppercase tracking-wider mb-1.5">
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> {t('previous', 'Prev')}
              </div>
              <div className="text-[15px] font-bold text-tg-text font-mono truncate">/{cmdSlug(prevCmd)}</div>
            </button>
          ) : <div className="flex-1" />}

          {nextCmd ? (
            <button
              onClick={() => goTo(cmdSlug(nextCmd))}
              className="flex-1 bg-tg-secondary rounded-[20px] border border-tg-border/40 p-4 text-right active:scale-[0.98] transition-transform shadow-sm group"
            >
              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-tg-hint uppercase tracking-wider mb-1.5">
                {t('next', 'Next')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-[15px] font-bold text-tg-text font-mono truncate">/{cmdSlug(nextCmd)}</div>
            </button>
          ) : <div className="flex-1" />}
        </div>
      </section>

      {/* ── Report Modal ── */}
      <ReportErrorModal
        commandSlug={mainSlug}
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={() => {
          setReported(true);
          haptic?.notificationOccurred('success');
          showToast(t('report_sent'), 'success');
        }}
      />

    </div>
  );
}