/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bbdffc',
          300: '#7cc2fa',
          400: '#33a2f7',
          500: '#0984e3', // primary blue
          600: '#0267c7',
          700: '#0352a1',
          800: '#074784',
          900: '#0c3c6e',
        },
        dark: {
          50: '#f6f6f7',
          100: '#eef0f2',
          200: '#d7dadf',
          300: '#b1b6bf',
          400: '#838a97',
          500: '#606775',
          600: '#4b515e',
          700: '#3e424d',
          800: '#1e2129', // dark background panels
          900: '#0f1115', // very dark background
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
