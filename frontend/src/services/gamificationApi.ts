const BASE = '/api/v1/ui/gamification';

export interface MergedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  rewardXP: number;
  rewardLabel: string;
  category?: string;
  resetInterval?: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GamificationProfile {
  xp: number;
  streak: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  levelProgress: number;
  achievements: MergedAchievement[];
}

export interface RankingEntry {
  rank: number;
  userId: number;
  xp: number;
  level: number;
  streak: number;
}

export async function fetchGamification(): Promise<GamificationProfile> {
  const res = await fetch(BASE, { credentials: 'include' });
  if (!res.ok) throw new Error(`gamification ${res.status}`);
  return res.json();
}

export async function fetchAchievements(
  filter: 'all' | 'unlocked' | 'pending' = 'all',
): Promise<MergedAchievement[]> {
  const res = await fetch(`${BASE}/achievements?filter=${filter}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`achievements ${res.status}`);
  return res.json();
}

export async function fetchRankings(limit = 10): Promise<RankingEntry[]> {
  const res = await fetch(`${BASE}/rankings?limit=${limit}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`rankings ${res.status}`);
  return res.json();
}
