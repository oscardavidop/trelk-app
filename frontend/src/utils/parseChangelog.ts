export type ChangeType = 'added' | 'fixed' | 'improved' | 'removed';

export interface ChangelogSection {
  type: ChangeType;
  items: string[];
}

export interface ChangelogVersion {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export interface ParsedChangelog {
  versions: ChangelogVersion[];
}

const TYPE_MAP: Record<string, ChangeType> = {
  added: 'added',
  fixed: 'fixed',
  improved: 'improved',
  changed: 'improved',
  removed: 'removed',
};

export function parseChangelog(raw: string): ParsedChangelog {
  const versions: ChangelogVersion[] = [];
  let current: ChangelogVersion | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();

    // ## [1.2.0] - 2026-03-20  OR  ## v1.2.0 - 2026-03-20
    const versionMatch = trimmed.match(
      /^##\s+\[?v?([^\]\s]+)\]?\s*[-–—]\s*(\d{4}-\d{2}-\d{2})/,
    );
    if (versionMatch) {
      current = { version: versionMatch[1], date: versionMatch[2], sections: [] };
      versions.push(current);
      currentSection = null;
      continue;
    }

    // ### Added / ### Fixed etc.
    const sectionMatch = trimmed.match(/^###\s+(\w+)/i);
    if (sectionMatch && current) {
      const key = sectionMatch[1].toLowerCase();
      const type = TYPE_MAP[key];
      if (type) {
        currentSection = { type, items: [] };
        current.sections.push(currentSection);
      }
      continue;
    }

    // - Item
    if (trimmed.startsWith('- ') && currentSection) {
      currentSection.items.push(trimmed.slice(2).trim());
    }
  }

  return { versions };
}
