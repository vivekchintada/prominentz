'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Toaster } from 'sonner'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/**
 * The app's single Sonner toaster. Mounted once in the root layout.
 * Follows the `data-theme` attribute that ThemeToggle sets on <html>.
 * Call `toast()` from 'sonner' anywhere in client code to show a toast.
 */
export function AppToaster() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(readTheme())
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      duration={4000}
      style={
        {
          '--normal-bg': 'var(--color-bg-raised)',
          '--normal-border': 'var(--color-border)',
          '--normal-text': 'var(--color-text-primary)',
          '--border-radius': 'var(--radius-lg)',
          fontFamily: 'var(--font-sans)',
          zIndex: 'var(--z-toast)',
        } as CSSProperties
      }
    />
  )
}
