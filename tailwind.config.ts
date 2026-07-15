import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ea5e9',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#06b6d4',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        accent: {
          DEFAULT: '#f1f5f9',
          foreground: '#0f172a',
        },
        card: '#ffffff',
        background: '#ffffff',
        foreground: '#0f172a',
      },
    },
  },
  plugins: [],
}

export default config
