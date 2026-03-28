import { useTranslation } from 'react-i18next';
import Toggle from '../Toggle';
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

  if (field.type === 'boolean') {
    return (
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-tg-text">{label}</p>
            {statusKey && (
              <span className={`text-[11px] font-semibold ${STATUS_CLASS[status]}`}>
                {t(statusKey)}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[12px] text-tg-hint mt-0.5">{description}</p>
          )}
        </div>
        <Toggle enabled={coerceBoolean(value)} onChange={(next) => onChange(next)} />
      </div>
    );
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-tg-text">{label}</p>
          {description && (
            <p className="text-[12px] text-tg-hint mt-0.5">{description}</p>
          )}
        </div>
        {statusKey && (
          <span className={`text-[11px] font-semibold shrink-0 ${STATUS_CLASS[status]}`}>
            {t(statusKey)}
          </span>
        )}
      </div>

      {field.type === 'select' && (
        <select
          className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50 transition-colors"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
      )}

      {field.type === 'number' && (
        <input
          type="number"
          className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50 transition-colors"
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )}

      {field.type === 'text' && (
        <input
          type="text"
          className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50 transition-colors"
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <p className="text-[12px] text-red-400 mt-2">{error}</p>}
    </div>
  );
}
