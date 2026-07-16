import type { Config } from 'tailwindcss'

// "Modern clinical" theme — calm teal primary, cool blue secondary, cool-neutral
// surfaces. Clean and trust-building rather than playful; no green/amber warmth.
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#0D9488',
        background: '#F7F9FB',
        foreground: '#1E293B',
        primary: {
          DEFAULT: '#0D9488',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#EEF2F6',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#E6F4F3',
          foreground: '#334155',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E293B',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E293B',
        },
        success: {
          DEFAULT: '#0D9488',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(30, 41, 59, 0.05)',
        DEFAULT: '0 2px 8px -2px rgba(30, 41, 59, 0.07)',
        md: '0 6px 20px -4px rgba(30, 41, 59, 0.09)',
        lg: '0 12px 32px -8px rgba(30, 41, 59, 0.12)',
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
