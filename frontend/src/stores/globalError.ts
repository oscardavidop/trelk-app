import { create } from 'zustand';

type ErrorSeverity = 'warning' | 'critical';

interface GlobalErrorState {
  message: string | null;
  severity: ErrorSeverity;
  visible: boolean;
  retryFn: (() => void) | null;
  show: (message: string, severity?: ErrorSeverity, retryFn?: () => void) => void;
  dismiss: () => void;
}

export const useGlobalErrorStore = create<GlobalErrorState>((set) => ({
  message: null,
  severity: 'warning',
  visible: false,
  retryFn: null,
  show: (message, severity = 'warning', retryFn = undefined) => {
    set({ message, severity, visible: true, retryFn: retryFn ?? null });
    if (severity === 'warning') {
      setTimeout(() => set({ visible: false }), 4000);
      setTimeout(() => set({ message: null, retryFn: null }), 4300);
    }
  },
  dismiss: () => {
    set({ visible: false });
    setTimeout(() => set({ message: null, retryFn: null }), 300);
  },
}));
