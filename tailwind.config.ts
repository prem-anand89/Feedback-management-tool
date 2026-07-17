import type { Config } from 'tailwindcss'

// "CareConnect Sage" — deep plum + sage green over warm cream neutrals, drawn
// from the CareConnect logo. Colors are defined as HSL channel triplets in
// src/index.css (:root for light, a prefers-color-scheme block for dark), so
// every token flips automatically for dark mode and still supports Tailwind's
// /opacity modifiers (bg-primary/10, etc.).
const hsl = (v: string) => `hsl(var(${v}) / <alpha-value>)`

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: hsl('--border'),
        input: hsl('--input'),
        ring: hsl('--ring'),
        background: hsl('--background'),
        foreground: hsl('--foreground'),
        primary: { DEFAULT: hsl('--primary'), foreground: hsl('--primary-foreground') },
        secondary: { DEFAULT: hsl('--secondary'), foreground: hsl('--secondary-foreground') },
        destructive: { DEFAULT: hsl('--destructive'), foreground: hsl('--destructive-foreground') },
        muted: { DEFAULT: hsl('--muted'), foreground: hsl('--muted-foreground') },
        accent: { DEFAULT: hsl('--accent'), foreground: hsl('--accent-foreground') },
        card: { DEFAULT: hsl('--card'), foreground: hsl('--card-foreground') },
        popover: { DEFAULT: hsl('--popover'), foreground: hsl('--popover-foreground') },
        success: { DEFAULT: hsl('--secondary'), foreground: hsl('--secondary-foreground') },
        // Category / status chips — icon badges and pills only.
        chipBlue: { DEFAULT: hsl('--chip-blue'), foreground: hsl('--chip-blue-fg') },
        chipAmber: { DEFAULT: hsl('--chip-amber'), foreground: hsl('--chip-amber-fg') },
        chipGreen: { DEFAULT: hsl('--chip-green'), foreground: hsl('--chip-green-fg') },
        chipPurple: { DEFAULT: hsl('--chip-purple'), foreground: hsl('--chip-purple-fg') },
        chipPink: { DEFAULT: hsl('--chip-pink'), foreground: hsl('--chip-pink-fg') },
        // Fixed brand hues for the logo mark (recognisable in both themes).
        brandPlum: '#5B3A63',
        brandGreen: '#5C8A6B',
      },
      borderRadius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem', '2xl': '1.5rem' },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(45, 35, 45, 0.05)',
        DEFAULT: '0 2px 10px -3px rgba(45, 35, 45, 0.08)',
        md: '0 6px 22px -6px rgba(45, 35, 45, 0.10)',
        lg: '0 14px 36px -10px rgba(45, 35, 45, 0.16)',
      },
      fontFamily: {
        sans: ['"Nunito"', 'ui-rounded', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
