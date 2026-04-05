import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Toggle from '../Toggle';
import Select from '../Select';
import type { CommandConfigFieldSchema } from '../../config/commandConfigSchema';

export type FieldSaveState = 'idle' | 'modified' | 'saving' | 'saved' | 'error';

interface CommandConfigFieldProps {
  field: CommandConfigFieldSchema;
  value: unknown;
  status?: FieldSaveState;
  error?: string | null;
  onChange: (value: unknown) => void;
}

const STATUS_CLASS: Record<FieldSaveState, string> = {
  idle: '',
  modified: 'text-amber-400',
  saving: 'text-tg-accent',
  saved: 'text-emerald-400',
  error: 'text-red-400',
};

const STATUS_ICON: Record<FieldSaveState, string> = {
  idle: '',
  modified: '●',
  saving: '↻',
  saved: '✓',
  error: '✕',
};

const STATUS_KEY: Record<FieldSaveState, string> = {
  idle: '',
  modified: 'status_modified',
  saving: 'status_saving',
  saved: 'status_saved',
  error: 'status_error',
};

function coerceBoolean(value: unknown): boolean {
  return value === true;
}

export default function CommandConfigField({ field, value, status = 'idle', error, onChange }: CommandConfigFieldProps) {
  const { t } = useTranslation('commands');
  const label = t(field.labelKey);
  const description = field.descriptionKey ? t(field.descriptionKey) : undefined;
  const statusKey = STATUS_KEY[status];

  const statusBadge = statusKey ? (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-[11px] font-bold flex items-center gap-1 ${STATUS_CLASS[status]}`}
    >
      <span className="text-[9px]">{STATUS_ICON[status]}</span>
      {t(statusKey)}
    </motion.span>
  ) : null;

  if (field.type === 'boolean') {
    return (
      <div className="px-4 py-4 flex items-center justify-between gap-3 group">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-tg-text">{label}</p>
            {statusBadge}
          </div>
          {description && (
            <p className="text-[12px] text-tg-hint/70 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        <Toggle enabled={coerceBoolean(value)} onChange={(next) => onChange(next)} />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-tg-text">{label}</p>
          {description && (
            <p className="text-[12px] text-tg-hint/70 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {statusBadge}
      </div>

      {field.type === 'select' && (
        <Select
          options={(field.options ?? []).map((opt) => ({ label: t(opt.labelKey), value: opt.value }))}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
        />
      )}

      {field.type === 'number' && (
        <div className="relative">
          <input
            type="number"
            className="w-full rounded-[14px] bg-tg-text/[0.03] border border-tg-border/30 px-4 py-3 text-[14px] text-tg-text font-medium outline-none focus:border-tg-accent/50 focus:bg-tg-text/[0.01] transition-all placeholder:text-tg-hint/40"
            min={field.min}
            max={field.max}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
          />
          {field.min !== undefined && field.max !== undefined && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-tg-hint/50 font-medium pointer-events-none">
              {field.min}–{field.max}
            </span>
          )}
        </div>
      )}

      {field.type === 'text' && (
        <input
          type="text"
          className="w-full rounded-[14px] bg-tg-text/[0.03] border border-tg-border/30 px-4 py-3 text-[14px] text-tg-text font-medium outline-none focus:border-tg-accent/50 focus:bg-tg-text/[0.01] transition-all placeholder:text-tg-hint/40"
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[12px] text-red-400 font-medium mt-2 pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
