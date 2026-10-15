/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Dark-mode shell/dashboard palette (redesign 2026-10-15). `accent` is the brand colour.
        dk: { bg: '#10141a', side: '#0a0e14', low: '#181c22', card: '#1b1f26', high: '#262a31', line: '#31353c', mute: '#8b8e99' },
        accent: { DEFAULT: '#3b82f6', soft: '#adc6ff', on: '#00174b' },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
