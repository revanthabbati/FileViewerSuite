import { useEffect, useState } from 'react'

const STORAGE_KEY = 'viewer-suite-theme'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readStored)
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // storage unavailable (private mode) — theme just won't persist
    }
  }, [theme])
  return [theme, setTheme]
}
