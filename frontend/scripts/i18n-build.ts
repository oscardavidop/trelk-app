// /**
//  * i18n:build — Generates compact translation files.
//  *
//  * Reads all namespace JSON files from src/i18n/locales/{lang}/*.json
//  * and combines them into a single dist/i18n/{lang}.compact.json per language.
//  *
//  * Usage:  npx tsx scripts/i18n-build.ts
//  *    or:  npm run i18n:build
//  */

// import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
// import { join, basename, dirname } from 'path';
// import { fileURLToPath } from 'url';

// const __dirname = dirname(fileURLToPath(import.meta.url));
// const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
// const OUT_DIR = join(__dirname, '..', 'dist', 'i18n');

// /** Discover all language directories that contain namespace JSON files. */
// function discoverLanguages(): string[] {
//   return readdirSync(LOCALES_DIR, { withFileTypes: true })
//     .filter((d) => d.isDirectory())
//     .map((d) => d.name);
// }

// /** Read and merge all namespace JSONs for a language into one object. */
// function buildCompact(lang: string): Record<string, Record<string, string>> {
//   const langDir = join(LOCALES_DIR, lang);
//   const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));
//   const compact: Record<string, Record<string, string>> = {};

//   for (const file of files) {
//     const ns = basename(file, '.json');
//     compact[ns] = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
//   }

//   // Include legacy flat file if it exists (translation namespace)
//   const legacyFile = join(LOCALES_DIR, `${lang}.json`);
//   if (existsSync(legacyFile)) {
//     compact['translation'] = JSON.parse(readFileSync(legacyFile, 'utf-8'));
//   }

//   return compact;
// }

// // ─── Main ────────────────────────────────────────────────────────────
// const languages = discoverLanguages();

// mkdirSync(OUT_DIR, { recursive: true });

// for (const lang of languages) {
//   const compact = buildCompact(lang);
//   const nsCount = Object.keys(compact).length;
//   const outPath = join(OUT_DIR, `${lang}.compact.json`);

//   writeFileSync(outPath, JSON.stringify(compact, null, 2), 'utf-8');
//   console.log(`✓ ${lang}.compact.json  (${nsCount} namespaces)`);
// }

// console.log(`\nDone → ${OUT_DIR}`);
