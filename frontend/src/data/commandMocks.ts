/* ─── Command Stats mock ─── */
export interface CommandStats {
  rating: number;
  weeklyUses: number;
  favorites: number;
}




/* ─── Command Examples mock ─── */
export interface CommandExample {
  text: string;
  description?: string;
}

export const COMMAND_EXAMPLES: Record<string, CommandExample[]> = {
  play:      [{ text: '/play Linkin Park - Numb' }, { text: '/play lo-fi beats' }, { text: '/play spotify:track:4cOdK2wGLETKBW3PvgPWqT', description: 'Spotify track' }],
  chatgpt:   [{ text: '/chatgpt Explica la relatividad general' }, { text: '/chatgpt Write a poem about the sea' }],
  dl:        [{ text: '/dl https://youtube.com/watch?v=abc123' }, { text: '/dl https://twitter.com/user/status/123' }],
  img:       [{ text: '/img sunset mountain' }, { text: '/img cyberpunk city night' }],
  translate: [{ text: '/translate en Hola mundo' }, { text: '/translate fr Hello world' }],
  ssweb:     [{ text: '/ssweb google.com' }, { text: '/ssweb github.com' }],
  akinator:  [{ text: '/akinator' }, { text: '/akinator animals' }],
  weather:   [{ text: '/weather Madrid' }, { text: '/weather Tokyo' }],
  tts:       [{ text: '/tts Hello world' }, { text: '/tts Hola amigos' }],
  lyrics:    [{ text: '/lyrics Bohemian Rhapsody' }, { text: '/lyrics Numb Linkin Park' }],
  wiki:      [{ text: '/wiki black hole' }, { text: '/wiki quantum computing' }],
  meme:      [{ text: '/meme' }, { text: '/meme dark' }],
  qr:        [{ text: '/qr https://trelk.app' }, { text: '/qr Hello World' }],
  sticker:   [{ text: '/sticker cat cute' }, { text: '/sticker happy' }],
  shorten:   [{ text: '/shorten https://very-long-url.com/path/to/page' }],
  apk:       [{ text: '/apk Spotify' }, { text: '/apk com.whatsapp' }],
  alert:     [{ text: '/alert 30m check oven' }, { text: '/alert 2h call mom' }],
  ping:      [{ text: '/ping' }],
};

export function getExamples(slug: string): CommandExample[] {
  return COMMAND_EXAMPLES[slug] ?? [{ text: `/${slug}` }];
}

/* ─── Changelog mock ─── */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const COMMAND_CHANGELOG: Record<string, ChangelogEntry[]> = {
  play: [
    { version: 'v2.3', date: '2026-03-01', changes: ['Soporte para Spotify links', 'Mejor calidad de audio'] },
    { version: 'v2.0', date: '2026-01-15', changes: ['Reescritura completa del motor de reproducción'] },
    { version: 'v1.0', date: '2025-09-01', changes: ['Lanzamiento inicial'] },
  ],
  chatgpt: [
    { version: 'v3.0', date: '2026-02-20', changes: ['Soporte GPT-4o', 'Modo streaming'] },
    { version: 'v2.0', date: '2025-12-01', changes: ['GPT-4 por defecto', 'Contexto extendido'] },
  ],
};

export function getChangelog(slug: string): ChangelogEntry[] {
  return COMMAND_CHANGELOG[slug] ?? [
    { version: 'v1.0', date: '2025-06-01', changes: ['Lanzamiento inicial'] },
  ];
}

/* ─── Comments mock ─── */
export interface CommandComment {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  date: string;
  likes: number;
}

export const COMMAND_COMMENTS: Record<string, CommandComment[]> = {
  play: [
    { id: '1', user: 'MusicFan23', text: 'Funciona genial para música', date: '2026-03-05', likes: 12 },
    { id: '2', user: 'DevUser', text: 'Necesita soporte para playlists', date: '2026-03-03', likes: 8 },
    { id: '3', user: 'Ana_TG', text: 'Mi comando favorito, lo uso todos los días', date: '2026-03-01', likes: 15 },
  ],
  chatgpt: [
    { id: '1', user: 'AIExplorer', text: 'Increíble con GPT-4o, muy rápido', date: '2026-03-06', likes: 24 },
    { id: '2', user: 'Student99', text: 'Me ayuda mucho con las tareas', date: '2026-03-04', likes: 9 },
  ],
};

