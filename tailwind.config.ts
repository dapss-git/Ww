import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#08090D',
        surface: '#11131A',
        raised: '#181B25',
        purple: { DEFAULT: '#5B3A8E', soft: '#7a55b3' },
        crimson: { DEFAULT: '#A83246', soft: '#c9485d' },
        gold: { DEFAULT: '#C9A45C', soft: '#e0c183' },
        ink: '#F1F1F4',
        mute: '#9b9dac',
      },
      fontFamily: {
        display: ['Cinzel', '"Trajan Pro"', '"Palatino Linotype"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(201,164,92,0.35)',
        moon: '0 0 80px 10px rgba(241,241,244,0.18)',
        crimson: '0 0 30px -6px rgba(168,50,70,0.5)',
      },
      keyframes: {
        drift: { '0%': { transform: 'translateX(-6%)' }, '100%': { transform: 'translateX(6%)' } },
        pulseSoft: { '0%,100%': { opacity: '0.7' }, '50%': { opacity: '1' } },
      },
      animation: {
        drift: 'drift 28s ease-in-out infinite alternate',
        pulseSoft: 'pulseSoft 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
