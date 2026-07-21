/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Cormorant Garamond"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        cinzel: ['Cinzel', 'serif']
      },
      borderRadius: {
        lg: '6px',
        md: '4px',
        sm: '3px'
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#1E293B',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E293B'
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E293B'
        },
        primary: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF'
        },
        muted: {
          DEFAULT: '#F8FAFC',
          foreground: '#64748B'
        },
        accent: {
          DEFAULT: '#F8FAFC',
          foreground: '#0F172A'
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF'
        },
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#10B981',
        'brand-navy': '#0F172A',
        warning: '#F59E0B',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        marquee: 'marquee 20s linear infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
