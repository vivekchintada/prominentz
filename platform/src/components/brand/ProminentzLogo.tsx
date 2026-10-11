import React from 'react'

export type ProminentzLogoVariant =
  | 'primary'      // Horizontal on purple: Dark P, White z + White 'prominentz' wordmark
  | 'primary-dark' // Horizontal on dark: Purple mark + White wordmark
  | 'stacked'      // Centered on purple: White P, Dark z + 'prominentz' with z-underline
  | 'app-icon'     // Squircle app icon: Purple bg, White P, Dark z
  | 'favicon'      // Square compact: Purple bg, White P, Dark z
  | 'one-color'    // Monochrome black on light: Black Pz mark + Black wordmark
  | 'one-color-white' // Monochrome white on dark: White Pz mark + White wordmark
  | 'symbol'       // Standalone Pz symbol mark

interface ProminentzLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: ProminentzLogoVariant
  size?: number | string
  height?: number | string
  className?: string
  showContainer?: boolean
}

/**
 * Official Prominentz Brand Identity Vector Component
 * Faithfully matches the brand guide:
 * - Bold Pz ligature monogram (z nestled into lower right of P stem)
 * - Lowercase geometric wordmark "prominentz"
 * - Signature horizontal accent bar beneath the letter 'z'
 * - Official electric brand purple (#6835F9)
 */
