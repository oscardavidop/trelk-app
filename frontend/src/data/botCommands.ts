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

function checkPhotos(){
  const missingPhotos: string[] = [];
  BOT_COMMANDS.forEach(cmd => {
    if(!cmd.photos){
      missingPhotos.push(cmd.uniqueName || cmd.name[0]);
      // cmd.photos.forEach(photo => {
      //   const path = `https://cdn.trelkbot.com/assets/img/commands/${cmdSlug(cmd)}/${photo}`;
      //   fetch(path).then(res => {
      //     if(!res.ok) missingPhotos.push(path);
      //   }).catch(() => missingPhotos.push(path));
      // });
    }
  });
  if(missingPhotos.length > 0){
    console.warn("Missing command photos:", missingPhotos);
  }
  console.log(`Checked command photos, ${missingPhotos.length} missing out of ${BOT_COMMANDS.length}`);
}

if (import.meta.env.DEV) {
  // Defer to avoid blocking initial render
  setTimeout(checkPhotos, 3000);
}
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
