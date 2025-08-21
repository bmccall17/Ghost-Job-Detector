/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        ghost: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          500: '#71717a',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        }
      }
    },
  },
  plugins: [],
}