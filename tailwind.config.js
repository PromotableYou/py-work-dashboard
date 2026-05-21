/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50:  '#FAF9F7',
          100: '#F4F1EC',
          200: '#EDE9E2',
          300: '#DDD7CE',
          400: '#C4BAB0',
          500: '#A8998D',
          600: '#8A7E76',
          700: '#6B6059',
          800: '#4A4039',
          900: '#2D2520',
        },
        warm: {
          50:  '#FEF7F0',
          100: '#FDEBD8',
          200: '#FAD4B0',
          300: '#F6B880',
          400: '#F09450',
          500: '#E8742A',
          600: '#C95D1C',
          700: '#A04818',
          800: '#7A3615',
          900: '#5C2A12',
        }
      }
    }
  },
  plugins: [],
}
