/* ─── Bot Commands registry ─── */
import {
  Wrench,
  Music,
  Gamepad2,
  Image,
  Bot,
  MessageCircle,
  Settings,
  Box,
  SmilePlus,
  Download,
  Globe,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BotCommand {
  name: string[];
  uniqueName?: string;
  category: string;
  description: string;
  requireArgs: boolean;
  supportsInline?: boolean;
  supportInlineQuery?: boolean;
  supportInGroups?: boolean;
  usage: string;
  maxLengthArgs?: number;
  keyMissingArgs?: string;
  photos?: string[];
}

export type CommandCategory = 'all' | 'utilities' | 'music' | 'entertainment' | 'media' | 'ai' | 'social' | 'tools' | 'fun' | 'downloader' | 'general' | 'information';


export const CATEGORY_META: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  utilities: {
    label: "Utilidades",
    color: "#3b82f6",
    icon: Wrench,
  },
  music: {
    label: "Música",
    color: "#f59e0b",
    icon: Music,
  },
  entertainment: {
    label: "Entretenimiento",
    color: "#a855f7",
    icon: Gamepad2,
  },
  media: {
    label: "Media",
    color: "#ec4899",
    icon: Image,
  },
  ai: {
    label: "AI",
    color: "#10b981",
    icon: Bot,
  },
  social: {
    label: "Social",
    color: "#06b6d4",
    icon: MessageCircle,
  },
  tools: {
    label: "Herramientas",
    color: "#ef4444",
    icon: Settings,
  },
  fun: {
    label: "Entretenimiento",
    color: "#f97316",
    icon: SmilePlus,
  },
  downloader: {
    label: "Descargas",
    color: "#0ea5e9",
    icon: Download,
  },
  general: {
    label: "General",
    color: "#8b5cf6",
    icon: Globe,
  },
  information: {
    label: "Información",
    color: "#14b8a6",
    icon: Info,
  },
  'uncategorized': {
    label: "Sin categoría",
    color: "#6b7280",
    icon: Box
  }
};

import commands from "./commands.json";

export const BOT_COMMANDS: BotCommand[]  = commands as BotCommand[];

