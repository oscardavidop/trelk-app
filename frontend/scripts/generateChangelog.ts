#!/usr/bin/env tsx
/**
 * CLI: generates a new changelog entry for a command.
 *
 * Usage:
 *   npx tsx scripts/generateChangelog.ts <slug> [version]
 *
 * Examples:
 *   npx tsx scripts/generateChangelog.ts play 2.4.0
 *   npx tsx scripts/generateChangelog.ts translate        # auto-increments minor
 */

// ignore all errors in this file since it's a one-off script and we don't want to spend time fixing types
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* @ts-ignore */
import { readFileSync, writeFileSync, existsSync } from 'fs';
/* @ts-ignore */
import { resolve } from 'path';

/* @ts-ignore */
const CHANGELOG_DIR = resolve(__dirname, '../src/changelog');
/* @ts-ignore */
const slug = process.argv[2];
if (!slug) {
    console.error('Usage: npx tsx scripts/generateChangelog.ts <slug> [version]');
    /* @ts-ignore */
    process.exit(1);
}

const filePath = resolve(CHANGELOG_DIR, `${slug}.md`);
const today = new Date().toISOString().slice(0, 10);

function bumpMinor(latest: string): string {
    const parts = latest.split('.').map(Number);
    parts[1] = (parts[1] || 0) + 1;
    parts[2] = 0;
    return parts.join('.');
}

/* @ts-ignore */
let version = process.argv[3];

if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^## \[(\d+\.\d+\.\d+)\]/m);
    const latestVersion = match?.[1] ?? '1.0.0';

    if (!version) {
        version = bumpMinor(latestVersion);
    }

    const template = `## [${version}] - ${today}

### Added
- 

### Fixed
- 

`;

    const insertPos = content.indexOf('## [');
    const updated = insertPos >= 0
        ? content.slice(0, insertPos) + template + content.slice(insertPos)
        : content + '\n' + template;

    writeFileSync(filePath, updated, 'utf-8');
    console.log(`✅ Added v${version} to ${filePath}`);
} else {
    if (!version) version = '1.0.0';

    const template = `# Changelog – /${slug}

## [${version}] - ${today}

### Added
- 

### Fixed
- 
`;

    writeFileSync(filePath, template, 'utf-8');
    console.log(`✅ Created ${filePath} with v${version}`);
}
