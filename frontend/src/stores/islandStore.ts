import { create } from 'zustand';

interface IslandState {
  visible: boolean
  hide: () => void
  show: () => void
  toggle: (v: boolean) => void
}

export const useIslandStore = create<IslandState>((set) => ({
  visible: true,

  hide: () => set({ visible: false }),

  show: () => set({ visible: true }),

  toggle: (v) => set({ visible: v }),
}));
