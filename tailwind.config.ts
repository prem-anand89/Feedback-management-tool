import type { Config } from 'tailwindcss'

// "Lovable navy" theme — near-black navy as the sole brand color (sidebar,
// active states, charts), white/slate neutrals for chrome, and a small set
// of soft pastel "chip" colors used only for icon badges and status pills.
// Color carries meaning, not brand — matches the reference design pulled
// from the Lovable dashboard/complaints/patients/analytics screens.
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#0F172A',
        background: '#F8FAFC',
        foreground: '#0F172A',
        primary: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#F1F5F9',
          foreground: '#334155',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
        success: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF',
        },
        // Pastel "chip" colors — icon badges and status pills only, never
        // primary UI chrome or buttons.
        chipBlue: { DEFAULT: '#DBEAFE', foreground: '#2563EB' },
        chipAmber: { DEFAULT: '#FEF3C7', foreground: '#D97706' },
        chipGreen: { DEFAULT: '#D1FAE5', foreground: '#059669' },
        chipPurple: { DEFAULT: '#EDE9FE', foreground: '#7C3AED' },
        chipPink: { DEFAULT: '#FCE7F3', foreground: '#DB2777' },
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        DEFAULT: '0 2px 8px -2px rgba(15, 23, 42, 0.07)',
        md: '0 6px 20px -4px rgba(15, 23, 42, 0.09)',
        lg: '0 12px 32px -8px rgba(15, 23, 42, 0.12)',
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
