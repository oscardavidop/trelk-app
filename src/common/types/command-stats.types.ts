export type Badge = 'power_user' | 'active_user' | 'new_user';

export interface CommandStatsResult {
  rating: number;
  ratingsCount: number;
  weeklyUses: number;
  favorites: number;
}

export interface RankingEntry {
  command: string;
  weeklyUses: number;
  favorites: number;
  trendingScore: number;
  popularScore: number;
}

export interface CommandRankingsResult {
  generatedAt: number;
  trending: RankingEntry[];
  popular: RankingEntry[];
}

export interface ReviewsSummary {
  avgRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}
