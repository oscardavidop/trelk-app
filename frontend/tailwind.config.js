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
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
