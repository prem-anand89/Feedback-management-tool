import type { Config } from 'tailwindcss'

// "Warm & approachable" theme — soft cream surfaces, a calm warm-green primary,
// amber accents, generous rounding and big touch targets. Tuned to feel human
// and low-anxiety for patients while staying professional for clinic staff.
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#EAE1D3',
        input: '#EAE1D3',
        ring: '#2FA36B',
        background: '#FBF7F0',
        foreground: '#33302B',
        primary: {
          DEFAULT: '#2FA36B',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5A524',
          foreground: '#3A2C12',
        },
        destructive: {
          DEFAULT: '#E5544B',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F3ECE0',
          foreground: '#8B8173',
        },
        accent: {
          DEFAULT: '#F1E9DB',
          foreground: '#5C5347',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#33302B',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#33302B',
        },
        success: {
          DEFAULT: '#2FA36B',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(74, 62, 45, 0.05)',
        DEFAULT: '0 2px 8px -2px rgba(74, 62, 45, 0.08)',
        md: '0 6px 20px -4px rgba(74, 62, 45, 0.10)',
        lg: '0 12px 32px -8px rgba(74, 62, 45, 0.14)',
      },
      fontFamily: {
        sans: [
          '"Nunito"',
          'ui-rounded',
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
