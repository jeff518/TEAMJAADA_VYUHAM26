/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a6f6',
          500: '#0c87eb',
          600: '#006ac9',
          700: '#0155a3',
          800: '#064886',
          900: '#0b3d6f',
          950: '#07264a',
        },
        slate: {
          850: '#172033',
          950: '#0b1120',
        },
        security: {
          allow: '#10b981',
          quarantine: '#f59e0b',
          block: '#ef4444',
          pending: '#6b7280',
          info: '#3b82f6',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
