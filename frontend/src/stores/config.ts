import { create } from 'zustand';
import {
  fetchConfig,
  upsertCommand,
  deleteCommand as apiDeleteCommand,
  upsertPremiumCommand,
  deletePremiumCommand as apiDeletePremiumCommand,
  patchLocale,
  type UserConfig,
  type CommandConfig,
  type LocaleConfig,
} from '../services/configApi';

interface ConfigState {
  config: UserConfig | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  saveCommand: (key: string, cmd: CommandConfig) => Promise<void>;
  removeCommand: (key: string) => Promise<void>;
  savePremiumCommand: (key: string, alias: string) => Promise<void>;
  removePremiumCommand: (key: string) => Promise<void>;
  saveLocale: (locale: Partial<LocaleConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchConfig();
      if (res.ok) {
        set({ config: res.config, loading: false });
      } else {
        set({ error: 'Failed to load config', loading: false });
      }
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  saveCommand: async (key, cmd) => {
    await upsertCommand(key, cmd);
    // optimistic update
    set((s) => {
      if (!s.config) return s;
      return {
        config: {
          ...s.config,
          commands: { ...s.config.commands, [key]: cmd },
        },
      };
    });
  },

  removeCommand: async (key) => {
    await apiDeleteCommand(key);
    set((s) => {
      if (!s.config) return s;
      const copy = { ...s.config.commands };
      delete copy[key];
      return { config: { ...s.config, commands: copy } };
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
    await patchLocale(locale);
    set((s) => {
      if (!s.config) return s;
      return {
        config: {
          ...s.config,
          locale: { ...s.config.locale, ...locale },
        },
      };
    });
  },
}));
