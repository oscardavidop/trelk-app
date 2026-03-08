// import { writeFileSync } from 'jsonfile'
import { exec } from 'child_process'
import { join } from 'path';
import { promises as fs } from 'fs';
// import * as translator from '@parvineyvazov/json-translator';


// export function translate() {
//     const lang_translate = 'pt'
//     const path_lang_orginal = `/home/User/mbot/rifalo/src/locales/es.json`;
//     const path_lang_translate = `/home/User/mbot/rifalo/src/locales/${lang_translate}.json`;

//     const command = `npx jsontt  ${path_lang_orginal} --module google2 -f es -t ${lang_translate}  -fb yes -cl 3 -n pt`

//     exec(command, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Error: ${error.message}`);
//         }
//         if (stderr) {
//             console.error(`stderr: ${stderr}`);
//         }
//         const old_path_lang_translate = `/home/User/mbot/rifalo/src/locales/${lang_translate}.json`;
//         require('fs/promises').rename(old_path_lang_translate, path_lang_translate).then((data) => {
//             const translatedJson = require(path_lang_translate);
//             writeFileSync(path_lang_translate, translatedJson);
//         }).catch((e) => {
//             console.log(e.message)
//         })
//         // res.json({ ok: true, ...translatedJson });
//         console.log(`stdout: ${stdout}`);
//     });
// }


export class TranslateService {
    // private translationsPath: string;
    // private availableLangsTypes: Record<string, string> = {};
    // private availableLangs: string[];
    // private translationsStatusPath: string;

    // constructor() {
    //     this.translationsPath = join(process.cwd(), 'src', 'i18n', 'locales');
    //     this.translationsStatusPath = join(process.cwd(), 'src', 'i18n', 'translations-status.json');
    //     this.availableLangsTypes = {
    //         es: translator.languages.Spanish,
    //         en: translator.languages.English,
    //         fr: translator.languages.French,
    //         pt: translator.languages.Portuguese,
    //         it: translator.languages.Italian,
    //         de: translator.languages.German,
    //         ru: translator.languages.Russian,
    //         "zh-CN": translator.languages.Chinese_Simplified,
    //         "zh-TW": translator.languages.Chinese_Traditional,
    //         ja: translator.languages.Japanese,
    //         ko: translator.languages.Korean,
    //         ar: translator.languages.Arabic,
    //         hi: translator.languages.Hindi,
    //         tr: translator.languages.Turkish,
    //         nl: translator.languages.Dutch,
    //     };
    //     this.availableLangs = Object.keys(this.availableLangsTypes);
    // }
    // /**
    //  * Verifica qué keys están traducidas en cada idioma y genera translations-status.json
    //  */
    // async checkTranslationStatus(): Promise<Record<string, any>> {
    //     const baseLang = 'es'; // idioma de referencia
    //     const basePath = join(this.translationsPath, `${baseLang}.json`);

    //     // 1. cargar el archivo base
    //     const baseData = JSON.parse(await fs.readFile(basePath, 'utf-8'))[baseLang];
    //     const allKeys = Object.keys(baseData);

    //     // 2. cargar el translations-status.json previo si existe
    //     let previousStatus: Record<string, any> = { keys: {} };
    //     try {
    //         const prev = await fs.readFile(this.translationsStatusPath, 'utf-8');
    //         previousStatus = JSON.parse(prev);
    //     } catch {
    //         console.log("ℹ️ No existe translations-status.json, se creará uno nuevo.");
    //     }

    //     const status: Record<string, Record<string, boolean>> = {};

    //     // 3. inicializar / mergear las keys
    //     for (const key of allKeys) {
    //         status[key] = {};

    //         for (const lang of this.availableLangs) {
    //             // Si ya había registro previo, respetarlo
    //             const prevValue = previousStatus.keys?.[key]?.[lang];

    //             if (prevValue !== undefined) {
    //                 status[key][lang] = prevValue;
    //             } else {
    //                 // por defecto: español true, otros false
    //                 status[key][lang] = lang === baseLang;
    //             }
    //         }
    //     }

    //     // 4. recorrer idiomas y verificar si existen las keys realmente
    //     for (const lang of this.availableLangs) {
    //         const filePath = join(this.translationsPath, `${lang}.json`);

    //         try {
    //             const fileContent = await fs.readFile(filePath, 'utf-8');
    //             const json = JSON.parse(fileContent)[lang];

    //             for (const key of allKeys) {
    //                 if (json && json[key]) {
    //                     status[key][lang] = true;
    //                 }
    //             }
    //         } catch {
    //             // archivo no existe → no se cambia
    //             console.warn(`⚠️ No existe ${lang}.json`);
    //         }
    //     }

    //     // 5. guardar mergeado
    //     const finalStatus = { keys: status };
    //     await fs.writeFile(this.translationsStatusPath, JSON.stringify(finalStatus, null, 2), 'utf-8');

    //     return finalStatus;
    // }

    // /**
    //   * Traduce solo las keys que falten en el destino
    //   */
    // async translateTo(langs: string[]): Promise<void> {
    //     let lang: translator.languages;
    //     for (const l of langs) {
    //         if (!this.availableLangs.includes(l)) {
    //             throw new Error(`Language '${l}' is not supported.`);
    //         }
    //         lang = this.availableLangsTypes[l] as translator.languages;
    //     }

    //     const baseLang = 'es';
    //     const baseFile = join(this.translationsPath, `${baseLang}.json`);
    //     const targetFile = join(this.translationsPath, `${lang}.json`);

