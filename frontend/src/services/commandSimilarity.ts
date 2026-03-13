/**
 * commandSimilarity.ts
 *
 * Algorithm-based recommendation engine built on commands.json data.
 * Pre-computes a similarity matrix at module load time (41 cmds → single pass).
 *
 * Scoring per pair:
 *  +3  same category
 *  +2  each shared alias/name token
 *  +1  both support inline mode
 *  +0–2  cosine similarity on description text
 */

import { BOT_COMMANDS, cmdSlug } from '../data/botCommands';
import type { BotCommand } from '../data/botCommands';

// ── 1. Command index ─────────────────────────────────────────────────────────
export const commandIndex = new Map<string, BotCommand>();
for (const cmd of BOT_COMMANDS) {
  commandIndex.set(cmdSlug(cmd), cmd);
}

// ── 2. Text tokenizer ────────────────────────────────────────────────────────
function tokenize(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúñüàèìòùâêîôûäëïöü\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  for (const w of words) {
    freq[w] = (freq[w] ?? 0) + 1;
  }
  return freq;
}

function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  let normA = 0;
  for (const [w, c] of Object.entries(a)) {
    dot += c * (b[w] ?? 0);
    normA += c * c;
  }
  let normB = 0;
  for (const c of Object.values(b)) {
    normB += c * c;
  }
  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// ── 3. Pair similarity score ─────────────────────────────────────────────────
function score(a: BotCommand, b: BotCommand): number {
  if (cmdSlug(a) === cmdSlug(b)) return -1;

  let s = 0;

  // Category: +3
  if (a.category === b.category) s += 3;

  // Group similarity: +1
  if ((a as any).group && (a as any).group === (b as any).group) s += 1;

  // Shared alias tokens: +2 each
  const namesA = new Set(a.name.map((n) => n.toLowerCase()));
  const shared = b.name.filter((n) => namesA.has(n.toLowerCase())).length;
  s += shared * 2;

  // Both inline: +1
  if (a.supportsInline && b.supportsInline) s += 1;

  // Description cosine: +0 to +2
  const tokA = tokenize(a.description ?? '');
  const tokB = tokenize(b.description ?? '');
  s += cosine(tokA, tokB) * 2;

  return s;
}

// ── 4. Pre-compute similarity matrix ────────────────────────────────────────
// Map<slug, sorted array of [otherSlug, score] DESC>
const similarityMatrix = new Map<string, Array<{ slug: string; score: number }>>();

for (const cmd of BOT_COMMANDS) {
  const slug = cmdSlug(cmd);
  const ranked = BOT_COMMANDS
    .filter((other) => cmdSlug(other) !== slug)
    .map((other) => ({ slug: cmdSlug(other), score: score(cmd, other) }))
    .sort((a, b) => b.score - a.score);
  similarityMatrix.set(slug, ranked);
}

// ── 5. Public helpers ─────────────────────────────────────────────────────────

/**
 * Returns the top N most similar commands to the given slug.
 * Used for "Related Commands" section.
 */
export function getRelated(slug: string, limit = 4): BotCommand[] {
  const ranked = similarityMatrix.get(slug);
  if (!ranked) return BOT_COMMANDS.slice(0, limit);
  return ranked
    .slice(0, limit)
    .map((r) => commandIndex.get(r.slug))
    .filter((c): c is BotCommand => c !== undefined);
}

/**
 * Returns diverse suggestions for "Suggestions for you".
 * Prefers different categories for variety; falls back to similarity order.
 */
export function getSuggestions(currentSlug: string, limit = 3): BotCommand[] {
  const current = commandIndex.get(currentSlug);
  const ranked = similarityMatrix.get(currentSlug);

  if (!ranked) {
    return BOT_COMMANDS
      .filter((c) => cmdSlug(c) !== currentSlug)
      .slice(0, limit);
  }

  // First pass: different category
  const diffCat = ranked
    .filter((r) => {
      const cmd = commandIndex.get(r.slug);
      return cmd && cmd.category !== current?.category;
    })
    .slice(0, limit)
    .map((r) => commandIndex.get(r.slug))
    .filter((c): c is BotCommand => c !== undefined);

  if (diffCat.length >= limit) return diffCat;

  // Fallback: fill with top similar regardless of category
  const fallback = ranked
    .filter((r) => !diffCat.find((c) => cmdSlug(c) === r.slug))
    .slice(0, limit - diffCat.length)
    .map((r) => commandIndex.get(r.slug))
    .filter((c): c is BotCommand => c !== undefined);

  return [...diffCat, ...fallback].slice(0, limit);
}
