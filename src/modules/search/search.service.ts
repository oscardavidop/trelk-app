import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History } from '../history/schemas/history.schema';
import { BOT_COMMANDS, BotCommand } from '../../data/bot-commands';
import { RedisCacheService } from '../redis/redis-cache.service';

export interface SearchResult {
  command: string;
  name: string;
  category: string;
  description: string;
  score: number;
  matchType: 'exact' | 'prefix' | 'contains' | 'alias' | 'fuzzy';
}

export interface SearchResponse {
  results: SearchResult[];
  intent: { type: string; value?: string } | null;
  trending: string[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private commandIndex: Map<string, BotCommand> = new Map();

  constructor(
    @InjectModel(History.name, 'mbot') private readonly historyModel: Model<any>,
    private readonly redis: RedisCacheService,
  ) {
    // Build in-memory index
    for (const cmd of BOT_COMMANDS) {
      this.commandIndex.set(cmd.uniqueName, cmd);
    }
  }

  /** Search commands with intent detection and scoring */
  async search(query: string, userId?: number): Promise<SearchResponse> {
    const q = query.trim().toLowerCase();
    if (!q) return { results: [], intent: null, trending: await this.getTrending() };

    // ── Intent detection ──
    const intent = this.detectIntent(q);

    // ── Score all commands ──
    const scored: SearchResult[] = [];
    for (const cmd of BOT_COMMANDS) {
      const result = this.scoreCommand(cmd, q);
      if (result) scored.push(result);
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Boost commands user has used before
    if (userId) {
      const userHistory = await this.getUserCommandHistory(userId);
      for (const r of scored) {
        if (userHistory.has(r.command)) {
          r.score += 5; // personal relevance boost
        }
      }
      scored.sort((a, b) => b.score - a.score);
    }

    // Track search for trending
    await this.trackSearch(q);

    return {
      results: scored.slice(0, 20),
      intent,
      trending: await this.getTrending(),
    };
  }

  /** Get trending searches from Redis */
  async getTrending(): Promise<string[]> {
    const cached = await this.redis.get<string[]>('search:trending');
    if (cached) return cached;

    // Fallback: top commands by recent history
    try {
      const results = await this.historyModel.aggregate([
        { $match: { type: 'command', timestamp: { $gte: Date.now() - 24 * 60 * 60 * 1000 } } },
        { $group: { _id: '$command', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]).exec();
      const trending = results.map((r: any) => r._id).filter(Boolean);
      await this.redis.set('search:trending', trending, 300); // 5 min cache
      return trending;
    } catch {
      return [];
    }
  }

  /** Get recent searches for user */
  async getRecentSearches(userId: number): Promise<string[]> {
    const key = `search:recent:${userId}`;
    return (await this.redis.get<string[]>(key)) ?? [];
  }

  /** Track a search query */
  private async trackSearch(query: string): Promise<void> {
    const key = `search:count:${query}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400); // 24h
  }

  /** Save search to user's recent */
  async saveRecentSearch(userId: number, query: string): Promise<void> {
    const key = `search:recent:${userId}`;
    let recent = (await this.redis.get<string[]>(key)) ?? [];
    recent = [query, ...recent.filter(r => r !== query)].slice(0, 10);
    await this.redis.set(key, recent, 604800); // 7 days
  }

  // ── Internal scoring ──

  private scoreCommand(cmd: BotCommand, query: string): SearchResult | null {
    const names = cmd.name.map(n => n.toLowerCase());
    const aliases = cmd.alias.map(a => a.toLowerCase());
    const desc = (cmd.description || '').toLowerCase();
    const cat = (cmd.category || '').toLowerCase();
    const unique = cmd.uniqueName.toLowerCase();

    let score = 0;
    let matchType: SearchResult['matchType'] = 'fuzzy';

    // Exact match on uniqueName or primary name
    if (unique === query || names.includes(query)) {
      score = 100;
      matchType = 'exact';
    }
    // Alias exact match
    else if (aliases.includes(query)) {
      score = 90;
      matchType = 'alias';
    }
    // Prefix match
    else if (unique.startsWith(query) || names.some(n => n.startsWith(query))) {
      score = 70;
      matchType = 'prefix';
    }
    // Contains match
    else if (unique.includes(query) || names.some(n => n.includes(query))) {
      score = 50;
      matchType = 'contains';
    }
    // Alias contains
    else if (aliases.some(a => a.includes(query))) {
      score = 40;
      matchType = 'alias';
    }
    // Description match
    else if (desc.includes(query)) {
      score = 30;
      matchType = 'contains';
    }
    // Category match
    else if (cat.includes(query)) {
      score = 20;
      matchType = 'contains';
    }
    // Fuzzy: check if all chars of query appear in order
    else {
      const fuzzyScore = this.fuzzyMatch(query, unique);
      if (fuzzyScore > 0.5) {
        score = Math.round(fuzzyScore * 15);
        matchType = 'fuzzy';
      }
    }

    if (score === 0) return null;

    return {
      command: cmd.uniqueName,
      name: cmd.name[0] || cmd.uniqueName,
      category: cmd.category || 'uncategorized',
      description: cmd.description || '',
      score,
      matchType,
    };
  }

  private fuzzyMatch(query: string, target: string): number {
    let qi = 0;
    let consecutive = 0;
    let maxConsecutive = 0;

    for (let i = 0; i < target.length && qi < query.length; i++) {
      if (target[i] === query[qi]) {
        qi++;
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else {
        consecutive = 0;
      }
    }

    if (qi < query.length) return 0;
    return (qi / query.length) * 0.5 + (maxConsecutive / query.length) * 0.5;
  }

  private detectIntent(query: string): { type: string; value?: string } | null {
    // Category intent: "juegos", "entertainment", "utilities"
    const categoryMap: Record<string, string> = {
      juegos: 'entertainment', games: 'entertainment', juego: 'entertainment',
      diversion: 'fun', fun: 'fun', entretenimiento: 'entertainment',
      utilidades: 'utilities', tools: 'utilities', herramientas: 'utilities',
      musica: 'entertainment', music: 'entertainment',
      descargar: 'utilities', download: 'utilities',
      sticker: 'fun', stickers: 'fun',
    };

    if (categoryMap[query]) {
      return { type: 'category', value: categoryMap[query] };
    }

    // Action intent: "how to", "como usar"
    if (query.startsWith('como') || query.startsWith('how')) {
      return { type: 'help', value: query.replace(/^(como usar|como|how to use|how to)\s*/i, '') };
    }

    return null;
  }

  private async getUserCommandHistory(userId: number): Promise<Set<string>> {
    const key = `search:userhist:${userId}`;
    const cached = await this.redis.get<string[]>(key);
    if (cached) return new Set(cached);

    try {
      const results = await this.historyModel.distinct('command', {
        userId,
        type: 'command',
        timestamp: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 },
      }).exec();
      await this.redis.set(key, results, 600); // 10 min cache
      return new Set(results);
    } catch {
      return new Set();
    }
  }
}
