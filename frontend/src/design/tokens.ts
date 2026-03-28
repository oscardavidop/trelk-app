/* ─── Design Tokens — Trelk Visual Identity ─── */

export const BRAND = {
  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    card: '24px',
    button: '16px',
    pill: '999px',
    icon: '14px',
  },

  blur: {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
    glass: 'backdrop-blur-xl',
  },

  shadows: {
    soft: '0 8px 32px rgba(0,0,0,0.25)',
    card: '0 4px 24px rgba(0,0,0,0.15)',
    glow: '0 0 24px',
    elevated: '0 12px 40px rgba(0,0,0,0.3)',
    inner: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  },

  motion: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    spring: { type: 'spring' as const, stiffness: 400, damping: 30 },
    springGentle: { type: 'spring' as const, stiffness: 300, damping: 25 },
    easeOut: [0.25, 0.1, 0.25, 1] as const,
  },

  spacing: {
    pagePx: 'px-5',
    sectionGap: 'mt-8',
    cardGap: 'gap-3',
  },

  opacity: {
    glowOrb: 0.15,
    gradientOverlay: 0.1,
    glassBorder: 0.15,
    hoverOverlay: 0.04,
  },
} as const;

export type BrandTokens = typeof BRAND;
