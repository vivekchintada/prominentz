import React from 'react'
import BrandProminentzLogo, { ProminentzLogoVariant } from '@/components/brand/ProminentzLogo'

/**
 * Official Prominentz Brand Logo Component (UI Bridge)
 * Uses the official Pz ligature monogram and geometric brand typography.
 */

export interface ProminentzLogoProps {
  variant?: 'full' | 'icon' | 'wordmark' | ProminentzLogoVariant
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
  style?: React.CSSProperties
  color?: string
  inverse?: boolean
}

const SIZE_MAP = {
  sm: { box: 24, fontSize: 15, gap: 8 },
  md: { box: 30, fontSize: 17, gap: 10 },
  lg: { box: 38, fontSize: 22, gap: 12 },
  xl: { box: 48, fontSize: 28, gap: 14 },
}

export function ProminentzLogo({
  variant = 'full',
  size = 'md',
  className,
  style,
  inverse = false,
  color,
}: ProminentzLogoProps) {
  const dim = typeof size === 'number'
    ? { box: size, fontSize: Math.round(size * 0.55), gap: Math.round(size * 0.3) }
    : SIZE_MAP[size] || SIZE_MAP.md

  // Standalone Icon
  if (variant === 'icon' || variant === 'app-icon') {
    return (
      <BrandProminentzLogo
        variant="app-icon"
        size={dim.box}
        className={className}
        style={style}
      />
    )
  }

  // Standalone Wordmark
  if (variant === 'wordmark') {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: color || '#ffffff',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: dim.fontSize,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        prominentz
      </span>
    )
  }

  // Full Lockup: Official Pz App Icon + Wordmark
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
      <BrandProminentzLogo variant="app-icon" size={dim.box} />
      <span
        style={{
          color: color || '#ffffff',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: dim.fontSize,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Prominentz
      </span>
    </span>
  )
}

export default ProminentzLogo
