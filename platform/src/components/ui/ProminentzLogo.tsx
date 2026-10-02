import React from 'react'

/**
 * ProminentzLogo — canonical brand component
 * Cloud puff outline + pill wordmark — faithful to the approved reference.
 *
 * Usage:
 *   <ProminentzLogo />                    — full stacked (cloud above pill)
 *   <ProminentzLogo size="sm" />          — full inline (cloud + pill side-by-side)
 *   <ProminentzLogo variant="icon" />     — cloud puff only
 *   <ProminentzLogo variant="wordmark" /> — pill only
 *   <ProminentzLogo inverse />            — white strokes for dark backgrounds
 */

interface ProminentzLogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: React.CSSProperties
  /** Override primary brand colour (default: #5b45f5) */
  color?: string
  /** White stroke/pill for placement on dark backgrounds */
  inverse?: boolean
}

const SIZE_MAP = {
  sm: { icon: 24, pill: { h: 22, fontSize: 11, radius: 7, padH: 10 } },
  md: { icon: 32, pill: { h: 28, fontSize: 13, radius: 9, padH: 13 } },
  lg: { icon: 44, pill: { h: 36, fontSize: 17, radius: 10, padH: 16 } },
  xl: { icon: 60, pill: { h: 48, fontSize: 22, radius: 13, padH: 22 } },
}

/**
 * CloudIcon — 3-bump cloud puff outline matching the approved Prominentz reference.
 * viewBox 80×52, cubic Béziers for smooth, distinct bumps on top.
 *
 * Bump peaks (approx):
 *   Left   ≈ x 22, y 10
 *   Center ≈ x 44, y 2   (tallest)
 *   Right  ≈ x 64, y 10
 */
function CloudIcon({ size, strokeColor }: { size: number; strokeColor: string }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.65)}
      viewBox="0 0 80 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path
        d="
          M 8 44
          C 8 38 10 30 14 26
          C 12 14 20 8 30 10
          C 32 3 40 1 48 8
          C 52 3 60 4 64 10
          C 72 10 78 18 76 28
          C 80 32 78 42 70 44
          L 18 44
          C 12 46 8 44 8 44
          Z
        "
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProminentzLogo({
  variant = 'full',
  size = 'md',
  className,
  style,
  color = '#5b45f5',
  inverse = false,
}: ProminentzLogoProps) {
  const dim = SIZE_MAP[size]
  const strokeColor = inverse ? '#ffffff' : color
  const pillBg = inverse ? 'rgba(255,255,255,0.15)' : color

  const PillWordmark = () => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: pillBg,
        borderRadius: dim.pill.radius,
        paddingLeft: dim.pill.padH,
        paddingRight: dim.pill.padH,
        height: dim.pill.h,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
          fontWeight: 800,
          fontSize: dim.pill.fontSize,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        prominentz
      </span>
    </span>
  )

  if (variant === 'icon') {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      >
        <CloudIcon size={dim.icon} strokeColor={strokeColor} />
      </span>
    )
  }

  if (variant === 'wordmark') {
    return (
      <span className={className} style={{ display: 'inline-flex', ...style }}>
        <PillWordmark />
      </span>
    )
  }

  // full — sm: row, md+: column
  const isInline = size === 'sm'
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: isInline ? 'row' : 'column',
        alignItems: 'center',
        gap: isInline ? 6 : 4,
        ...style,
      }}
    >
      <CloudIcon size={dim.icon} strokeColor={strokeColor} />
      <PillWordmark />
    </span>
  )
}

export default ProminentzLogo