    //     // 1. cargar el base y destino
    //     const baseData = JSON.parse(await fs.readFile(baseFile, 'utf-8'))[baseLang];
    //     let targetData: Record<string, any> = {};
    //     try {
    //         targetData = JSON.parse(await fs.readFile(targetFile, 'utf-8'))[lang] || {};
    //     } catch {
    //         console.log(`ℹ️ No existe ${lang}.json, se creará uno nuevo.`);
    //     }

    //     // 2. detectar keys faltantes
    //     const missingKeys: Record<string, string> = {};
    //     for (const [key, value] of Object.entries(baseData)) {
    //         if (!targetData[key]) {
    //             missingKeys[key] = String(value);
    //         }
    //     }

    //     if (Object.keys(missingKeys).length === 0) {
    //         console.log(`✅ No hay nada que traducir para ${lang}.json`);
    //         return;
    //     }

    //     console.log(`📝 Se traducirán ${Object.keys(missingKeys).length} keys nuevas/faltantes a ${lang}`);

    //     const translatedInput = {
    //         [baseLang]: missingKeys
    //     }
    //     // 4. ejecutar jsontt
    //     const translated = (await translator.translateObject(translatedInput, translator.languages.Spanish, lang))[baseLang] as any;

    //     const merged = { ...targetData, ...translated };

    //     await fs.writeFile(targetFile, JSON.stringify({ [lang]: merged }, null, 2), 'utf-8');

    //     console.log(`✅ ${lang}.json actualizado con ${Object.keys(missingKeys).length} traducciones nuevas`);

    //     // // 6. actualizar translations-status.json
    //     await this.checkTranslationStatus();
    // }

    // /**
    //  * Chequea y sincroniza las traducciones con el base (es.json).
    //  * - Detecta keys "huérfanas" (que no existen en es.json).
    //  * - Las elimina automáticamente de los archivos destino.
    //  */
    // async checkSync(): Promise<void> {
    //     const baseLang = 'es';
    //     const baseFile = join(this.translationsPath, `${baseLang}.json`);
    //     const baseData = JSON.parse(await fs.readFile(baseFile, 'utf-8'))[baseLang];

    //     for (const lang of this.availableLangs) {
    //         if (lang === baseLang) continue;

    //         const targetFile = join(this.translationsPath, `${lang}.json`);
    //         let targetData: Record<string, any> = {};
    //         try {
    //             targetData = JSON.parse(await fs.readFile(targetFile, 'utf-8'))[lang] || {};
    //         } catch {
    //             console.log(`ℹ️ ${lang}.json no existe, se ignora en checkSync`);
    //             continue;
    //         }

    //         // detectar "huérfanas"
    //         const orphanKeys = Object.keys(targetData).filter(
    //             (key) => !(key in baseData)
    //         );

    //         if (orphanKeys.length > 0) {
    //             console.log(`⚠️ ${lang}.json tenía ${orphanKeys.length} keys huérfanas: ${orphanKeys.join(', ')}`);
    //             // eliminar huérfanas
    //             for (const key of orphanKeys) {
    //                 delete targetData[key];
    //             }
    //             // sobrescribir archivo limpio
    //             await fs.writeFile(
    //                 targetFile,
    //                 JSON.stringify({ [lang]: targetData }, null, 2),
    //                 'utf-8'
    //             );
    //             console.log(`🧹 ${lang}.json limpiado y sincronizado con ${baseLang}.json`);
    //         } else {
    //             console.log(`✅ ${lang}.json está sincronizado con ${baseLang}.json`);
    //         }
    //     }

    //     this.checkTranslationStatus();
    // }

    // /**
    //  * Verifica, sincroniza y traduce automáticamente todos los idiomas.
    //  * Genera un resumen final en translations-summary.json
    //  */
    // async checkAll(): Promise<void> {
    //     const baseLang = 'es';
    //     const baseFile = join(this.translationsPath, `${baseLang}.json`);
    //     const baseData = JSON.parse(await fs.readFile(baseFile, 'utf-8'))[baseLang];

    //     // 1. status inicial
    //     let status = await this.checkTranslationStatus();

    //     // 2. limpiar huérfanas
    //     await this.checkSync();

    //     // 3. traducir faltantes
    //     for (const lang of this.availableLangs) {
    //         if (lang === baseLang) continue;

    //         let missing = 0;
    //         for (const key of Object.keys(baseData)) {
    //             if (!status.keys[key][lang]) missing++;
    //         }

    //         if (missing > 0) {
    //             console.log(`🌍 Traduciendo ${missing} keys faltantes en ${lang}.json...`);
    //             await this.translateTo([lang]);
    //         }
    //     }

    //     // 👉 4. refrescar status después de traducir
    //     status = await this.checkTranslationStatus();

    //     // 👉 5. recalcular missing con status final
    //     const missingSummary: Record<string, number> = {};
    //     for (const lang of this.availableLangs) {
    //         let missing = 0;
    //         for (const key of Object.keys(baseData)) {
    //             if (!status.keys[key][lang]) missing++;
    //         }
    //         missingSummary[lang] = missing;
    //     }

    //     // 👉 6. resumen final
    //     const summary = {
    //         totalKeys: Object.keys(baseData).length,
    //         missing: missingSummary,
    //         orphanRemoved: {}, // puedes llenarlo en checkSync si quieres log detallado
    //         updatedAt: new Date().toISOString(),
    //     };

    //     const summaryPath = join(this.translationsPath, '..', 'translations-summary.json');
    //     await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    //     console.log('📊 Resumen generado en translations-summary.json');
    //     console.log('✅ Verificación y traducción completas');
    //     console.log(summary);
    // }

}