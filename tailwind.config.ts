import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#142126',
        forest: '#075f73',
        teal: '#0a7185',
        mint: '#edf8f3',
        ivory: '#fbfaf7',
        gold: '#2f7d32',
        line: '#d6e5e3',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 28px 90px rgba(20, 33, 38, 0.14)',
        card: '0 16px 42px rgba(20, 33, 38, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
