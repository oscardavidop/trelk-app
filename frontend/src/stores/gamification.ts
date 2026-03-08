import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─── Types ─── */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  goal: number;
  rewardXP: number;
  rewardLabel: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface HistoryEntry {
  id: string;
  type: 'command' | 'favorite_added' | 'achievement';
  command?: string;
  args?: string;
  item?: string;
  achievementName?: string;
  date: string;       // ISO
  timestamp: number;
}

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

/* ─── Mock achievements ─── */
const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_command', name: 'First Command', description: 'Usa un comando por primera vez', icon: '🏆', progress: 1, goal: 1, rewardXP: 50, rewardLabel: 'Badge Pionero', unlocked: true, unlockedAt: '2026-03-07T10:00:00Z' },
  { id: 'collector_10', name: 'Collector', description: 'Guarda 10 favoritos', icon: '⭐', progress: 4, goal: 10, rewardXP: 100, rewardLabel: '+5 solicitudes IA diarias', unlocked: false },
  { id: 'power_user', name: 'Power User', description: 'Usa 100 comandos', icon: '🚀', progress: 23, goal: 100, rewardXP: 200, rewardLabel: 'Badge Power User', unlocked: false },
  { id: 'explorer', name: 'Explorer', description: 'Prueba 10 comandos diferentes', icon: '🔥', progress: 6, goal: 10, rewardXP: 150, rewardLabel: 'Tema exclusivo', unlocked: false },
  { id: 'veteran', name: 'Veteran', description: 'Usa la app 7 días seguidos', icon: '💎', progress: 3, goal: 7, rewardXP: 300, rewardLabel: 'Badge Diamond', unlocked: false },
  { id: 'social_star', name: 'Social Star', description: 'Comparte 5 comandos con amigos', icon: '🌟', progress: 1, goal: 5, rewardXP: 100, rewardLabel: 'Badge Social', unlocked: false },
  { id: 'linguist', name: 'Lingüista', description: 'Traduce en 5 idiomas distintos', icon: '🌐', progress: 2, goal: 5, rewardXP: 120, rewardLabel: '+3 traducciones diarias', unlocked: false },
  { id: 'night_owl', name: 'Night Owl', description: 'Usa la app después de medianoche', icon: '🦉', progress: 1, goal: 1, rewardXP: 50, rewardLabel: 'Badge Nocturno', unlocked: true, unlockedAt: '2026-03-06T01:30:00Z' },
  { id: 'ai_master', name: 'AI Master', description: 'Haz 50 consultas a ChatGPT', icon: '🤖', progress: 12, goal: 50, rewardXP: 250, rewardLabel: '+10 consultas IA diarias', unlocked: false },
  { id: 'speed_runner', name: 'Speed Runner', description: 'Usa 5 comandos en 1 minuto', icon: '⚡', progress: 0, goal: 5, rewardXP: 80, rewardLabel: 'Badge Rayo', unlocked: false },
  { id: 'music_lover', name: 'Music Lover', description: 'Reproduce 20 canciones', icon: '🎵', progress: 8, goal: 20, rewardXP: 150, rewardLabel: 'Badge Melómano', unlocked: false },
  { id: 'daily_streak', name: 'On Fire', description: 'Mantén racha de 14 días', icon: '🔥', progress: 3, goal: 14, rewardXP: 500, rewardLabel: 'Badge On Fire + 20 IA', unlocked: false },
];

/* ─── Mock history ─── */
const now = Date.now();
const h = (mins: number) => now - mins * 60_000;

