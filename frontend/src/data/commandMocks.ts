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

const COMMANDS = [
  "menu","akinator","dog","cat","mydogs","mycats","apk","tts","xnx","tiktok",
  "fb","xdl","news","feedback","help","img","mail","play","lyrics","ipinfo",
  "whois","dns","qr","quiz","roman","settings","ssweb","md5","password",
  "myid","mayus","minus","reverse","capitalize","shorten","t","ttt","wiki",
  "alerta","dalert","listalert"
];

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
  mayus:     [{ text: '/mayus hola mundo' }, { text: '/mayus make this uppercase' }],
  md5:      [{ text: '/md5 mysecretpassword' }, { text: '/md5 Hello World' }],
  dns:     [{ text: '/dns example.com' }, { text: '/dns google.com' }],
  whois:   [{ text: '/whois example.com' }, { text: '/whois google.com' }],
  news:    [{ text: '/news' }, { text: '/news technology' }],
  feedback: [{ text: '/feedback I love this bot!' }, { text: '/feedback It would be great to have a dark mode' }],
  t:       [{ text: '/t Hello world' }, { text: '/t Hola amigos' }],
  ttt:     [{ text: '/ttt' }, { text: '/ttt hard' }],
  settings: [{ text: '/settings' }, { text: '/settings notifications' }],
  myid:     [{ text: '/myid' }],
  minus:    [{ text: '/minus MAKE THIS LOWERCASE' }],
  reverse:  [{ text: '/reverse Hello world' }],
  capitalize: [{ text: '/capitalize make this capitalized' }],
  ipinfo: [{ text: '/ipinfo 8.8.8.8' }, { text: '/ipinfo 1.1.1.1' }],

};



export const COMMAND_WORKS_STEPS: Record<string, string[]> = {
  play: ['User sends /play command', 'Bot processes the request', 'Bot returns the audio file or stream link'],
  chatgpt: ['User sends /chatgpt command with a question', 'Bot forwards the question to the GPT API', 'Bot receives the response and sends it back to the user'],
  dl: ['User sends /dl command with a media URL', 'Bot validates the URL and fetches the media', 'Bot sends the media file to the user'],
  img: ['User sends /img command with a prompt', 'Bot generates an image using an AI model', 'Bot sends the generated image to the user'],
  translate: ['User sends /translate command with target language and text', 'Bot translates the text using a translation API', 'Bot sends the translated text back to the user'],
  ssweb: ['User sends /ssweb command with a URL', 'Bot takes a screenshot of the webpage', 'Bot sends the screenshot image to the user'],
  akinator: ['User sends /akinator command', 'Bot starts a guessing game', 'Bot asks questions and tries to guess the character the user is thinking of'],
  weather: ['User sends /weather command with a location', 'Bot fetches the weather information from an API', 'Bot sends the weather details back to the user'],
  tts: ['User sends /tts command with text', 'Bot converts the text to speech using a TTS API', 'Bot sends the audio file to the user'],
  lyrics: ['User sends /lyrics command with a song name or artist', 'Bot searches for the song lyrics', 'Bot sends the lyrics back to the user'],
  wiki: ['User sends /wiki command with a search term', 'Bot queries Wikipedia for the term', 'Bot sends a summary of the Wikipedia article back to the user'],
  meme: ['User sends /meme command', 'Bot generates or fetches a random meme', 'Bot sends the meme image to the user'],
  qr: ['User sends /qr command with text or URL', 'Bot generates a QR code image', 'Bot sends the QR code back to the user'],
  sticker: ['User sends /sticker command with a prompt', 'Bot generates a sticker image based on the prompt', 'Bot sends the sticker to the user'],
  shorten: ['User sends /shorten command with a long URL', 'Bot shortens the URL using a URL shortening service', 'Bot sends the shortened URL back to the user'],
  apk: ['User sends /apk command with an app name or package', 'Bot searches for the APK file of the app', 'Bot sends the APK file or download link to the user'],
  alert: ['User sends /alert command with time and message', 'Bot sets a timer for the alert', 'When time is up, bot sends the alert message to the user'],
  ping: ['User sends /ping command', 'Bot responds with "Pong!" and latency information'],
  mayus: ['User sends /mayus command with text', 'Bot converts the text to uppercase', 'Bot sends the uppercase text back to the user'],
  md5: ['User sends /md5 command with text', 'Bot computes the MD5 hash of the text', 'Bot sends the MD5 hash back to the user'],
  dns: ['User sends /dns command with a domain name', 'Bot performs a DNS lookup for the domain', 'Bot sends the DNS records back to the user'],
  whois: ['User sends /whois command with a domain name', 'Bot performs a WHOIS lookup for the domain', 'Bot sends the WHOIS information back to the user'],
  news: ['User sends /news command with an optional topic', 'Bot fetches the latest news articles related to the topic', 'Bot sends a list of news headlines and links back to the user'],
  feedback: ['User sends /feedback command with a message', 'Bot receives the feedback and stores it for review', 'Bot sends a thank you message back to the user'],
  t: ['User sends /t command with text', 'Bot translates the text to English', 'Bot sends the translated text back to the user'],
  ttt: ['User sends /ttt command', 'Bot starts a tic-tac-toe game', 'User plays against the bot until the game ends'],
  settings: ['User sends /settings command', 'Bot shows the user their current settings', 'User can update settings through follow-up commands or buttons'],
  myid: ['User sends /myid command', 'Bot retrieves the user\'s Telegram ID and other relevant information', 'Bot sends this information back to the user'],
  minus: ['User sends /minus command with text', 'Bot converts the text to lowercase', 'Bot sends the lowercase text back to the user'],
  reverse: ['User sends /reverse command with text', 'Bot reverses the text string', 'Bot sends the reversed text back to the user'],
  capitalize: ['User sends /capitalize command with text', 'Bot capitalizes the first letter of each word in the text', 'Bot sends the capitalized text back to the user'],
  ipinfo: ['User sends /ipinfo command with an IP address', 'Bot retrieves geolocation and other information about the IP address', 'Bot sends this information back to the user'],
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