export const TOTAL_BOT_COMMANDS = BOT_COMMANDS.length;
// = [
//   {
//     name: ['apk', 'apkinfo', 'apk-info', 'appinfo', 'app-info'],
//     uniqueName: 'apk',
//     category: 'utilities',
//     description: 'Busca información y descarga archivos APK.',
//     requireArgs: true,
//     supportsInline: true,
//     usage: '/apk <package_name | term>',
//   },
//   {
//     name: ['alert', 'alerta', 'task', 'reminder', 'notify'],
//     uniqueName: 'alert',
//     description: 'Establece una alerta o recordatorio.',
//     requireArgs: true,
//     supportInlineQuery: false,
//     supportInGroups: false,
//     category: 'utilities',
//     usage: '/alert <time> <message>',
//   },
//   {
//     name: ['akinator', 'aki', 'adivina', 'guess'],
//     uniqueName: 'akinator',
//     description: 'Juego de Akinator — ¡adivina en qué personaje piensas!',
//     requireArgs: false,
//     category: 'entertainment',
//     usage: '/akinator <mood>',
//     supportsInline: true,
//     supportInGroups: false,
//     maxLengthArgs: 2,
//   },
//   {
//     name: ['play', 'song', 'cancion', 'musica', 'music'],
//     uniqueName: 'play',
//     description: 'Reproduce una canción o lista de reproducción desde YouTube.',
//     requireArgs: false,
//     keyMissingArgs: 'music_missing_args',
//     supportsInline: true,
//     category: 'music',
//     usage: '/play <song name or artist>',
//   },
//   {
//     name: ['ssweb', 'screenshotweb', 'screenshot', 'webss', 'captura'],
//     uniqueName: 'ssweb',
//     description: 'Toma una captura de pantalla de un sitio web.',
//     requireArgs: true,
//     keyMissingArgs: 'missing_info_screenshot',
//     supportsInline: false,
//     category: 'utilities',
//     usage: '/ssweb <url>',
//   },
//   {
//     name: ['t', 'traductor', 'translate', 'translator'],
//     uniqueName: 'translate',
//     description: 'Traduce un texto a otro idioma.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'utilities',
//     usage: '/translate <target_lang> <text to translate>',
//     maxLengthArgs: 500,
//   },
//   {
//     name: ['chatgpt', 'gpt', 'ai', 'ask'],
//     uniqueName: 'chatgpt',
//     description: 'Consulta a ChatGPT con cualquier pregunta o tema.',
//     requireArgs: true,
//     supportsInline: true,
//     category: 'ai',
//     usage: '/chatgpt <tu pregunta>',
//     maxLengthArgs: 2000,
//   },
//   {
//     name: ['img', 'image', 'foto', 'photo', 'pic'],
//     uniqueName: 'img',
//     description: 'Busca y descarga imágenes de alta calidad.',
//     requireArgs: true,
//     supportsInline: true,
//     category: 'media',
//     usage: '/img <search term>',
//   },
//   {
//     name: ['sticker', 'stk', 'pegatina'],
//     uniqueName: 'sticker',
//     description: 'Busca y envía stickers de Telegram.',
//     requireArgs: true,
//     supportsInline: true,
//     category: 'entertainment',
//     usage: '/sticker <search term>',
//   },
//   {
//     name: ['qr', 'qrcode', 'codigo'],
//     uniqueName: 'qr',
//     description: 'Genera un código QR a partir de un texto o URL.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'utilities',
//     usage: '/qr <text or url>',
//   },
//   {
//     name: ['dl', 'download', 'descargar', 'save'],
//     uniqueName: 'dl',
//     description: 'Descarga videos o archivos multimedia de múltiples plataformas.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'media',
//     usage: '/dl <url>',
//   },
//   {
//     name: ['tts', 'speak', 'voz', 'voice'],
//     uniqueName: 'tts',
//     description: 'Convierte texto a audio con voz natural.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'ai',
//     usage: '/tts <texto>',
//     maxLengthArgs: 500,
//   },
//   {
//     name: ['weather', 'clima', 'tiempo'],
//     uniqueName: 'weather',
//     description: 'Consulta el clima actual de cualquier ciudad.',
//     requireArgs: true,
//     supportsInline: true,
//     category: 'utilities',
//     usage: '/weather <city>',
//   },
//   {
//     name: ['wiki', 'wikipedia', 'define'],
//     uniqueName: 'wiki',
//     description: 'Busca información en Wikipedia.',
//     requireArgs: true,
//     supportsInline: true,
//     category: 'utilities',
//     usage: '/wiki <term>',
//   },
//   {
//     name: ['lyrics', 'letra', 'song-lyrics'],
//     uniqueName: 'lyrics',
//     description: 'Busca la letra de cualquier canción.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'music',
//     usage: '/lyrics <song name>',
//   },
//   {
//     name: ['meme', 'funny', 'humor'],
//     uniqueName: 'meme',
//     description: 'Genera o busca memes aleatorios.',
//     requireArgs: false,
//     supportsInline: true,
//     category: 'entertainment',
//     usage: '/meme [category]',
//   },
//   {
//     name: ['ping', 'status', 'health'],
//     uniqueName: 'ping',
//     description: 'Verifica el estado del bot y la latencia.',
//     requireArgs: false,
//     supportsInline: false,
//     category: 'tools',
//     usage: '/ping',
//   },
//   {
//     name: ['shorten', 'short', 'url', 'acortar'],
//     uniqueName: 'shorten',
//     description: 'Acorta una URL larga con un enlace personalizado.',
//     requireArgs: true,
//     supportsInline: false,
//     category: 'utilities',
//     usage: '/shorten <url>',
//   },
// ];

/** Get the primary name (first alias) */
export function cmdSlug(cmd: BotCommand): string {
  return cmd.uniqueName || cmd.name[0];
}

/** Find command by slug */
export function findCommand(slug: string): BotCommand | undefined {
  return BOT_COMMANDS.find(
    (c) => cmdSlug(c) === slug || c.name.includes(slug),
  );
}

/** Get all unique categories */
export function getCategories(): string[] {
  return [...new Set(BOT_COMMANDS.map((c) => c.category))];
}

/** Popular commands (hand-picked slugs) */
export const POPULAR_SLUGS = ['play', 'chatgpt', 'dl', 'img', 'translate', 'ssweb', 'akinator', 'alert'];
