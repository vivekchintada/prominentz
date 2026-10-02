'use client'

import React from 'react'

interface CookieSettingsButtonProps {
  style?: React.CSSProperties
  className?: string
}

export function CookieSettingsButton({ style, className }: CookieSettingsButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prominentz:open-cookie-settings'))
        }
      }}
      style={
        style || {
          background: 'none',
          border: 'none',
          color: 'inherit',
          font: 'inherit',
          cursor: 'pointer',
          padding: 0,
          textDecoration: 'underline',
        }
      }
    >
      Cookie Settings
    </button>
  )
}
