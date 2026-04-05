import { create } from 'zustand';

interface SecurityState {
  pinEnabled: boolean;
  verified: boolean;
  isLocked: boolean;
  lockAfterMinutes: number;
  checking: boolean;

  setPinEnabled: (v: boolean) => void;
  setVerified: (v: boolean) => void;
  setIsLocked: (v: boolean) => void;
  setLockAfterMinutes: (v: number) => void;
  setChecking: (v: boolean) => void;
  reset: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  pinEnabled: false,
  verified: false,
  isLocked: false,
  lockAfterMinutes: 5,
  checking: true,

  setPinEnabled: (pinEnabled) => set({ pinEnabled }),
  setVerified: (verified) => set({ verified }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setLockAfterMinutes: (lockAfterMinutes) => set({ lockAfterMinutes }),
  setChecking: (checking) => set({ checking }),
  reset: () => set({ pinEnabled: false, verified: false, isLocked: false, checking: true }),
}));
