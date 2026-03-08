import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { updateProfile } from '../services/api';
import StickyHeader from '@/components/StickyHeader';

export default function AccountPage() {
  const { userId } = useParams();
  const { user, haptic } = useTelegram();

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
      setError(e.message || 'Error al guardar el perfil');
      haptic?.notificationOccurred('error');
    } finally {
      setSaving(false);
    }
  }, [form, dirty, saving, haptic]);

  return (
    <div className="pb-24 animate-fade-in">
      <StickyHeader title="Mi Cuenta" subtitle="Gestiona tu información personal" />
      {/* ── Datos de Telegram (Solo Lectura) ── */}
      <div className="mt-4 px-4">
        <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2 px-1">
          Datos de Telegram
        </h2>
        <div className="rounded-2xl bg-tg-secondary overflow-hidden divide-y divide-white/5 animate-slide-up">
          <ReadonlyRow label="Nombre visible" value={displayName} />
          <ReadonlyRow label="Username" value={user?.username ? `@${user.username}` : '—'} />
          <ReadonlyRow label="ID de Usuario" value={String(user?.id || '—')} mono />
          <ReadonlyRow label="Idioma App" value={user?.language_code?.toUpperCase() || '—'} />
        </div>
      </div>

      {/* ── Perfil de Trelk (Editable) ── */}
      <div className="mt-6 px-4">
        <h2 className="text-[13px] font-medium text-tg-hint uppercase tracking-wide mb-2 px-1">
          Perfil en Trelk
        </h2>
        <div className="rounded-2xl bg-tg-secondary overflow-hidden divide-y divide-white/5 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <EditableRow 
            label="Nombre" 
            value={form.firstName} 
            onChange={v => handleChange('firstName', v)} 
            placeholder="Tu nombre" 
          />
          <EditableRow 
            label="Apellido" 
            value={form.lastName} 
            onChange={v => handleChange('lastName', v)} 
            placeholder="Tu apellido" 
          />
          <EditableRow 
            label="Ciudad" 
            value={form.city} 
            onChange={v => handleChange('city', v)} 
            placeholder="Ej. Madrid" 
          />
          <EditableRow 
            label="Teléfono" 
            value={form.phone} 
            onChange={v => handleChange('phone', v)} 
            placeholder="+34 600 000 000" 
            type="tel" 
          />
          <EditableRow 
            label="Email" 
            value={form.email} 
            onChange={v => handleChange('email', v)} 
            placeholder="correo@ejemplo.com" 
            type="email" 
          />
        </div>
      </div>

      {/* ── Área de Guardado ── */}
      <div className="px-4 mt-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        
        {error && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
            dirty && !saving
              ? 'bg-tg-accent text-white active:scale-[0.98]'
              : saved
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-white/5 text-tg-hint cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin text-white/70" />
              <span>Guardando...</span>
            </>
          ) : saved ? (
            <>
              <Check size={18} strokeWidth={2.5} className="text-emerald-500" />
              <span>Guardado</span>
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>
    </div>
  );
}

// ── Componentes Auxiliares (Estilo Telegram Nativo) ──

function ReadonlyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3 hover:bg-white/[0.02] transition-colors flex flex-col justify-center min-h-[56px]">
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
    <div className="px-5 py-2.5 bg-transparent hover:bg-white/[0.01] transition-colors focus-within:bg-white/[0.02] flex flex-col justify-center min-h-[56px]">
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