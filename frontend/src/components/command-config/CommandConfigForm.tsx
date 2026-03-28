import { useTranslation } from 'react-i18next';
import type { CommandConfigGroup, CommandConfigFieldSchema } from '../../config/commandConfigSchema';
import CommandConfigField, { type FieldSaveState } from './CommandConfigField';
import CommandConfigSection from './CommandConfigSection';

interface CommandConfigFormProps {
  groups: CommandConfigGroup[];
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
  groups,
  commandConfig,
  statuses,
  errors,
  onFieldChange,
}: CommandConfigFormProps) {
  const { t } = useTranslation('commands');

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <CommandConfigSection key={group.titleKey} title={t(group.titleKey)}>
          {group.fields.map((field) => (
            <CommandConfigField
              key={field.key}
              field={field}
              value={getValueByPath(commandConfig, field.key)}
              status={statuses[field.key] ?? 'idle'}
              error={errors[field.key] ?? null}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </CommandConfigSection>
      ))}
    </div>
  );
}
