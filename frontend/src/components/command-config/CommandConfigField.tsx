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
  idle: 'text-tg-hint/70',
  modified: 'text-amber-400',
  saving: 'text-tg-accent',
  saved: 'text-emerald-400',
  error: 'text-red-400',
};

const STATUS_LABEL: Record<FieldSaveState, string> = {
  idle: '',
  modified: 'Modified',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Error',
};

function coerceBoolean(value: unknown): boolean {
  return value === true;
}

export default function CommandConfigField({ field, value, status = 'idle', error, onChange }: CommandConfigFieldProps) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-tg-text">{field.label}</p>
          {field.description && (
            <p className="text-[12px] text-tg-hint mt-0.5">{field.description}</p>
          )}
        </div>
        {!!STATUS_LABEL[status] && (
          <span className={`text-[11px] font-semibold shrink-0 ${STATUS_CLASS[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {field.type === 'select' && (
        <div className="relative">
          <select
            className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      {field.type === 'number' && (
        <input
          type="number"
          className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50"
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )}

      {field.type === 'text' && (
        <input
          type="text"
          className="w-full rounded-[12px] bg-tg-surface border border-tg-border/40 px-3 py-2.5 text-[14px] text-tg-text outline-none focus:border-tg-accent/50"
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'boolean' && (
        <div className="flex items-center justify-end">
          <Toggle enabled={coerceBoolean(value)} onChange={(next) => onChange(next)} />
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
