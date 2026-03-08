import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'trelk-theme';

// Hex-to-RGB triplet helper
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.substring(0, 2), 16)} ${parseInt(h.substring(2, 4), 16)} ${parseInt(h.substring(4, 6), 16)}`;
}

// Paletas de colores por tema
const themes = {
  dark: {
    '--tg-bg': '#1a2026',
    '--tg-secondary': '#212a33',
    '--tg-surface': '#293540',
    '--tg-accent': '#248BDA',
    '--tg-text': '#ffffff',
    '--tg-text-secondary': '#7d8b97',
    '--tg-hint': '#7d8b97',
    '--tg-link': '#5eaadf',
    '--tg-destructive': '#e5545e',
    '--tg-success': '#50b85d',
    '--tg-border': '#293540',
  },
  light: {
    '--tg-bg': '#f0f2f5',
    '--tg-secondary': '#ffffff',
    '--tg-surface': '#e8eaed',
    '--tg-accent': '#2481cc',
    '--tg-text': '#1a1a1a',
    '--tg-text-secondary': '#6b7280',
    '--tg-hint': '#6b7280',
    '--tg-link': '#2481cc',
    '--tg-destructive': '#dc3545',
    '--tg-success': '#28a745',
    '--tg-border': '#d1d5db',
  },
};

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  const vars = themes[resolved];

  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
    // Also set the RGB triplet var for Tailwind opacity modifiers
    root.style.setProperty(`${key}-rgb`, hexToRgb(value));
  }

  // Update body classes for Tailwind
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);

  // Update Telegram WebApp colors if available
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.setHeaderColor(vars['--tg-secondary']);
      tg.setBackgroundColor(vars['--tg-bg']);
      tg.setBottomBarColor(vars['--tg-secondary']);
    } catch {}
  }
}

function loadSaved(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {}
  return 'dark';
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: loadSaved(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    set({ mode });
  },
  init: () => {
    const mode = loadSaved();
    applyTheme(mode);
    set({ mode });

    // Escuchar cambios en system theme
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = loadSaved();
        if (current === 'system') {
          applyTheme('system');
        }
      });
    }
  },
}));
