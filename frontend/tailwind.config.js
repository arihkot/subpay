/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stellar: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#baddff',
          300: '#7cc2ff',
          400: '#36a3ff',
          500: '#0c84f3',
          600: '#0066cc',
          700: '#0052a3',
          800: '#004586',
          900: '#003b6f',
        },
      },
    },
  },
  plugins: [],
};
