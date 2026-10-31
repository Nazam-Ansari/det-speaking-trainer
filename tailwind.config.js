/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eefbf3', 100: '#d6f5e1', 200: '#b0eac8', 300: '#7dd9a8',
          400: '#47c083', 500: '#24a568', 600: '#178553', 700: '#136a45',
          800: '#125439', 900: '#104531', 950: '#07271c',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        pulse_ring: { '0%': { transform: 'scale(1)', opacity: '0.6' }, '100%': { transform: 'scale(1.8)', opacity: '0' } },
        talk: { '0%, 100%': { transform: 'scale(1) rotate(0deg)' }, '25%': { transform: 'scale(1.06) rotate(-3deg)' }, '75%': { transform: 'scale(1.03) rotate(3deg)' } },
        sound_bar: { '0%, 100%': { height: '0.375rem' }, '50%': { height: '1.5rem' } },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out',
        'pulse-ring': 'pulse_ring 1.4s ease-out infinite',
        talk: 'talk 0.5s ease-in-out infinite',
        'sound-bar': 'sound_bar 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
