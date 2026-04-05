import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  visible: boolean;
  /** Optional retry callback — shown as a retry button in the toast */
  retryFn: (() => void) | null;
  /** Toast display duration in ms (default 2200) */
  duration: number;
  show: (message: string, type?: 'success' | 'error' | 'info', opts?: { retryFn?: () => void; duration?: number }) => void;
  hide: () => void;
}

let _hideTimer: ReturnType<typeof setTimeout> | undefined;
let _clearTimer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  visible: false,
  retryFn: null,
  duration: 2200,
  show: (message, type = 'info', opts) => {
    clearTimeout(_hideTimer);
    clearTimeout(_clearTimer);
    const duration = opts?.duration ?? (type === 'error' ? 3500 : 2200);
    set({ message, type, visible: true, retryFn: opts?.retryFn ?? null, duration });
    _hideTimer = setTimeout(() => set({ visible: false }), duration);
    _clearTimer = setTimeout(() => set({ message: null, retryFn: null }), duration + 300);
  },
  hide: () => {
    clearTimeout(_hideTimer);
    clearTimeout(_clearTimer);
    set({ visible: false });
    _clearTimer = setTimeout(() => set({ message: null, retryFn: null }), 300);
  },
}));

interface UserState {
  user: {
    id: string;
    isAdmin?: boolean;
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
