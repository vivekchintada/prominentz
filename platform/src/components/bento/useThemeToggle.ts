'use client'

import { useCallback, useEffect, useState } from 'react'

/** Reads and flips <html data-theme>, with the same storage keys the rest of the app uses. */
export function useThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
  }, [])

  const toggle = useCallback(() => {
    const html = document.documentElement
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    html.classList.add('theme-transitioning')
    html.setAttribute('data-theme', next)
    setIsDark(next === 'dark')
    try {
      localStorage.setItem('resto-theme', next)
      localStorage.setItem('prominentz-theme', next)
    } catch {}
    window.setTimeout(() => html.classList.remove('theme-transitioning'), 320)
  }, [])

  return { isDark, toggle }
}
