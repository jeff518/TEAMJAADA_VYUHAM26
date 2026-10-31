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
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc4fd',
          400: '#36a5fa',
          500: '#0c87eb',
          600: '#026bc9',
          700: '#0355a2',
          800: '#074885',
          900: '#0c3d6e',
          950: '#082749',
        },
        slate: {
          850: '#172033',
          900: '#0f172a',
          950: '#090d16',
        },
        pipeline: {
          allow: '#10b981',
          quarantine: '#f59e0b',
          block: '#ef4444',
          pending: '#3b82f6',
          processing: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
