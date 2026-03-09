import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { changeSettings, updateConfig } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import { useToastStore } from '../stores';
import { useConfigStore } from '../stores/config';
import SectionHeader from '../components/SectionHeader';
import ToggleRow from '../components/ToggleRow';
import MenuRow from '../components/MenuRow';
import Checkbox from '../components/Checkbox';
import DropdownRow from '../components/DropdownRow';
import { Globe, Clock, Shield, Bell, Palette, Languages, MapPin } from 'lucide-react';
import Select from '@/components/Select';
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

  // Si no hay config, mostramos el loading y NO ejecutamos los hooks del formulario
  if (!config) {
    return (
      <div className="tm-main flex-col items-center justify-center h-screen">
        <div className="loader" />
        <p className="text-tg-text/80 mt-4">Cargando configuración...</p>
      </div>
    );
  }

  // Una vez que config existe, renderizamos el componente real del formulario
  return <SettingsForm config={config} />;
}


// 2. COMPONENTE DEL FORMULARIO (Se asegura que `config` nunca sea null aquí)
function SettingsForm({ config }: { config: UserConfig }) {
  // console.log('config', config)
  const { userId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);
  const { saveLocale } = useConfigStore();
  const patchConfig = useConfigStore((s) => s.patchConfig);

  const locale = config.locale ?? {};

  // Ahora es seguro usar `config` en el estado inicial porque sabemos que no es null
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
      console.log('Toggling', field, value);
      setSettings((prev) => ({ ...prev, [field]: value }));
      try {
        await changeSettings({ [field]: value ? true : 0 });
        patchConfig({ [field]: value });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig],
  );

  const handleChatAction = useCallback(
    async (key: string, value: boolean) => {
      const newActions = { ...settings.chat_actions, [key]: value };
      setSettings((prev) => ({ ...prev, chat_actions: newActions }));

      const activeKeys = Object.entries(newActions)
        .filter(([, v]) => v)
        .map(([k]) => k);

      try {
        await changeSettings({ chat_actions: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ chat_actions: newActions });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [settings.chat_actions, showToast, patchConfig],
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

      const activeKeys = enable ? Object.keys(newActions) : [];

      setChatActionsOpen(enable);

      try {
        await changeSettings({ chat_actions: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ chat_actions: newActions });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig],
  );

  const handleNotification = useCallback(
    async (key: string, value: boolean) => {
      const newNotif = { ...settings.notifications, [key]: value };
      setSettings((prev) => ({ ...prev, notifications: newNotif }));

      const activeKeys = Object.entries(newNotif)
        .filter(([, v]) => v)
        .map(([k]) => k);

      try {
        await changeSettings({ notifications_settings: activeKeys.length > 0 ? activeKeys : null });
        patchConfig({ notifications: newNotif });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [settings.notifications, showToast, patchConfig],
  );

  const handleTimeFormat = useCallback(
    async (value: string) => {
      setSettings((prev) => ({ ...prev, time_format: value }));
      try {
        await updateConfig({ time_format: value });
        patchConfig({ time_format: value });
      } catch {
        showToast('Error.', 'error');
      }
    },
    [showToast, patchConfig],
  );

  const chatActionCount = Object.values(settings.chat_actions).filter(Boolean).length;
  const chatActionTotal = Object.keys(settings.chat_actions).length;

  return (
    <div className="tm-main pb-8 animate-fade-in" style={{
      top: 'var(--tg-top-offset, 0px)',
    }}>
      <StickyHeader title="Configuración" subtitle="Personaliza tu experiencia" />
      
      {/* Language Section */}
      <SectionHeader title={t('lang_title')} />
      <div className="mx-4 animate-stagger">
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

      {/* Response Preferences */}
      <SectionHeader title={t('response_preferences_title')} />
      <div className="mx-4">
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
        <div
          className="tm-row cursor-pointer"
          onClick={() => {
            setChatActionsOpen(!chatActionsOpen);
            haptic?.impactOccurred('soft');
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[15px] text-tg-text">{t('show_indicators')}</div>
          </div>
          <span className="text-[13px] text-tg-hint mr-2">
            {chatActionCount}/{chatActionTotal}
          </span>
          <div
            className={`tm-toggle ${chatActionCount > 0 ? 'on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const enable = chatActionCount === 0;
              handleToggleChatActions(enable);
            }}
          />
        </div>

        {chatActionsOpen && (
          <div className="rounded-b-xl">
            <Checkbox
              isFirst={true}
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
      <p className="help-text">{t('response_help')}</p>

      {/* Date and Time */}
      <SectionHeader title={t('datetime_title')} />
      <div className="mx-4 animate-stagger">
        <DropdownRow
          label={t('time_format')}
          value={settings.time_format}
          options={[
            { value: '12h', label: t('time_format_12h') },
            { value: '24h', label: t('time_format_24h') },
          ]}
          onChange={handleTimeFormat}
        />
        
        {/* Date format */}
        <DropdownRow
          label="Formato de fecha"
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
              showToast('Formato actualizado', 'success');
            } catch { showToast('Error', 'error'); }
          }}
        />

        {/* Time format */}
        <DropdownRow
          label="Formato de hora"
          value={locale.datetime_format?.time || 'HH:mm'}
          options={[
            { value: 'HH:mm', label: 'HH:mm (24h)' },
            { value: 'hh:mm A', label: 'hh:mm AM/PM' },
            { value: 'HH:mm:ss', label: 'HH:mm:ss' },
          ]}
          onChange={async (v) => {
            try {
              await saveLocale({ datetime_format: { ...locale.datetime_format, time: v } });
              showToast('Formato actualizado', 'success');
            } catch { showToast('Error', 'error'); }
          }}
        />
      </div>
      <p className="help-text">{t('datetime_help')}</p>

      {/* Privacy */}
      <SectionHeader title={t('privacy_title')} />
      <div className="mx-4">
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
      <p className="help-text">{t('privacy_help')}</p>

      {/* Notifications */}
      <SectionHeader title={t('notifications_title')} />
      <div className="mx-4">
        <div className="tm-section-header px-0 pt-2 pb-1">
          <h2 className="text-[13px] text-tg-hint uppercase">{t('updates')}</h2>
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
        <ToggleRow
          label={t('weekly_summary')}
          enabled={settings.notify_semanal_stats}
          onChange={(v) => handleToggle('notify_semanal_stats', v)}
        />
      </div>
      <p className="help-text">{t('notifications_help')}</p>

      {/* Interface */}
      <SectionHeader title={t('interface_title')} />
      <div className="mx-4 animate-stagger">
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
      <p className="help-text">{t('interface_help')}</p>
    </div>
  );
}