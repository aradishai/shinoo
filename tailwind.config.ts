import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFFFFF',
          50: '#FFFFFF',
          100: '#FFFFFF',
          200: '#E5E5E5',
          300: '#CCCCCC',
          400: '#B3B3B3',
          500: '#FFFFFF',
          600: '#E5E5E5',
          700: '#CCCCCC',
          800: '#999999',
          900: '#666666',
        },
        secondary: {
          DEFAULT: '#FFD600',
          50: '#FFFDE7',
          100: '#FFF9C4',
          200: '#FFF176',
          300: '#FFE836',
          400: '#FFD600',
          500: '#FFCA00',
          600: '#FFB300',
          700: '#FF9800',
          800: '#FF6F00',
          900: '#E65100',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          50: '#1A1A1A',
          100: '#111111',
          200: '#0A0A0A',
          card: '#1E1E1E',
          border: '#2A2A2A',
          muted: '#333333',
        },
      },
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient':
          'linear-gradient(135deg, #0A0A0A 0%, #111827 50%, #0A0A0A 100%)',
        'card-gradient':
          'linear-gradient(180deg, #1E1E1E 0%, #181818 100%)',
        'green-glow':
          'radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
      },
      boxShadow: {
        'green': '0 0 20px rgba(255, 255, 255, 0.15)',
        'green-sm': '0 0 10px rgba(255, 255, 255, 0.08)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
}
export default config