export function ProminentzLogo({
  variant = 'primary',
  size,
  height,
  className,
  showContainer = true,
  ...props
}: ProminentzLogoProps) {
  // ── 1. STANDALONE APP ICON / SQUIRCLE ──────────────────────────────────────
  if (variant === 'app-icon' || variant === 'favicon') {
    const defaultDim = variant === 'favicon' ? 32 : 64
    const renderWidth = size || defaultDim
    const renderHeight = height || size || defaultDim

    return (
      <svg
        viewBox="0 0 128 128"
        width={renderWidth}
        height={renderHeight}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Prominentz App Icon"
        {...props}
      >
        <rect width="128" height="128" rx={variant === 'favicon' ? 24 : 32} fill="#6835F9" />
        {/* Monogram: White P + Dark Black z */}
        <g id="pz-mark" transform="translate(14, 16)">
          {/* Letter P (White) */}
          <path
            d="M 12 10 H 54 C 69.46 10 82 22.54 82 38 C 82 53.46 69.46 66 54 66 H 36 V 96 H 12 Z M 36 28 V 48 H 52 C 57.52 48 62 43.52 62 38 C 62 32.48 57.52 28 52 28 Z"
            fill="#FFFFFF"
          />
          {/* Letter z (Deep Black, nested at lower right) */}
          <path
            d="M 36 54 H 82 V 66 L 54 84 H 82 V 96 H 36 V 84 L 64 66 H 36 Z"
            fill="#141416"
          />
        </g>
      </svg>
    )
  }

  // ── 2. STACKED LOGO (Large Monogram + Wordmark with Underline) ──────────────
  if (variant === 'stacked') {
    const renderWidth = size || 320
    const renderHeight = height || 280

    return (
      <svg
        viewBox="0 0 320 280"
        width={renderWidth}
        height={renderHeight}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Prominentz Stacked Brand Logo"
        {...props}
      >
        {showContainer && (
          <rect width="320" height="280" rx="36" fill="#6835F9" />
        )}
        {/* Monogram Center */}
        <g id="pz-monogram-stacked" transform="translate(110, 32)">
          {/* P (White) */}
          <path
            d="M 12 10 H 54 C 69.46 10 82 22.54 82 38 C 82 53.46 69.46 66 54 66 H 36 V 96 H 12 Z M 36 28 V 48 H 52 C 57.52 48 62 43.52 62 38 C 62 32.48 57.52 28 52 28 Z"
            fill="#FFFFFF"
          />
          {/* z (Black) */}
          <path
            d="M 36 54 H 82 V 66 L 54 84 H 82 V 96 H 36 V 84 L 64 66 H 36 Z"
            fill="#141416"
          />
        </g>

        {/* Wordmark: prominentz */}
        <text
          x="160"
          y="200"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
          fontWeight="800"
          fontSize="36"
          letterSpacing="-0.04em"
        >
          prominentz
        </text>

        {/* Signature Accent Bar under the letter 'z' */}
        <rect x="238" y="210" width="16" height="3.5" rx="1.75" fill="#FFFFFF" />
      </svg>
    )
  }

  // ── 3. ONE-COLOR MONOCHROME (Black or White) ────────────────────────────────
  if (variant === 'one-color' || variant === 'one-color-white') {
    const isWhite = variant === 'one-color-white'
    const color = isWhite ? '#FFFFFF' : '#141416'
    const cutoutBg = isWhite ? '#141416' : '#FFFFFF'
    const renderHeight = height || (size ? Number(size) * 0.35 : 44)
    const renderWidth = size || 240

    return (
      <svg
        viewBox="0 0 280 60"
        width={renderWidth}
        height={renderHeight}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Prominentz Monochrome Logo"
        {...props}
      >
        {/* Monogram */}
        <g id="pz-monogram-onecolor" transform="translate(4, 2)">
          {/* Letter P */}
          <path
            d="M 6 4 H 30 C 38.8 4 46 11.2 46 20 C 46 28.8 38.8 36 30 36 H 20 V 54 H 6 Z M 20 14 V 26 H 29 C 32.3 26 35 23.3 35 20 C 35 16.7 32.3 14 29 14 Z"
            fill={color}
          />
          {/* Letter z cutout boundary */}
          <path
            d="M 18 28 H 48 V 56 H 18 Z"
            fill={cutoutBg}
          />
          {/* Letter z */}
          <path
            d="M 20 30 H 46 V 37 L 29 48 H 46 V 54 H 20 V 47 L 37 36 H 20 Z"
            fill={color}
          />
        </g>

        {/* Wordmark */}
        <text
          x="66"
          y="40"
          fill={color}
          fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
          fontWeight="800"
          fontSize="32"
          letterSpacing="-0.04em"
        >
          prominentz
        </text>

        {/* Accent Bar under letter 'z' */}
        <rect x="246" y="46" width="14" height="3" rx="1.5" fill={color} />
      </svg>
    )
  }

  // ── 4. PRIMARY HORIZONTAL LOCKUP (The Flagship Brand Header) ────────────────
  // Dark P, White z + White wordmark on Purple Container (matches "PRIMARY LOGO" in design sheet)
  const renderWidth = size || 340
  const renderHeight = height || 80

  return (
    <svg
      viewBox="0 0 340 84"
      width={renderWidth}
      height={renderHeight}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Prominentz Primary Logo"
      {...props}
    >
      {showContainer && (
        <rect width="340" height="84" rx="20" fill="#6835F9" />
      )}

      {/* Monogram Pz on Left */}
      <g id="pz-monogram-primary" transform="translate(24, 13)">
        {/* Letter P (Deep Violet Black) */}
        <path
          d="M 6 4 H 32 C 41.9 4 50 12.1 50 22 C 50 31.9 41.9 40 32 40 H 22 V 58 H 6 Z M 22 15 V 29 H 31 C 34.9 29 38 25.9 38 22 C 38 18.1 34.9 15 31 15 Z"
          fill="#1A0C38"
        />
        {/* Letter z (Crisp White nested inside lower right) */}
        <path
          d="M 22 32 H 52 V 39 L 33 50 H 52 V 58 H 22 V 51 L 41 40 H 22 Z"
          fill="#FFFFFF"
        />
      </g>

      {/* Wordmark prominentz */}
      <text
        x="96"
        y="53"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
        fontWeight="800"
        fontSize="36"
        letterSpacing="-0.04em"
      >
        prominentz
      </text>

      {/* Signature Accent Underline below 'z' */}
      <rect x="300" y="60" width="16" height="3.5" rx="1.75" fill="#FFFFFF" />
    </svg>
  )
}

export default ProminentzLogo
