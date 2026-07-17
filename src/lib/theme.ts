export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'careconnect-theme'

// No stored preference means "follow OS" — index.css's prefers-color-scheme
// block already handles that case, so this only reports an explicit choice.
export function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export function getEffectiveTheme(): Theme {
  return getStoredTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  localStorage.setItem(STORAGE_KEY, theme)
}