export function getComments(slug: string): CommandComment[] {
  return COMMAND_COMMENTS[slug] ?? [
    { id: 'default', user: 'TrelkUser', text: 'Buen comando, funciona bien.', date: '2026-02-28', likes: 3 },
  ];
}

/* ─── Related Commands mock ─── */
export const RELATED_COMMANDS: Record<string, string[]> = {
  play:      ['lyrics', 'dl', 'tts'],
  chatgpt:   ['wiki', 'translate', 'tts'],
  dl:        ['play', 'img', 'ssweb'],
  img:       ['sticker', 'meme', 'ssweb'],
  translate: ['chatgpt', 'tts', 'wiki'],
  ssweb:     ['dl', 'img', 'qr'],
  akinator:  ['meme', 'sticker', 'play'],
  weather:   ['wiki', 'translate', 'alert'],
  tts:       ['translate', 'chatgpt', 'play'],
  lyrics:    ['play', 'dl', 'translate'],
  wiki:      ['chatgpt', 'translate', 'weather'],
  meme:      ['sticker', 'img', 'akinator'],
  qr:        ['shorten', 'ssweb', 'img'],
  sticker:   ['meme', 'img', 'akinator'],
  shorten:   ['qr', 'ssweb', 'dl'],
  apk:       ['dl', 'wiki', 'ssweb'],
  alert:     ['weather', 'wiki', 'translate'],
  ping:      ['weather', 'wiki', 'alert'],
};

export function getRelated(slug: string): string[] {
  return RELATED_COMMANDS[slug] ?? ['play', 'chatgpt', 'translate'];
}

/* ─── Experimental commands (Labs) ─── */
export interface ExperimentalCommand {
  id: string;
  name: string;
  description: string;
  status: 'alpha' | 'beta' | 'coming-soon';
  icon: string;     // lucide icon name hint
  color: string;
}

export const EXPERIMENTAL_COMMANDS: ExperimentalCommand[] = [
  { id: 'ai-image-v2', name: 'AI Image v2', description: 'Generación de imágenes de nueva generación con modelos Flux', status: 'beta', icon: 'image', color: '#a855f7' },
  { id: 'voice-commands', name: 'Voice Commands', description: 'Controla el bot con mensajes de voz', status: 'alpha', icon: 'mic', color: '#3b82f6' },
  { id: 'auto-summary', name: 'Auto Summary', description: 'Resumen automático de conversaciones y artículos', status: 'beta', icon: 'file-text', color: '#10b981' },
  { id: 'code-runner', name: 'Code Runner', description: 'Ejecuta código Python, JS y más directamente en el chat', status: 'alpha', icon: 'terminal', color: '#f59e0b' },
  { id: 'video-editor', name: 'Video Editor', description: 'Edita videos cortos con comandos simples', status: 'coming-soon', icon: 'video', color: '#ec4899' },
  { id: 'multi-model', name: 'Multi Model AI', description: 'Compara respuestas de GPT-4, Gemini y Claude al mismo tiempo', status: 'coming-soon', icon: 'brain', color: '#8b5cf6' },
];

/* ─── Command folders mock (for favorites) ─── */
export interface CommandFolder {
  id: string;
  name: string;
  icon: string;     // lucide icon name hint
  color: string;
  commands: string[];
}

export const COMMAND_FOLDERS: CommandFolder[] = [
  { id: 'music', name: 'Música', icon: 'music', color: '#f59e0b', commands: ['play', 'lyrics', 'dl'] },
  { id: 'ai', name: 'Inteligencia Artificial', icon: 'brain', color: '#8b5cf6', commands: ['chatgpt', 'tts', 'img'] },
  { id: 'tools', name: 'Herramientas', icon: 'wrench', color: '#3b82f6', commands: ['ssweb', 'qr', 'shorten', 'translate'] },
];

/* ─── Favorite commands mock ─── */
export const FAVORITE_COMMANDS: string[] = ['play', 'chatgpt', 'translate', 'ssweb', 'img', 'dl'];
