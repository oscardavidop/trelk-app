/**
 * Confidence metadata types for API responses.
 * Tells the frontend how reliable the data is.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceMeta {
  level: ConfidenceLevel;
  score: number; // 0-1
  basedOn: number; // number of data points
  lastUpdated: number; // timestamp ms
  source?: 'cache' | 'live' | 'computed';
}

/**
 * Compute confidence level from a raw score.
 */
export function computeConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Build confidence metadata from data metrics.
 */
export function buildConfidence(opts: {
  dataPoints: number;
  lastUpdated?: number | Date;
  source?: 'cache' | 'live' | 'computed';
  /** Minimum data points for high confidence */
  highThreshold?: number;
  /** Minimum data points for medium confidence */
  mediumThreshold?: number;
}): ConfidenceMeta {
  const highTh = opts.highThreshold ?? 50;
  const medTh = opts.mediumThreshold ?? 10;
  const n = opts.dataPoints;

  // Score: sigmoid-like curve scaled to thresholds
  const rawScore = n >= highTh ? 1 : n >= medTh ? 0.4 + 0.6 * ((n - medTh) / (highTh - medTh)) : n > 0 ? 0.4 * (n / medTh) : 0;
  const score = Math.round(rawScore * 100) / 100;

  const lastUpdated = opts.lastUpdated instanceof Date
    ? opts.lastUpdated.getTime()
    : opts.lastUpdated ?? Date.now();

  return {
    level: computeConfidenceLevel(score),
    score,
    basedOn: n,
    lastUpdated,
    source: opts.source,
  };
}
