/** The playground's theme switch, shared by its pages. */

type Theme = 'auto' | 'light' | 'dark'
const THEME_KEY = 'tc-docs-theme'

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme))
  }
}

/** Wire the header's Auto / Light / Dark buttons, starting from the saved choice. */
export function setupThemeSwitch(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) {
    button.addEventListener('click', () => applyTheme(button.dataset.themeChoice as Theme))
  }
  applyTheme(readTheme())
}
