import { parseChangelog, type ParsedChangelog } from './parseChangelog';

const modules = import.meta.glob('/src/changelog/*.md', {
  query: '?raw',
  import: 'default',
  eager: false,
}) as Record<string, () => Promise<string>>;

const cache: Record<string, ParsedChangelog> = {};

export async function loadChangelog(slug: string): Promise<ParsedChangelog | null> {
  if (cache[slug]) return cache[slug];

  const path = `/src/changelog/${slug}.md`;
  const loader = modules[path];
  if (!loader) return null;

  const raw = await loader();
  const parsed = parseChangelog(raw);
  cache[slug] = parsed;
  return parsed;
}

export function hasChangelog(slug: string): boolean {
  return `/src/changelog/${slug}.md` in modules;
}
