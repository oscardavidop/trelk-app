import { useState, useCallback, useEffect } from 'react';
import { findCommand, cmdSlug, type BotCommand } from '../data/botCommands';

const STORAGE_KEY = 'trelk_recently_viewed_commands';
const MAX_ITEMS = 12;

interface RecentCommand {
  slug: string;
  viewedAt: number;
}

function loadFromStorage(): RecentCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any) => typeof item.slug === 'string' && typeof item.viewedAt === 'number',
    );
  } catch {
    return [];
  }
}

function saveToStorage(items: RecentCommand[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — ignore */ }
}

export function trackCommandView(slug: string) {
  const items = loadFromStorage();
  const filtered = items.filter((i) => i.slug !== slug);
  const updated = [{ slug, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
  saveToStorage(updated);
}

export function useRecentlyViewedCommands() {
  const [items, setItems] = useState<RecentCommand[]>(() => loadFromStorage());

  // Re-read on focus (user may navigate back)
  useEffect(() => {
    const handler = () => setItems(loadFromStorage());
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  const refresh = useCallback(() => setItems(loadFromStorage()), []);

  const commands: BotCommand[] = items
    .map((i) => findCommand(i.slug))
    .filter(Boolean) as BotCommand[];

  return { commands, refresh };
}
