import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { AlertCircle } from 'lucide-react';
import { updateProfile } from '../services/api';
import StickyHeader from '@/components/StickyHeader';

export default function AccountPage() {
  const { userId } = useParams();
  const { t } = useTranslation('profile');
  const { user, haptic, webApp } = useTelegram();

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '';

  // Profile form state
  const [form, setForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    city: '',
    phone: '',
    email: '',
  });

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const initialRef = useRef({ ...form });

  const handleChange = useCallback((field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      setDirty(JSON.stringify(next) !== JSON.stringify(initialRef.current));
      setSaved(false);
      setError('');
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!dirty || saving) return;

    setSaving(true);
    setError('');
    haptic?.impactOccurred('medium');

    try {
      await updateProfile(form);
      initialRef.current = { ...form };
      setDirty(false);
      setSaved(true);
      haptic?.notificationOccurred('success');

      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || t('error_saving_profile'));
      haptic?.notificationOccurred('error');
    } finally {
      setSaving(false);
    }
  }, [form, dirty, saving, haptic, t]);

  // ── Lógica del MainButton Nativo de Telegram ──
  useEffect(() => {
    if (!webApp?.MainButton) return;

    const mainButton = webApp.MainButton;

    // Actualizamos el estado visual del botón según el estado del componente
    if (saving) {
      mainButton.setText(t('common:saving'));
      mainButton.showProgress(false); // Muestra el loader y deshabilita el clic
      mainButton.show();
    } else if (saved) {
      mainButton.hide();

    } else if (dirty) {
      mainButton.hideProgress();
      mainButton.setText(t('common:save_changes'));
      mainButton.enable();
      mainButton.show();
    } else {
      mainButton.hide();
    }

    // Manejo de eventos
    mainButton.onClick(handleSave);

    // Limpieza al desmontar o cambiar dependencias
    return () => {
      mainButton.offClick(handleSave);
    };
  }, [webApp, dirty, saving, saved, handleSave, t]);

  // Asegurarnos de ocultar el botón si salimos de la pantalla (desmontaje final)
  useEffect(() => {
    return () => {
      if (webApp?.MainButton) {
        webApp.MainButton.hide();
      }
    };
  }, [webApp]);

  return (
    <div className="pb-8 animate-fade-in">
      <StickyHeader title={t('my_account')} subtitle={t('manage_info')} />

      {/* ── Datos de Telegram (Solo Lectura) ── */}
      <div className="mt-4 px-4">
        <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2 px-1">
          {t('telegram_data')}
        </h2>
        <div className="rounded-2xl bg-tg-secondary overflow-hidden divide-y divide-tg-border/20 animate-slide-up">
          <ReadonlyRow label={t('display_name')} value={displayName} />
          <ReadonlyRow label={t('username')} value={user?.username ? `@${user.username}` : '—'} />
          <ReadonlyRow label={t('user_id')} value={String(user?.id || '—')} mono />
          <ReadonlyRow label={t('app_language')} value={user?.language_code?.toUpperCase() || '—'} />
        </div>
      </div>

      {/* ── Perfil de Trelk (Editable) ── */}
      <div className="mt-6 px-4">
        <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2 px-1">
          {t('trelk_profile')}
        </h2>
        <div className="rounded-2xl bg-tg-secondary overflow-hidden divide-y divide-tg-border/20 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <EditableRow
            label={t('first_name')}
            value={form.firstName}
            onChange={v => handleChange('firstName', v)}
            placeholder={t('first_name_placeholder')}
          />
          <EditableRow
            label={t('last_name')}
            value={form.lastName}
            onChange={v => handleChange('lastName', v)}
            placeholder={t('last_name_placeholder')}
          />
          <EditableRow
            label={t('city')}
            value={form.city}
            onChange={v => handleChange('city', v)}
            placeholder={t('city_placeholder')}
          />
          <EditableRow
            label={t('phone')}
            value={form.phone}
            onChange={v => handleChange('phone', v)}
            placeholder={t('phone_placeholder')}
            type="tel"
          />
          <EditableRow
            label={t('email')}
            value={form.email}
            onChange={v => handleChange('email', v)}
            placeholder={t('email_placeholder')}
            type="email"
          />
        </div>
      </div>

      {/* ── Área de Errores ── */}
      {/* Mantenemos solo el manejo de errores en la UI, el botón ahora es nativo */}
      <div className="px-4 mt-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {error && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes Auxiliares (Estilo Telegram Nativo) ──

function ReadonlyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3 hover:bg-tg-surface/40 transition-colors flex flex-col justify-center min-h-[56px]">
      <span className="text-[12px] text-tg-hint">{label}</span>
      <span className={`text-[15px] text-tg-text mt-0.5 ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function EditableRow({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="px-5 py-2.5 bg-transparent hover:bg-tg-surface/30 transition-colors focus-within:bg-tg-surface/40 flex flex-col justify-center min-h-[56px]">
      <span className="text-[12px] text-tg-hint">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-tg-text text-[15px] mt-0.5 placeholder:text-tg-hint/40"
      />
    </div>
  );
}