const INITIAL_HISTORY: HistoryEntry[] = [
  { id: '1', type: 'command', command: '/play', args: 'Linkin Park - Numb', date: new Date(h(30)).toISOString(), timestamp: h(30) },
  { id: '2', type: 'command', command: '/ssweb', args: 'google.com', date: new Date(h(55)).toISOString(), timestamp: h(55) },
  { id: '3', type: 'favorite_added', item: 'Wallpaper cyberpunk', date: new Date(h(80)).toISOString(), timestamp: h(80) },
  { id: '4', type: 'command', command: '/translate', args: 'en Hello world', date: new Date(h(120)).toISOString(), timestamp: h(120) },
  { id: '5', type: 'command', command: '/chatgpt', args: '¿Qué es un agujero negro?', date: new Date(h(180)).toISOString(), timestamp: h(180) },
  { id: '6', type: 'command', command: '/img', args: 'sunset mountain', date: new Date(h(300)).toISOString(), timestamp: h(300) },
  { id: '7', type: 'command', command: '/play', args: 'The Weeknd - Blinding Lights', date: new Date(h(1500)).toISOString(), timestamp: h(1500) },
  { id: '8', type: 'favorite_added', item: 'Logo minimalista', date: new Date(h(1600)).toISOString(), timestamp: h(1600) },
  { id: '9', type: 'command', command: '/weather', args: 'Madrid', date: new Date(h(1700)).toISOString(), timestamp: h(1700) },
  { id: '10', type: 'command', command: '/translate', args: 'fr Bonjour le monde', date: new Date(h(2800)).toISOString(), timestamp: h(2800) },
  { id: '11', type: 'command', command: '/dl', args: 'https://youtube.com/watch?v=abc', date: new Date(h(3000)).toISOString(), timestamp: h(3000) },
  { id: '12', type: 'achievement', achievementName: 'Night Owl', date: new Date(h(3200)).toISOString(), timestamp: h(3200) },
];

/* ─── Store ─── */
interface GamificationState {
  xp: number;
  streak: number;
  lastActiveDate: string;
  achievements: Achievement[];
  history: HistoryEntry[];
  recentCommands: string[];

  // XP toast
  xpToast: { amount: number; label: string } | null;
  clearXpToast: () => void;

  addXP: (amount: number, label?: string) => void;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'date' | 'timestamp'>) => void;
  unlockAchievement: (id: string) => void;
  incrementAchievement: (id: string, by?: number) => void;
  addRecentCommand: (cmd: string) => void;
  updateStreak: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 220,
      streak: 3,
      lastActiveDate: new Date().toISOString().split('T')[0],
      achievements: INITIAL_ACHIEVEMENTS,
      history: INITIAL_HISTORY,
      recentCommands: ['/play', '/translate', '/ssweb', '/chatgpt', '/img'],

      xpToast: null,
      clearXpToast: () => set({ xpToast: null }),

      addXP: (amount, label = 'XP ganado') => {
        set((s) => ({ xp: s.xp + amount, xpToast: { amount, label } }));
        // Auto-clear toast
        setTimeout(() => get().clearXpToast(), 2500);
      },

      addHistory: (entry) => {
        const full: HistoryEntry = {
          ...entry,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          timestamp: Date.now(),
        };
        set((s) => ({
          history: [full, ...s.history].slice(0, 100),
        }));
      },

      unlockAchievement: (id) => {
        set((s) => ({
          achievements: s.achievements.map((a) =>
            a.id === id ? { ...a, unlocked: true, progress: a.goal, unlockedAt: new Date().toISOString() } : a,
          ),
        }));
      },

      incrementAchievement: (id, by = 1) => {
        set((s) => ({
          achievements: s.achievements.map((a) => {
            if (a.id !== id || a.unlocked) return a;
            const next = Math.min(a.progress + by, a.goal);
            return { ...a, progress: next, unlocked: next >= a.goal, unlockedAt: next >= a.goal ? new Date().toISOString() : undefined };
          }),
        }));
      },

      addRecentCommand: (cmd) => {
        set((s) => ({
          recentCommands: [cmd, ...s.recentCommands.filter((c) => c !== cmd)].slice(0, 10),
        }));
      },

      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastActiveDate, streak } = get();
        if (lastActiveDate === today) return;
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
        set({
          lastActiveDate: today,
          streak: lastActiveDate === yesterday ? streak + 1 : 1,
        });
      },
    }),
    { name: 'trelk-gamification' },
  ),
);
