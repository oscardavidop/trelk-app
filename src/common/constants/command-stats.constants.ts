export const STATS_TTL = 120;           // 2min cache for aggregated stats
export const WEEKLY_TTL = 3600;          // 60min cache for weekly usage
export const RATING_LIMIT = 30;         // max ratings per hour
export const REPORT_LIMIT = 5;          // max reports per 10 minutes
export const REPORT_DEDUP_TTL = 86400;  // 24h dedup window
export const REVIEW_SUMMARY_TTL = 60;   // 60s cache for review summary
export const REVIEW_DAILY_LIMIT = 5;    // max reviews per day
export const SUMMARY_TEXT_TTL = 600;     // 10min cache for AI summary text

export const SPAM_BLACKLIST = ['muy bueno', 'good', 'nice', 'ok', 'excelente', 'great', 'cool', 'genial', 'perfecto', 'perfect', 'awesome', 'bueno', 'malo', 'bad'];
