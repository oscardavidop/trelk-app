import { create } from 'zustand';
import { fetchGamification, type GamificationProfile, type MergedAchievement } from '../services/gamificationApi';

/* ─── Re-export types used by components ─── */
export type Achievement = MergedAchievement;

/* ─── XP Level Thresholds ─── */
const LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];

export function levelFromXP(xp: number): { level: number; currentXP: number; nextXP: number; progress: number } {
  let lvl = 1;
  for (let i = 1; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i]) lvl = i + 1;
    else break;
  }
  const floor = LEVELS[lvl - 1] ?? 0;
  const ceil = LEVELS[lvl] ?? LEVELS[LEVELS.length - 1] + 2000;
  const inLevel = xp - floor;
  const needed = ceil - floor;
  return { level: lvl, currentXP: inLevel, nextXP: needed, progress: Math.min(inLevel / needed, 1) };
}

/* ─── Store ─── */
interface GamificationState {
  xp: number;
  streak: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  levelProgress: number;
  achievements: Achievement[];
  loaded: boolean;
  loading: boolean;

  loadGamification: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>()((set, get) => ({
  xp: 0,
  streak: 0,
  level: 1,
  currentLevelXP: 0,
  nextLevelXP: 100,
  levelProgress: 0,
  achievements: [],
  loaded: false,
  loading: false,

  loadGamification: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await fetchGamification();
      set({
        xp: data.xp,
        streak: data.streak,
        level: data.level,
        currentLevelXP: data.currentLevelXP,
        nextLevelXP: data.nextLevelXP,
        levelProgress: data.levelProgress,
        achievements: data.achievements,
        loaded: true,
      });
    } catch {
      // keep previous state on error
    } finally {
      set({ loading: false });
    }
  },
}));
