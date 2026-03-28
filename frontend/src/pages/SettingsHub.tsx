import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores';
import { useThemeStore, type ThemeMode } from '../stores/theme';
import {
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Globe,
  Clock,
  MapPin,
  MessageSquare,
  Palette,
  Crown,
  CreditCard,
  Flag
} from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';

export default function SettingsHub() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('settings');
  const { user: tgUser, haptic } = useTelegram();
  const { user } = useUserStore();
  const appUser = useUserStore((s) => s.user);
  const { mode: themeMode, setMode } = useThemeStore();

  const displayName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || 'User';
  const photoUrl = tgUser?.photo_url;
  const tgId = appUser?.authTelegram?.id || appUser?.id;

  const go = (path: string) => {
    haptic?.impactOccurred('light');
    navigate(`/users/ui/${userId}${path}`, { state: { from: `/users/ui/${userId}/settings-hub` } });
  };

  const themeLabel = themeMode === 'dark' ? t('dark') : themeMode === 'light' ? t('light') : t('system');

  // Icono dinámico según el tema
  const ThemeIcon = themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Monitor;

  const cycleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' };
    haptic?.impactOccurred('light');
    setMode(next[themeMode]);
  };

  return (
    <div className="pb-24 animate-fade-in relative">
      <StickyHeader title={t('title')} subtitle={t('subtitle')} />
      {/* ── Account Card ── */}
      <section className="px-5 mt-2">
        <button
          onClick={() => go('/profile')}
          className="w-full flex items-center gap-4 p-4 rounded-[20px] bg-tg-secondary border border-tg-border/30 text-left active:scale-[0.96] transition-all shadow-sm hover:brightness-110"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-14 h-14 rounded-[16px] object-cover ring-2 ring-white/10 shadow-inner" />
          ) : (
            <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-tg-accent to-blue-600 flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/10 shadow-inner">
              {displayName.charAt(0)}
            </div>
          )}

          {/* <div className="absolute inset-0 z-30 rounded-full" onContextMenu={(e) => e.preventDefault()} /> */}

          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-tg-text  truncate">{displayName}</div>
            <div className="text-[13px] font-mono text-tg-hint/80 truncate mt-0.5">ID: {tgId}</div>
          </div>
          <ChevronRight size={20} className="text-tg-hint/50 flex-shrink-0" />
        </button>
      </section>

      {/* ── Preferences ── */}
      <section className="mt-8 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('preferences')}</h2>

        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">

          {/* Language */}
          <button
            onClick={() => go('/set/lang')}
            className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors bg-transparent group"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-active:scale-95">
                <Globe size={18} className="text-sky-500" />
              </div>

              <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
                <div className="min-w-0 pr-2">
                  <div className="text-[16px] font-semibold text-tg-text leading-tight group-active:opacity-80 transition-opacity">
                    {t('language')}
                  </div>
                </div>

                {/* Valor Actual */}
                <div className="text-[15px] font-medium text-tg-hint/80 uppercase truncate text-right">
                  {(user as any)?.authUser?.config?.locale?.lang || 'EN'}
                </div>
              </div>
            </div>

            <ChevronRight size={18} className="text-tg-hint/40 flex-shrink-0 ml-1 transition-transform group-active:translate-x-0.5" />
          </button>

          {/* Timezone */}
          <button
            onClick={() => go('/set/timezone')}
            className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors bg-transparent group"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-active:scale-95">
                <Clock size={18} className="text-violet-500" />
              </div>

              <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
                <div className="min-w-0 pr-2">
                  <div className="text-[16px] font-semibold text-tg-text leading-tight group-active:opacity-80 transition-opacity">
                    {t('timezone')}
                  </div>
                </div>

                {/* Valor Actual (Limpio) */}
                <div className="text-[15px] font-medium text-tg-hint/80 truncate text-right max-w-[100px]">
                  {((user as any)?.authUser?.config?.locale?.tz || 'UTC')
                    .split('/')
                    .pop()
                    ?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <ChevronRight size={18} className="text-tg-hint/40 flex-shrink-0 ml-1 transition-transform group-active:translate-x-0.5" />
          </button>

          {/* Country */}
          <button
            onClick={() => go('/set/country')}
            className="w-full flex items-center justify-between p-4 text-left active:bg-tg-hint/10 transition-colors bg-transparent group"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-active:scale-95">
                <MapPin size={18} className="text-rose-500" />
              </div>

              <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
                <div className="min-w-0 pr-2">
                  <div className="text-[16px] font-semibold text-tg-text leading-tight group-active:opacity-80 transition-opacity">
                    {t('country')}
                  </div>
                </div>

                {/* Valor Actual */}
                <div className="text-[15px] font-medium text-tg-hint/80 uppercase truncate text-right">
                  {(user as any)?.authUser?.config?.locale?.country || 'US'}
                </div>
              </div>
            </div>

            <ChevronRight size={18} className="text-tg-hint/40 flex-shrink-0 ml-1 transition-transform group-active:translate-x-0.5" />
          </button>

        </div>
      </section>

      {/* ── Bot Settings ── */}
      <section className="mt-8 px-5">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-3 pl-2">{t('bot_settings')}</h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-tg-border/20">

            <button onClick={() => go('/settings')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={18} className="text-tg-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text ">{t('chat_preferences')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('chat_preferences_desc')}</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            <button onClick={() => go('/set/theme')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                <Palette size={18} className="text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text ">{t('appearance')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('appearance_desc')}</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            <button onClick={() => go('/my-reports')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Flag size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text ">{t('my_reports')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('my_reports_desc')}</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

          </div>
        </div>
      </section>

      {/* ── Plan & Payments ── */}
      <section className="mt-8 px-5 pb-4">
        <h2 className="text-[12px] font-bold text-tg-hint uppercase  mb-3 pl-2">{t('plan_payments')}</h2>

        <div className="rounded-[20px] bg-tg-secondary border border-tg-border/30 overflow-hidden shadow-sm">
          <div className="divide-y divide-tg-border/20">

            <button onClick={() => go('/subscription')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text ">{t('your_plan')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('your_plan_desc')}</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

            <button onClick={() => go('/payments')} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-tg-surface/40 active:bg-tg-surface/60 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-tg-text ">{t('payments')}</div>
                <div className="text-[12px] font-medium text-tg-hint mt-0.5">{t('payments_desc')}</div>
              </div>
              <ChevronRight size={18} className="text-tg-hint/50 flex-shrink-0" />
            </button>

          </div>
        </div>
      </section>

    </div>
  );
}