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
        },
        blush: {
          50:  '#FFF0F5',
          100: '#FFE0EC',
          200: '#FFC2D8',
          300: '#FF99BB',
          400: '#FF6699',
          500: '#F0457A',
          600: '#D42E63',
          700: '#B0204F',
          800: '#8C173D',
          900: '#6B1230',
        }
      }
    }
  },
  plugins: [],
}
