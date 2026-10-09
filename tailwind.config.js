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
        dnd: {
          dark: '#0d1117',
          surface: '#161b22',
          card: '#21262d',
          border: '#30363d',
          accent: '#7c3aed',
          amber: '#d97706',
          crimson: '#dc2626',
          gold: '#eab308',
          glow: 'rgba(124, 58, 237, 0.4)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sound-wave': 'soundWave 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        soundWave: {
          '0%': { transform: 'scaleY(0.2)' },
          '100%': { transform: 'scaleY(1)' },
        }
      }
    },
  },
  plugins: [],
}
