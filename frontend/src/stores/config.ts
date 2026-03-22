import { create } from 'zustand';
import {
  fetchConfig,
  upsertPremiumCommand,
  deletePremiumCommand as apiDeletePremiumCommand,
  patchLocale,
  type UserConfig,
  type LocaleConfig,
} from '../services/configApi';

interface ConfigState {
  config: UserConfig | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  patchConfig: (partial: Partial<UserConfig>) => void;
  savePremiumCommand: (key: string, alias: string) => Promise<void>;
  removePremiumCommand: (key: string) => Promise<void>;
  saveLocale: (locale: Partial<LocaleConfig>) => Promise<{ ok: boolean; error?: string }>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchConfig();
      if (res.ok) {
        set({ config: { ...res.config, ...res.preferences}, loading: false });
      } else {
        set({ error: 'Failed to load config', loading: false });
      }
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  patchConfig: (partial) => {
    set((s) => {
      if (!s.config) return s;
      return { config: { ...s.config, ...partial } };
    });
  },

  savePremiumCommand: async (key, alias) => {
    await upsertPremiumCommand(key, alias);
    set((s) => {
      if (!s.config) return s;
      return {
        config: {
          ...s.config,
          premium_commands: {
            ...s.config.premium_commands,
            [key]: { alias, created_at: new Date().toISOString() },
          },
        },
      };
    });
  },

  removePremiumCommand: async (key) => {
    await apiDeletePremiumCommand(key);
    set((s) => {
      if (!s.config) return s;
      const copy = { ...s.config.premium_commands };
      delete copy[key];
      return { config: { ...s.config, premium_commands: copy } };
    });
  },

  saveLocale: async (locale) => {
    const result = await patchLocale(locale);
    set((s) => {
      if (!s.config) return s;
      return {
        config: {
          ...s.config,
          locale: { ...s.config.locale, ...locale },
        },
      };
    });
    return result;
  },
}));
