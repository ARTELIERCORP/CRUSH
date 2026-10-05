import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crush: {
          bg: '#0b0d13',
          card: 'rgba(15, 18, 26, 0.72)',
          border: 'rgba(255, 255, 255, 0.12)',
          accent: '#10b981',
          highlight: '#06b6d4',
        },
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '24px',
        '3xl': '40px',
      },
    },
  },
  plugins: [],
} satisfies Config;
