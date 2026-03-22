import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../stores';
import { useTelegram } from '../../hooks/useTelegram';
import {
  commandConfigSchema,
  type CommandConfigFieldSchema,
} from '../../config/commandConfigSchema';
import {
  fetchUserCommandConfig,
  patchCommandConfig,
  type UserCommandConfig,
} from '../../services/commandConfigApi';
import CommandConfigSection from '../../components/command-config/CommandConfigSection';
import CommandConfigForm from '../../components/command-config/CommandConfigForm';
import type { FieldSaveState } from '../../components/command-config/CommandConfigField';

const USER_COMMAND_CONFIG_QUERY_KEY = ['user-command-config'];

function buildPatchFromPath(path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  const root: Record<string, unknown> = {};
  let cursor = root;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLeaf = index === parts.length - 1;
    if (isLeaf) {
      cursor[part] = value;
    } else {
      cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
  }

  return root;
}

function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const copy = structuredClone(obj);
  const parts = path.split('.');
  let cursor: Record<string, unknown> = copy;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLeaf = index === parts.length - 1;
    if (isLeaf) {
      cursor[part] = value;
    } else {
      const next = cursor[part];
      if (!next || typeof next !== 'object') {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
  }

  return copy;
}

function validateField(field: CommandConfigFieldSchema, value: unknown, t: (k: string, o?: Record<string, unknown>) => string): string | null {
  if (field.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return t('invalid_number');
    }
    if (typeof field.min === 'number' && value < field.min) {
      return t('min_value', { min: field.min });
    }
    if (typeof field.max === 'number' && value > field.max) {
      return t('max_value', { max: field.max });
    }
  }

  if (field.type === 'select' && field.options?.length) {
    if (!field.options.includes(String(value))) {
      return t('invalid_option');
    }
  }

  if (field.type === 'text' && typeof value === 'string' && !value.trim()) {
    return t('field_required');
  }

  return null;
}

export default function CommandConfigPage() {
  const { userId, command } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation('commands');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [statuses, setStatuses] = useState<Record<string, FieldSaveState>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const schemaEntry = command ? commandConfigSchema[command] : undefined;

  const { data, isLoading } = useQuery({
    queryKey: USER_COMMAND_CONFIG_QUERY_KEY,
    queryFn: fetchUserCommandConfig,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (params: { fieldKey: string; nextValue: unknown; payload: Record<string, unknown> }) => {
      if (!command) return;
      await patchCommandConfig(command, params.payload);
    },
  });

  const commandConfig = useMemo(() => {
    if (!command) return {};
    return (data?.commands?.[command] ?? {}) as Record<string, unknown>;
  }, [command, data]);

  const handleFieldChange = async (field: CommandConfigFieldSchema, nextValue: unknown) => {
    if (!command) return;

    const validationError = validateField(field, nextValue, t);
    setErrors((prev) => ({ ...prev, [field.key]: validationError }));
    if (validationError) {
      setStatuses((prev) => ({ ...prev, [field.key]: 'error' }));
      return;
    }

    setStatuses((prev) => ({ ...prev, [field.key]: 'modified' }));

    const payload = buildPatchFromPath(field.key, nextValue);

    const prevData = queryClient.getQueryData<UserCommandConfig>(USER_COMMAND_CONFIG_QUERY_KEY);
    queryClient.setQueryData<UserCommandConfig>(USER_COMMAND_CONFIG_QUERY_KEY, (current) => {
      const base = current ?? { commands: {} };
      const currentCmd = (base.commands[command] ?? {}) as Record<string, unknown>;
      const updatedCmd = setByPath(currentCmd, field.key, nextValue);
      return {
        ...base,
        commands: {
          ...base.commands,
          [command]: updatedCmd,
        },
      };
    });

    setStatuses((prev) => ({ ...prev, [field.key]: 'saving' }));

    try {
      await mutation.mutateAsync({ fieldKey: field.key, nextValue, payload });
      setStatuses((prev) => ({ ...prev, [field.key]: 'saved' }));

      if (saveTimers.current[field.key]) {
        clearTimeout(saveTimers.current[field.key]);
      }
      saveTimers.current[field.key] = setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [field.key]: 'idle' }));
      }, 1400);
    } catch {
      if (prevData) queryClient.setQueryData(USER_COMMAND_CONFIG_QUERY_KEY, prevData);
      setStatuses((prev) => ({ ...prev, [field.key]: 'error' }));
      showToast(t('common:save_error'), 'error');
      haptic?.notificationOccurred('error');
    }
  };

  if (!schemaEntry) {
    return (
      <main className="pb-24 px-5 pt-10 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto bg-tg-text/[0.03] border border-tg-border/30 rounded-full flex items-center justify-center mb-4">
          <Settings2 size={32} className="text-tg-hint/30" />
        </div>
        <p className="text-[16px] font-extrabold text-tg-text mb-1">Comando no encontrado</p>
        <p className="text-[14px] font-medium text-tg-hint/80 leading-relaxed max-w-[250px] mx-auto">
          {t('command_config_not_found')}
        </p>
      </main>
    );
  }

  return (
    <main className="pb-24 animate-fade-in relative">
      
      {/* ── Cabecera (App Header) ── */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3.5">
        <button
          onClick={() => {
            haptic?.impactOccurred('light');
            navigate(`/users/ui/${userId}/commands`);
          }}
          className="w-10 h-10 rounded-full bg-tg-text/[0.02] border border-tg-border/40 flex items-center justify-center flex-shrink-0 active:scale-90 hover:bg-tg-text/[0.06] transition-all"
          aria-label={t('back_to_commands')}
        >
          <ArrowLeft size={18} className="text-tg-text" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold text-tg-text tracking-tight leading-none truncate">
            {schemaEntry.title}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] font-bold font-mono text-tg-accent bg-tg-accent/10 px-2 py-0.5 rounded-[6px]">
              /{command}
            </span>
            <span className="text-[13px] font-medium text-tg-hint">
              {t('settings_label')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tarjeta Descriptiva (Bento Info) ── */}
      <div className="px-5 mb-6">
        <div className="bg-tg-text/[0.02] border border-tg-border/30 rounded-[16px] p-4 flex gap-3 items-start shadow-inner">
          <div className="w-8 h-8 rounded-[10px] bg-tg-secondary border border-tg-border/50 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
            <Settings2 size={16} className="text-tg-hint/80" />
          </div>
          <p className="text-[13px] font-medium text-tg-text/90 leading-relaxed pt-1">
            {schemaEntry.description}
          </p>
        </div>
      </div>

      {/* ── Área de Formulario ── */}
      <div className="px-5">
        <CommandConfigSection title={t('configuration_label')} description={t('real_time_save_desc')}>
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="p-5 space-y-4">
              <div className="h-4 w-1/3 bg-tg-text/[0.05] rounded animate-pulse" />
              <div className="h-10 w-full bg-tg-text/[0.05] rounded-[14px] animate-pulse" />
              <div className="h-4 w-1/4 bg-tg-text/[0.05] rounded animate-pulse mt-6" />
              <div className="h-10 w-full bg-tg-text/[0.05] rounded-[14px] animate-pulse" />
            </div>
          ) : (
            <CommandConfigForm
              fields={schemaEntry.fields}
              commandConfig={commandConfig}
              statuses={statuses}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          )}
        </CommandConfigSection>
      </div>
      
    </main>
  );
}