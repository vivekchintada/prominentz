import React from 'react'

/**
 * Resto Brand Logo (formerly ProminentzLogo)
 * Unified minimalist aesthetic inspired by Midday.ai.
 * Monochrome square [R] monogram mark + crisp modern wordmark.
 */

interface ProminentzLogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: React.CSSProperties
  color?: string
  inverse?: boolean
}

const SIZE_MAP = {
  sm: { box: 22, fontMark: 12, fontSize: 14, gap: 8, radius: 5 },
  md: { box: 28, fontMark: 14, fontSize: 17, gap: 10, radius: 6 },
  lg: { box: 36, fontMark: 18, fontSize: 22, gap: 12, radius: 8 },
  xl: { box: 48, fontMark: 24, fontSize: 28, gap: 14, radius: 10 },
}

export function ProminentzLogo({
  variant = 'full',
  size = 'md',
  className,
  style,
  inverse = false,
}: ProminentzLogoProps) {
  const dim = SIZE_MAP[size]

  const Mark = (
    <span
      style={{
        width: dim.box,
        height: dim.box,
        borderRadius: dim.radius,
        backgroundColor: '#ffffff',
        color: '#000000',
        fontWeight: 800,
        fontSize: dim.fontMark,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
      aria-hidden="true"
    >
      R
    </span>
  )

  const Text = (
    <span
      style={{
        color: '#ffffff',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 700,
        fontSize: dim.fontSize,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      Resto
    </span>
  )

  if (variant === 'icon') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
        {Mark}
      </span>
    )
  }

  if (variant === 'wordmark') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
        {Text}
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dim.gap,
        textDecoration: 'none',
        ...style,
      }}
    >
      {Mark}
      {Text}
    </span>
  )
}

export default ProminentzLogo
