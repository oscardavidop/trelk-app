import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings2, Package, Link, Video, Zap, type LucideIcon } from 'lucide-react';
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
import CommandConfigForm from '../../components/command-config/CommandConfigForm';
import type { FieldSaveState } from '../../components/command-config/CommandConfigField';
import StickyHeader from '../../components/StickyHeader';
import { staggerContainer, staggerItem } from '../../design';

const USER_COMMAND_CONFIG_QUERY_KEY = ['user-command-config'];

const ICON_MAP: Record<string, LucideIcon> = {
  package: Package,
  link: Link,
  video: Video,
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
};

function buildPatchFromPath(path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  const root: Record<string, unknown> = {};
  let cursor = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
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

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      cursor[part] = value;
    } else {
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
  }

  return copy;
}

function validateField(field: CommandConfigFieldSchema, value: unknown, t: (k: string, o?: Record<string, unknown>) => string): string | null {
  if (field.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) return t('invalid_number');
    if (typeof field.min === 'number' && value < field.min) return t('min_value', { min: field.min });
    if (typeof field.max === 'number' && value > field.max) return t('max_value', { max: field.max });
  }

  if (field.type === 'select' && field.options?.length) {
    if (!field.options.some((opt) => opt.value === String(value))) return t('invalid_option');
  }

  if (field.type === 'text' && typeof value === 'string' && !value.trim()) return t('field_required');

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
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const saveField = async (field: CommandConfigFieldSchema, nextValue: unknown) => {
    if (!command) return;

    const payload = buildPatchFromPath(field.key, nextValue);
    const prevData = queryClient.getQueryData<UserCommandConfig>(USER_COMMAND_CONFIG_QUERY_KEY);

    setStatuses((prev) => ({ ...prev, [field.key]: 'saving' }));

    try {
      await mutation.mutateAsync({ fieldKey: field.key, nextValue, payload });
      setStatuses((prev) => ({ ...prev, [field.key]: 'saved' }));
      if (saveTimers.current[field.key]) clearTimeout(saveTimers.current[field.key]);
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

  const handleFieldChange = (field: CommandConfigFieldSchema, nextValue: unknown) => {
    if (!command) return;

    const validationError = validateField(field, nextValue, t);
    setErrors((prev) => ({ ...prev, [field.key]: validationError }));
    if (validationError) {
      setStatuses((prev) => ({ ...prev, [field.key]: 'error' }));
      return;
    }

    setStatuses((prev) => ({ ...prev, [field.key]: 'modified' }));

    // Optimistic local update
    queryClient.setQueryData<UserCommandConfig>(USER_COMMAND_CONFIG_QUERY_KEY, (current) => {
      const base = current ?? { commands: {} };
      const currentCmd = (base.commands[command] ?? {}) as Record<string, unknown>;
      return {
        ...base,
        commands: { ...base.commands, [command]: setByPath(currentCmd, field.key, nextValue) },
      };
    });

    // Save immediately for boolean/select, debounce 600ms for text/number
    const needsDebounce = field.type === 'number' || field.type === 'text';
    if (needsDebounce) {
      if (debounceTimers.current[field.key]) clearTimeout(debounceTimers.current[field.key]);
      debounceTimers.current[field.key] = setTimeout(() => saveField(field, nextValue), 600);
    } else {
      saveField(field, nextValue);
    }
  };

  if (!schemaEntry) {
    return (
      <main className="pb-24 px-5 pt-10 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto bg-tg-text/[0.03] border border-tg-border/30 rounded-full flex items-center justify-center mb-4">
          <Settings2 size={32} className="text-tg-hint/30" />
        </div>
        <p className="text-[16px] font-extrabold text-tg-text mb-1">{t('command_not_found')}</p>
        <p className="text-[14px] font-medium text-tg-hint/80 leading-relaxed max-w-[250px] mx-auto">
          {t('command_config_not_found')}
        </p>
      </main>
    );
  }

  const Icon = ICON_MAP[schemaEntry.icon] ?? Settings2;
  const colors = COLOR_MAP[schemaEntry.color] ?? COLOR_MAP.emerald;

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="pb-24 relative max-w-[480px] mx-auto"
    >
      {/* ── Header with back + icon ── */}
      <div className="px-5 pt-5 pb-3">
        <motion.div variants={staggerItem} className="flex items-center gap-3.5">
          <button
            onClick={() => { haptic?.impactOccurred('light'); navigate(-1); }}
            className="w-10 h-10 rounded-full bg-tg-secondary/60 border border-tg-border/30 flex items-center justify-center shrink-0 active:scale-90 hover:bg-tg-secondary transition-all"
            aria-label={t('back_to_commands')}
          >
            <ArrowLeft size={18} className="text-tg-text" />
          </button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-11 h-11 rounded-[14px] ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon size={22} className={colors.text} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold text-tg-text tracking-tight leading-none truncate">
                {t(schemaEntry.titleKey)}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[12px] font-bold font-mono text-tg-accent bg-tg-accent/10 px-2 py-0.5 rounded-[6px] border border-tg-accent/15">
                  /{command}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Description card ── */}
      <motion.div variants={staggerItem} className="px-5 mb-6">
        <div className="bg-tg-secondary/50 backdrop-blur-xl border border-tg-border/20 rounded-[18px] p-4 shadow-sm">
          <p className="text-[13px] font-medium text-tg-text/90 leading-relaxed">
            {t(schemaEntry.descriptionKey)}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <Zap size={11} className="text-tg-accent" />
            <span className="text-[11px] font-semibold text-tg-accent/80">{t('real_time_save_desc')}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Form ── */}
      <motion.div variants={staggerItem} className="px-5">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[20px] bg-tg-secondary/60 border border-tg-border/30 p-5 space-y-4 animate-pulse">
                <div className="h-3 w-24 bg-tg-text/[0.06] rounded" />
                <div className="space-y-3">
                  <div className="h-4 w-1/3 bg-tg-text/[0.05] rounded" />
                  <div className="h-2.5 w-2/3 bg-tg-text/[0.04] rounded" />
                  <div className="h-[48px] w-full bg-tg-text/[0.04] rounded-[14px]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CommandConfigForm
            groups={schemaEntry.groups}
            commandConfig={commandConfig}
            statuses={statuses}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )}
      </motion.div>
    </motion.main>
  );
}