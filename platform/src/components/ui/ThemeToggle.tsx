'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('resto-theme') as Theme) || (localStorage.getItem('prominentz-theme') as Theme) || 'dark'
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  // Add transition class
  html.classList.add('theme-transitioning')
  html.setAttribute('data-theme', theme)
  try {
    localStorage.setItem('resto-theme', theme)
    localStorage.setItem('prominentz-theme', theme)
  } catch {}
  // Remove transition class after animation completes
  setTimeout(() => html.classList.remove('theme-transitioning'), 260)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    applyTheme(stored)
    requestAnimationFrame(() => {
      setTheme(stored)
      setMounted(true)
    })
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) return <div style={{ width: 34, height: 34 }} />

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        background: 'var(--color-bg-card)',
        boxShadow: 'inset 0 0 0 0.5px var(--color-border-strong)',
        color: 'var(--color-text-secondary)',
        transition: 'all 120ms ease',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
