import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { changeSettings, updateConfig } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore } from '../stores';
import { useConfigStore } from '../stores/config';
import ToggleRow from '../components/ToggleRow';
import MenuRow from '../components/MenuRow';
import Checkbox from '../components/Checkbox';
import DropdownRow from '../components/DropdownRow';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';
import { UserConfig } from '@/services/configApi';

interface SettingsState {
  auto_detect_lang: boolean;
  await_args: boolean;
  message_format: boolean;
  emoji_replies: boolean;
  chat_actions: {
    typing: boolean;
    upload_photos: boolean;
    upload_videos: boolean;
    upload_document: boolean;
  };
  time_format: string;
  share_username: boolean;
  store_chat_history: boolean;
  allow_data_usage: boolean;
  notifications: {
    new_commands: boolean;
    downtime_alerts: boolean;
    feature_announcements: boolean;
    security_alerts: boolean;
  };
  notify_semanal_stats: boolean;
  large_text: boolean;
  compact_mode: boolean;
}

// 1. COMPONENTE PRINCIPAL (Solo maneja la carga)
export default function SettingsPage() {
  const { config, load: loadConfig } = useConfigStore();

  useEffect(() => {
    if (!config) loadConfig();
  }, [config, loadConfig]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-tg-accent animate-spin" />
          <span className="text-[13px] font-medium text-tg-hint animate-pulse">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return <SettingsForm config={config} />;
}


// 2. COMPONENTE DEL FORMULARIO
function SettingsForm({ config }: { config: UserConfig }) {
  const { userId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);
  const { saveLocale } = useConfigStore();
  const patchConfig = useConfigStore((s) => s.patchConfig);

  const locale = config.locale ?? {};

  const [settings, setSettings] = useState<SettingsState>({
    auto_detect_lang: config.auto_detect_lang ?? false,
    await_args: config.await_args ?? false,
    message_format: true,
    emoji_replies: config.emoji_replies ?? false,
    chat_actions: {
      typing: config.chat_actions?.typing ?? true,
      upload_photos: config.chat_actions?.upload_photos ?? true,
      upload_videos: config.chat_actions?.upload_videos ?? true,
      upload_document: config.chat_actions?.upload_documents ?? true,
    },
    time_format: config.time_format || '24h',
    share_username: true,
    store_chat_history: config.store_chat_history ?? false,
    allow_data_usage: false,
    notifications: {
      new_commands: config.notifications?.new_commands ?? false,
      downtime_alerts: config.notifications?.downtime_alerts ?? true,
      feature_announcements: config.notifications?.feature_announcements ?? true,
      security_alerts: config.notifications?.security_alerts ?? true,
    },
    notify_semanal_stats: config.notify_semanal_stats ?? false,
    large_text: false,
    compact_mode: false,
  });

  const [chatActionsOpen, setChatActionsOpen] = useState(true);

  const handleToggle = useCallback(
    async (field: string, value: boolean) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
      haptic?.selectionChanged();
      try {
        await changeSettings({ [field]: value ? true : 0 });
        patchConfig({ [field]: value });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig, haptic],
  );

  const handleChatAction = useCallback(
    async (key: string, value: boolean) => {
      const newActions = { ...settings.chat_actions, [key]: value };
      setSettings((prev) => ({ ...prev, chat_actions: newActions }));
      haptic?.selectionChanged();

      const activeKeys = Object.entries(newActions)
        .filter(([, v]) => v)
        .map(([k]) => k);

      try {
        await changeSettings({ chat_actions: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ chat_actions: newActions } as unknown as Partial<UserConfig>);
      } catch {
        showToast('Error.', 'error');
      }
    },
    [settings.chat_actions, showToast, patchConfig, haptic],
  );

  const handleToggleChatActions = useCallback(
    async (enable: boolean) => {
      const newActions = {
        typing: enable,
        upload_photos: enable,
        upload_videos: enable,
        upload_document: enable,
      };
      setSettings((prev) => ({ ...prev, chat_actions: newActions }));
      haptic?.impactOccurred('medium');

      const activeKeys = enable ? Object.keys(newActions) : [];
      setChatActionsOpen(enable);

      try {
        await changeSettings({ chat_actions: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ chat_actions: newActions } as unknown as Partial<UserConfig>);
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig, haptic],
  );

  const handleNotification = useCallback(
    async (key: string, value: boolean) => {
      const newNotif = { ...settings.notifications, [key]: value };
      setSettings((prev) => ({ ...prev, notifications: newNotif }));
      haptic?.selectionChanged();

      const activeKeys = Object.entries(newNotif)
        .filter(([, v]) => v)
        .map(([k]) => k);

      try {
        await changeSettings({ notifications_settings: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ notifications: newNotif } as unknown as Partial<UserConfig>);
      } catch {
        showToast('Error.', 'error');
      }
    },
    [settings.notifications, showToast, patchConfig, haptic],
  );

  const handleTimeFormat = useCallback(
    async (value: string) => {
      setSettings((prev) => ({ ...prev, time_format: value }));
      haptic?.selectionChanged();
      try {
        await updateConfig({ time_format: value });
        patchConfig({ time_format: value } as unknown as Partial<UserConfig>);
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig, haptic],
  );

  const chatActionCount = Object.values(settings.chat_actions).filter(Boolean).length;
  const chatActionTotal = Object.keys(settings.chat_actions).length;

  return (
    <div className="pb-28 animate-fade-in relative max-w-[480px] mx-auto">
      <StickyHeader 
        title={t('settings:configuration', 'Configuration')} 
        subtitle={t('settings:subtitle', 'Manage your preferences')} 
        icon={
          <div className="w-[42px] h-[42px] rounded-[14px] bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <SettingsIcon className="w-5 h-5 text-slate-500" />
          </div>
        }
      />
      
      {/* Language Section */}
      <div className="mt-4 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('lang_title', 'Language')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">
          <ToggleRow
            label={t('lang_auto_detect')}
            enabled={settings.auto_detect_lang}
            onChange={(v) => handleToggle('auto_detect_lang', v)}
          />
          <MenuRow
            label={t('lang_default')}
            to={`/users/ui/${userId}/set/lang`}
          />
        </div>
      </div>

      {/* Response Preferences */}
      <div className="mt-8 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('response_preferences_title', 'Response Preferences')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">
          <ToggleRow
            label={t('await_args')}
            enabled={settings.await_args}
            onChange={(v) => handleToggle('await_args', v)}
          />
          <ToggleRow
            label={t('rich_text_format')}
            enabled={settings.message_format}
            onChange={(v) => handleToggle('message_format', v)}
          />
          <ToggleRow
            label={t('emoji_replies')}
            enabled={settings.emoji_replies}
            onChange={(v) => handleToggle('emoji_replies', v)}
          />

          {/* Chat Actions expandable group */}
          <div className="flex flex-col bg-tg-secondary">
            <div
              className="flex items-center justify-between p-4 cursor-pointer active:bg-tg-hint/10 transition-colors"
              onClick={() => {
                setChatActionsOpen(!chatActionsOpen);
                haptic?.impactOccurred('soft');
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[15px] text-tg-text leading-tight">{t('show_indicators')}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-tg-hint">
                  {chatActionCount}/{chatActionTotal}
                </span>
                
                {/* Tailwind Custom Toggle Switch */}
                <div
                  className={`flex-shrink-0 w-[46px] h-[26px] rounded-full p-1 transition-colors duration-300 ease-in-out relative ${
                    chatActionCount > 0 ? 'bg-tg-accent' : 'bg-tg-hint/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const enable = chatActionCount === 0;
                    handleToggleChatActions(enable);
                  }}
                  role="switch"
                  aria-checked={chatActionCount > 0}
                >
                  <div
                    className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                      chatActionCount > 0 ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {chatActionsOpen && (
              <div className="bg-tg-hint/5 flex flex-col divide-y divide-tg-border/10 border-t border-tg-border/20">
                <Checkbox
                  label={t('typing')}
                  checked={settings.chat_actions.typing}
                  onChange={(v) => handleChatAction('typing', v)}
                />
                <Checkbox
                  label={t('upload_photos')}
                  checked={settings.chat_actions.upload_photos}
                  onChange={(v) => handleChatAction('upload_photos', v)}
                />
                <Checkbox
                  label={t('upload_videos')}
                  checked={settings.chat_actions.upload_videos}
                  onChange={(v) => handleChatAction('upload_videos', v)}
                />
                <Checkbox
                  label={t('upload_document')}
                  checked={settings.chat_actions.upload_document}
                  onChange={(v) => handleChatAction('upload_document', v)}
                />
              </div>
            )}
          </div>
        </div>
        <p className="px-2 mt-2.5 text-[13px] font-medium text-tg-hint/80 leading-relaxed">{t('response_help')}</p>
      </div>

      {/* Date and Time */}
      <div className="mt-6 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('datetime_title', 'Date & Time')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20 animate-stagger">
          <DropdownRow
            label={t('time_format')}
            value={settings.time_format}
            options={[
              { value: '12h', label: t('time_format_12h') },
              { value: '24h', label: t('time_format_24h') },
            ]}
            onChange={handleTimeFormat}
          />
          <DropdownRow
            label={t('settings:date_format')}
            value={locale.datetime_format?.date || 'DD/MM/YYYY'}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
            ]}
            onChange={async (v) => {
              try {
                await saveLocale({ datetime_format: { ...locale.datetime_format, date: v } });
                showToast(t('common:format_updated'), 'success');
              } catch { showToast(t('common:error'), 'error'); }
            }}
          />
          <DropdownRow
            label={t('settings:time_format_label')}
            value={locale.datetime_format?.time || 'HH:mm'}
            options={[
              { value: 'HH:mm', label: 'HH:mm (24h)' },
              { value: 'hh:mm A', label: 'hh:mm AM/PM' },
              { value: 'HH:mm:ss', label: 'HH:mm:ss' },
            ]}
            onChange={async (v) => {
              try {
                await saveLocale({ datetime_format: { ...locale.datetime_format, time: v } });
                showToast(t('common:format_updated'), 'success');
              } catch { showToast(t('common:error'), 'error'); }
            }}
          />
        </div>
        <p className="px-2 mt-2.5 text-[13px] font-medium text-tg-hint/80 leading-relaxed">{t('datetime_help')}</p>
      </div>

      {/* Privacy */}
      <div className="mt-6 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('privacy_title', 'Privacy')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 shadow-sm flex flex-col divide-y divide-tg-border/20">
          <ToggleRow
            label={t('share_username')}
            enabled={settings.share_username}
            onChange={(v) => handleToggle('share_username', v)}
          />
          <ToggleRow
            label={t('store_chat_history')}
            enabled={settings.store_chat_history}
            onChange={(v) => handleToggle('store_chat_history', v)}
          />
          <ToggleRow
            label={t('allow_data_usage')}
            enabled={settings.allow_data_usage}
            onChange={(v) => handleToggle('allow_data_usage', v)}
          />
        </div>
        <p className="px-2 mt-2.5 text-[13px] font-medium text-tg-hint/80 leading-relaxed">{t('privacy_help')}</p>
      </div>

      {/* Notifications */}
      <div className="mt-6 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('notifications_title', 'Notifications')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20">
          
          <div className="px-4 pt-4 pb-2 bg-tg-hint/5">
            <h3 className="text-[12px] font-bold text-tg-hint uppercase tracking-wider">{t('updates', 'Updates & Alerts')}</h3>
          </div>
          
          <Checkbox
            label={t('new_commands')}
            checked={settings.notifications.new_commands}
            onChange={(v) => handleNotification('new_commands', v)}
          />
          <Checkbox
            label={t('downtime_alerts')}
            checked={settings.notifications.downtime_alerts}
            onChange={(v) => handleNotification('downtime_alerts', v)}
          />
          <Checkbox
            label={t('feature_announcements')}
            checked={settings.notifications.feature_announcements}
            onChange={(v) => handleNotification('feature_announcements', v)}
          />
          <Checkbox
            label={t('security_alerts')}
            checked={settings.notifications.security_alerts}
            onChange={(v) => handleNotification('security_alerts', v)}
          />
          
          <div className="bg-tg-secondary border-t border-tg-border/20">
            <ToggleRow
              label={t('weekly_summary')}
              enabled={settings.notify_semanal_stats}
              onChange={(v) => handleToggle('notify_semanal_stats', v)}
            />
          </div>
        </div>
        <p className="px-2 mt-2.5 text-[13px] font-medium text-tg-hint/80 leading-relaxed">{t('notifications_help')}</p>
      </div>

      {/* Interface */}
      <div className="mt-6 px-5">
        <h2 className="text-[13px] font-semibold text-tg-hint uppercase tracking-wider pl-1 mb-2.5">{t('interface_title', 'Interface')}</h2>
        <div className="bg-tg-secondary rounded-[20px] border border-tg-border/40 overflow-hidden shadow-sm flex flex-col divide-y divide-tg-border/20 animate-stagger">
          <ToggleRow
            label={t('large_text')}
            enabled={settings.large_text}
            onChange={(v) => handleToggle('large_text', v)}
          />
          <ToggleRow
            label={t('compact_mode')}
            enabled={settings.compact_mode}
            onChange={(v) => handleToggle('compact_mode', v)}
          />
        </div>
        <p className="px-2 mt-2.5 text-[13px] font-medium text-tg-hint/80 leading-relaxed">{t('interface_help')}</p>
      </div>

    </div>
  );
}