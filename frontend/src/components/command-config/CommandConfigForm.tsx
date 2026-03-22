import type { CommandConfigFieldSchema } from '../../config/commandConfigSchema';
import CommandConfigField, { type FieldSaveState } from './CommandConfigField';

interface CommandConfigFormProps {
  fields: CommandConfigFieldSchema[];
  commandConfig: Record<string, unknown>;
  statuses: Record<string, FieldSaveState>;
  errors: Record<string, string | null>;
  onFieldChange: (field: CommandConfigFieldSchema, value: unknown) => void;
}

function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export default function CommandConfigForm({
  fields,
  commandConfig,
  statuses,
  errors,
  onFieldChange,
}: CommandConfigFormProps) {
  return (
    <>
      {fields.map((field) => (
        <CommandConfigField
          key={field.key}
          field={field}
          value={getValueByPath(commandConfig, field.key)}
          status={statuses[field.key] ?? 'idle'}
          error={errors[field.key] ?? null}
          onChange={(value) => onFieldChange(field, value)}
        />
      ))}
    </>
  );
}
