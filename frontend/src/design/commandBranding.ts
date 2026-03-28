/* ─── Command Category Branding ─── */

export interface CategoryBrand {
  gradient: string;
  iconBg: string;
  glow: string;
  accent: string;
  glowRgb: string;
}

export const COMMAND_BRANDING: Record<string, CategoryBrand> = {
  music: {
    gradient: 'from-pink-500 to-purple-600',
    iconBg: 'bg-pink-500/10',
    glow: 'rgba(236,72,153,0.4)',
    accent: '#ec4899',
    glowRgb: '236 72 153',
  },
  utilities: {
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-blue-500/10',
    glow: 'rgba(59,130,246,0.4)',
    accent: '#3b82f6',
    glowRgb: '59 130 246',
  },
  entertainment: {
    gradient: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-500/10',
    glow: 'rgba(245,158,11,0.4)',
    accent: '#f59e0b',
    glowRgb: '245 158 11',
  },
  media: {
    gradient: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-500/10',
    glow: 'rgba(244,63,94,0.4)',
    accent: '#f43f5e',
    glowRgb: '244 63 94',
  },
  ai: {
    gradient: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-emerald-500/10',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#10b981',
    glowRgb: '16 185 129',
  },
  social: {
    gradient: 'from-cyan-400 to-blue-500',
    iconBg: 'bg-cyan-500/10',
    glow: 'rgba(6,182,212,0.4)',
    accent: '#06b6d4',
    glowRgb: '6 182 212',
  },
  tools: {
    gradient: 'from-red-400 to-rose-500',
    iconBg: 'bg-red-500/10',
    glow: 'rgba(239,68,68,0.4)',
    accent: '#ef4444',
    glowRgb: '239 68 68',
  },
  fun: {
    gradient: 'from-orange-400 to-amber-500',
    iconBg: 'bg-orange-500/10',
    glow: 'rgba(249,115,22,0.4)',
    accent: '#f97316',
    glowRgb: '249 115 22',
  },
  downloader: {
    gradient: 'from-sky-400 to-blue-500',
    iconBg: 'bg-sky-500/10',
    glow: 'rgba(14,165,233,0.4)',
    accent: '#0ea5e9',
    glowRgb: '14 165 233',
  },
  general: {
    gradient: 'from-violet-400 to-purple-500',
    iconBg: 'bg-violet-500/10',
    glow: 'rgba(139,92,246,0.4)',
    accent: '#8b5cf6',
    glowRgb: '139 92 246',
  },
  information: {
    gradient: 'from-teal-400 to-emerald-500',
    iconBg: 'bg-teal-500/10',
    glow: 'rgba(20,184,166,0.4)',
    accent: '#14b8a6',
    glowRgb: '20 184 166',
  },
  uncategorized: {
    gradient: 'from-gray-400 to-slate-500',
    iconBg: 'bg-gray-500/10',
    glow: 'rgba(107,114,128,0.4)',
    accent: '#6b7280',
    glowRgb: '107 114 128',
  },
};

/** Safely get branding for a category */
export function getCategoryBrand(category: string): CategoryBrand {
  return COMMAND_BRANDING[category] ?? COMMAND_BRANDING.uncategorized;
}
