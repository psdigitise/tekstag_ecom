/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ──
        brand: {
          red:      '#C41E0E',   // deeper, more authoritative red
          'red-h':  '#A01608',   // hover state
          'red-s':  '#E8220F',   // subtle red
          black:    '#0D0C0B',   // warm near-black
          cream:    '#F8F5F0',   // warm off-white
          'cream-d':'#F0EBE3',   // darker cream
          gold:     '#B5922D',   // premium gold accent
          'gold-l': '#D4AD46',   // lighter gold
          blue:     '#1A52D8',   // cart button blue
          'blue-h': '#1240B0',   // hover
        },
        // ── Neutrals ──
        ink: {
          900: '#0D0C0B',
          800: '#1E1C1A',
          700: '#312E2A',
          500: '#5C5752',
          400: '#7D7872',
          300: '#A09A93',
          200: '#C8C2BA',
          100: '#E2DDD6',
          50:  '#F5F2EE',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(13,12,11,0.06), 0 4px 16px rgba(13,12,11,0.06)',
        'card-hover': '0 4px 6px rgba(13,12,11,0.04), 0 16px 40px rgba(13,12,11,0.12)',
        'nav':        '0 1px 0 rgba(13,12,11,0.08)',
        'nav-scroll': '0 4px 24px rgba(13,12,11,0.10)',
        'btn':        '0 1px 2px rgba(13,12,11,0.12)',
        'btn-hover':  '0 4px 12px rgba(196,30,14,0.28)',
        'inset-r':    'inset 0 0 0 1.5px #C41E0E',
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'xl': '12px',
        '2xl': '16px',
      },
      letterSpacing: {
        'super': '0.20em',
        'wider': '0.10em',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring':   'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'marquee': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'line-grow': {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.5)', opacity: '0.6' },
        },
      },
      animation: {
        'fade-up':   'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':   'fade-in 0.5s ease forwards',
        'shimmer':   'shimmer 2s linear infinite',
        'float':     'float 4s ease-in-out infinite',
        'marquee':   'marquee 28s linear infinite',
        'scale-in':  'scale-in 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'line-grow': 'line-grow 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
