export type Theme = 'system' | 'dark' | 'light'

const KEY = 'nx_theme'

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) ?? 'system'
}

export function applyTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export function initTheme() {
  applyTheme(getTheme())
  // react to system changes when theme=system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system')
  })
}
