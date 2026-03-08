import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  visible: boolean;
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  visible: false,
  show: (message, type = 'info') => {
    set({ message, type, visible: true });
    setTimeout(() => set({ visible: false }), 2200);
    setTimeout(() => set({ message: null }), 2500);
  },
  hide: () => set({ visible: false }),
}));

interface UserState {
  user: {
    id: string;
    authTelegram: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    authUser: {
      lang?: string;
      tz?: string;
      auto_detect_lang?: boolean;
      await_args?: boolean;
      message_format?: boolean;
      emoji_replies?: boolean;
      chat_actions?: Record<string, boolean>;
      time_format?: string;
      share_username?: boolean;
      store_chat_history?: boolean;
      allow_data_usage?: boolean;
      notifications?: Record<string, boolean>;
      notify_semanal_stats?: boolean;
      large_text?: boolean;
      compact_mode?: boolean;
      [key: string]: unknown;
    };
  } | null;
  setUser: (user: UserState['user']) => void;
  updateSetting: (key: string, value: unknown) => void;
  updateConfig: (config: Record<string, unknown>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateSetting: (key, value) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          authUser: {
            ...state.user.authUser,
            [key]: value,
          },
        },
      };
    }),
  updateConfig: (config) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          authUser: {
            ...state.user.authUser,
            ...config,
          },
        },
      };
    }),
}));
