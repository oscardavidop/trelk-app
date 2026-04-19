/// <reference types="vite/client" />

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  version: string;
  ready: () => void;
  close: () => void;
  expand: () => void;
  platform: string;
  isActive: boolean;
  isVersionAtLeast: (version: string) => boolean;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
  disableVerticalSwipes: () => void;
  requestFullscreen: () => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons: Array<{ type: string; id?: string; text?: string }>;
  }, callback?: (id: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  MainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (state: boolean) => void;
    hideProgress: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
    setParams: (params: { color?: string }) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  requestWriteAccess: (callback: () => void) => void;
  onEvent: (event: string, callback: () => void) => void;
  offEvent: (event: string, callback: () => void) => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

interface ImportMetaEnv {
  readonly VITE_UNDO_MODE?: 'aware' | 'persistent' = 'persistent';
  readonly VITE_UNDO_DELAY_MS?: string;
  readonly VITE_UNDO_MAX_STACK?: string;
  readonly VITE_API_URL_PROD?: string = 'https://api-telegram-prod.trelkbot.com';
  readonly VITE_API_URL_DEV?: string = 'https://apps-telegram.trelkbot.com';
  readonly ENV: 'production' | 'development' = 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
