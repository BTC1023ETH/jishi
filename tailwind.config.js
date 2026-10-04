/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0E11',
          card: '#1E2329',
          card2: '#181C21',
        },
        binance: '#F0B90B',
        text: {
          DEFAULT: '#EAECEF',
          secondary: '#848E9C',
        },
        line: '#2B3139',
        fw: {
          survival: '#F0A020',
          growth: '#F0B90B',
          leisure: '#2EBD85',
          health: '#4A9EFF',
        },
        nourish: '#2EBD85',
        neutral: '#848E9C',
        drain: '#F6465D',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl2: '1.25rem',
        '2xl': '1rem',
      },
      boxShadow: {
        gold: '0 0 40px rgba(240,185,11,0.35)',
      },
    },
  },
  plugins: [],
};
