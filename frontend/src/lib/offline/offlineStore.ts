import { create } from 'zustand';
import { processQueue, getPendingCount } from './syncQueue';

interface OfflineState {
  isOnline: boolean;
  pendingSyncs: number;
  syncing: boolean;
  setOnline: (v: boolean) => void;
  setPendingSyncs: (v: number) => void;
  setSyncing: (v: boolean) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncs: 0,
  syncing: false,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingSyncs: (pendingSyncs) => set({ pendingSyncs }),
  setSyncing: (syncing) => set({ syncing }),
}));

/** Initialize offline listeners. Call once in App. */
export function initOfflineListeners(): () => void {
  const { setOnline, setPendingSyncs, setSyncing } = useOfflineStore.getState();

  const handleOnline = async () => {
    setOnline(true);
    // Auto-sync when coming back online
    setSyncing(true);
    try {
      await processQueue();
      const count = await getPendingCount();
      setPendingSyncs(count);
    } finally {
      setSyncing(false);
    }
  };

  const handleOffline = () => {
    setOnline(false);
  };

  // Check pending syncs on init
  getPendingCount().then(setPendingSyncs);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
