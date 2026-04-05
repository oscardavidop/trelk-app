import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';
export type DynamicIntensity = 'low' | 'medium' | 'high';

const STORAGE_KEY = 'trelk-theme';
const INTENSITY_KEY = 'trelk-dynamic-intensity';

// Hex-to-RGB triplet helper
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.substring(0, 2), 16)} ${parseInt(h.substring(2, 4), 16)} ${parseInt(h.substring(4, 6), 16)}`;
}

// Paletas de colores por tema
const themes = {
dark: {
  // '--tg-bg': '#15171a',        // sube luminosidad (menos negro puro)
  // '--tg-secondary': '#1e2126', // capas más claras
  // '--tg-surface': '#262a30',   // cards bien diferenciadas
'--tg-bg': '#181a1f',
'--tg-secondary': '#22252b',
'--tg-surface': '#2b3037',
  '--tg-accent': '#3b82f6',
  '--tg-link': '#60a5fa',

  '--tg-text': '#ffffff',
  '--tg-text-secondary': '#a3adb8', // un poco más claro
  '--tg-hint': '#a3adb8',

  '--tg-destructive': '#e5545e',
  '--tg-success': '#50b85d',

  '--tg-border': '#2c3137',    // más visible pero sin azul
},

  light: {
    '--tg-bg': '#f0f2f5',
    '--tg-secondary': '#ffffff',
    '--tg-surface': '#e8eaed',

    '--tg-accent': '#3b82f6',
    '--tg-link': '#60a5fa',

    '--tg-text': '#1a1a1a',
    '--tg-text-secondary': '#6b7280',
    '--tg-hint': '#6b7280',

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
    } catch { }
  }
}

function loadSaved(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch { }
  return 'dark';
}

function loadIntensity(): DynamicIntensity {
  try {
    const saved = localStorage.getItem(INTENSITY_KEY);
    if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
  } catch { }
  return 'medium';
}

interface ThemeState {
  mode: ThemeMode;
  intensity: DynamicIntensity;
  setMode: (mode: ThemeMode) => void;
  setIntensity: (intensity: DynamicIntensity) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: loadSaved(),
  intensity: loadIntensity(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    set({ mode });
  },
  setIntensity: (intensity) => {
    localStorage.setItem(INTENSITY_KEY, intensity);
    // Apply CSS custom property for intensity
    const root = document.documentElement;
    const scale = intensity === 'low' ? '0.4' : intensity === 'high' ? '1' : '0.7';
    root.style.setProperty('--trelk-intensity', scale);
    set({ intensity });
  },
  init: () => {
    const mode = loadSaved();
    const intensity = loadIntensity();
    applyTheme(mode);
    // Apply intensity on init
    const root = document.documentElement;
    const scale = intensity === 'low' ? '0.4' : intensity === 'high' ? '1' : '0.7';
    root.style.setProperty('--trelk-intensity', scale);
    set({ mode, intensity });

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
