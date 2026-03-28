/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
      },
      colors: {
        // Telegram-style theme — RGB triplet vars for opacity modifier support
        'tg-bg': 'rgb(var(--tg-bg-rgb, 26 32 38) / <alpha-value>)',
        'tg-secondary': 'rgb(var(--tg-secondary-rgb, 33 42 51) / <alpha-value>)',
        'tg-section': 'rgb(var(--tg-secondary-rgb, 33 42 51) / <alpha-value>)',
        'tg-surface': 'rgb(var(--tg-surface-rgb, 41 53 64) / <alpha-value>)',
        'tg-accent': 'rgb(var(--tg-accent-rgb, 36 139 218) / <alpha-value>)',
        'tg-text': 'rgb(var(--tg-text-rgb, 255 255 255) / <alpha-value>)',
        'tg-text-secondary': 'rgb(var(--tg-text-secondary-rgb, 125 139 151) / <alpha-value>)',
        'tg-hint': 'rgb(var(--tg-hint-rgb, 125 139 151) / <alpha-value>)',
        'tg-link': 'rgb(var(--tg-link-rgb, 94 170 223) / <alpha-value>)',
        'tg-destructive': 'rgb(var(--tg-destructive-rgb, 229 84 94) / <alpha-value>)',
        'tg-success': 'rgb(var(--tg-success-rgb, 80 184 93) / <alpha-value>)',
        'tg-border': 'rgb(var(--tg-border-rgb, 41 53 64) / <alpha-value>)',
      },
      borderRadius: {
        'brand-xs': '8px',
        'brand-sm': '12px',
        'brand-md': '16px',
        'brand-lg': '20px',
        'brand-xl': '24px',
        'brand-2xl': '28px',
        'brand-pill': '999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.3' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
