import { ImageResponse } from 'next/og'

export const alt = 'Prominentz — Restaurant POS & KDS for $50/month flat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Social share card used when the site is posted on LinkedIn, Facebook, X, iMessage, etc.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: '#0B0B0C',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Prominentz</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Restaurant POS + Kitchen Display
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, color: '#A5A0FF' }}>$50/month flat.</div>
          <div style={{ fontSize: 30, marginTop: 28, color: '#B4B4B8' }}>
            Your own iPads & tablets · QR + online ordering · 0% take-rate · No contracts
          </div>
        </div>
      </div>
    ),
    size,
  )
}
