'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import ProminentzLogo from '@/components/brand/ProminentzLogo'

export default function BrandIdentityPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewDark, setPreviewDark] = useState(false)

  const handleCopySvg = (id: string, svgPath: string) => {
    fetch(svgPath)
      .then((r) => r.text())
      .then((text) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2500)
      })
      .catch(() => {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2500)
      })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: previewDark ? '#09090b' : '#F9F9F8',
        color: previewDark ? '#F4F4F5' : '#18181B',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        padding: '48px 24px 96px',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: previewDark ? '#A1A1AA' : '#52525B',
              textDecoration: 'none',
            }}
          >
            ← Back to Prominentz Homepage
          </Link>

          <button
            onClick={() => setPreviewDark(!previewDark)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: previewDark ? '#27272a' : '#E4E4E7',
              border: 'none',
              color: previewDark ? '#FFFFFF' : '#18181B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {previewDark ? '☀️ Light Background' : '🌙 Dark Background'}
          </button>
        </div>

        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#6835F9',
              backgroundColor: 'rgba(104, 53, 249, 0.1)',
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '16px',
            }}
          >
            Official Brand Identity
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 12px',
            }}
          >
            Prominentz Logo Assets &amp; Guidelines
          </h1>
          <p
            style={{
              fontSize: '17px',
              color: previewDark ? '#A1A1AA' : '#71717A',
              maxWidth: '640px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Vector graphics and official implementations matching the Prominentz brand identity guidelines.
          </p>
        </div>

        {/* Grid of Logos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
          {/* 1. PRIMARY LOGO */}
          <div
            style={{
              backgroundColor: previewDark ? '#141417' : '#FFFFFF',
              border: `1px solid ${previewDark ? '#27272a' : '#E4E4E7'}`,
              borderRadius: '20px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6835F9' }}>
                  Primary Logo
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>Horizontal Flagship Lockup</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href="/prominentz-primary.svg"
                  download="prominentz-primary.svg"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: previewDark ? '#27272a' : '#F4F4F5',
                    color: previewDark ? '#F4F4F5' : '#18181B',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Download SVG
                </a>
                <button
                  onClick={() => handleCopySvg('primary', '/prominentz-primary.svg')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#6835F9',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === 'primary' ? '✓ Copied' : 'Copy SVG'}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                backgroundColor: previewDark ? '#09090b' : '#F9F9FB',
                borderRadius: '14px',
                border: `1px dashed ${previewDark ? '#27272a' : '#E4E4E7'}`,
              }}
            >
              <ProminentzLogo variant="primary" size={380} />
            </div>
          </div>

          {/* 2. STACKED LOGO & 3. APP ICON */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
            {/* Stacked Logo */}
            <div
              style={{
                backgroundColor: previewDark ? '#141417' : '#FFFFFF',
                border: `1px solid ${previewDark ? '#27272a' : '#E4E4E7'}`,
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6835F9' }}>
                      Stacked
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>Monogram + Wordmark</h3>
                  </div>
                  <a
                    href="/prominentz-stacked.svg"
                    download="prominentz-stacked.svg"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: previewDark ? '#27272a' : '#F4F4F5',
                      color: previewDark ? '#F4F4F5' : '#18181B',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    SVG
                  </a>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 20px',
                    backgroundColor: previewDark ? '#09090b' : '#F9F9FB',
                    borderRadius: '14px',
                    border: `1px dashed ${previewDark ? '#27272a' : '#E4E4E7'}`,
                  }}
                >
                  <ProminentzLogo variant="stacked" size={280} />
                </div>
              </div>
            </div>

            {/* App Icon & Favicon */}
            <div
              style={{
                backgroundColor: previewDark ? '#141417' : '#FFFFFF',
                border: `1px solid ${previewDark ? '#27272a' : '#E4E4E7'}`,
                borderRadius: '20px',
                padding: '36px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6835F9' }}>
                      App Icon &amp; Favicon
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>Iconography &amp; Mobile Mark</h3>
                  </div>
                  <a
                    href="/prominentz-icon.svg"
                    download="prominentz-icon.svg"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: previewDark ? '#27272a' : '#F4F4F5',
                      color: previewDark ? '#F4F4F5' : '#18181B',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    SVG
                  </a>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '40px',
                    padding: '44px 20px',
                    backgroundColor: previewDark ? '#09090b' : '#F9F9FB',
                    borderRadius: '14px',
                    border: `1px dashed ${previewDark ? '#27272a' : '#E4E4E7'}`,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <ProminentzLogo variant="app-icon" size={100} />
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '8px', fontWeight: 600 }}>App Icon (100px)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <ProminentzLogo variant="favicon" size={48} />
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '8px', fontWeight: 600 }}>Favicon (48px)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <ProminentzLogo variant="favicon" size={32} />
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '8px', fontWeight: 600 }}>Favicon (32px)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. ONE COLOR (MONOCHROME) */}
          <div
            style={{
              backgroundColor: previewDark ? '#141417' : '#FFFFFF',
              border: `1px solid ${previewDark ? '#27272a' : '#E4E4E7'}`,
              borderRadius: '20px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6835F9' }}>
                  One Color
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>Monochrome Dark &amp; Light Applications</h3>
              </div>
              <a
                href="/prominentz-onecolor.svg"
                download="prominentz-onecolor.svg"
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: previewDark ? '#27272a' : '#F4F4F5',
                  color: previewDark ? '#F4F4F5' : '#18181B',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                SVG
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Light surface */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E4E4E7',
                }}
              >
                <ProminentzLogo variant="one-color" size={260} />
              </div>

              {/* Dark surface */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  backgroundColor: '#121215',
                  borderRadius: '12px',
                  border: '1px solid #27272A',
                }}
              >
                <ProminentzLogo variant="one-color-white" size={260} />
              </div>
            </div>
          </div>

          {/* 5. Brand Color Tokens & Specs */}
          <div
            style={{
              backgroundColor: previewDark ? '#141417' : '#FFFFFF',
              border: `1px solid ${previewDark ? '#27272a' : '#E4E4E7'}`,
              borderRadius: '20px',
              padding: '36px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>Brand Color Palette</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { name: 'Electric Brand Purple', hex: '#6835F9', text: '#FFFFFF', role: 'Primary Brand Surface' },
                { name: 'Obsidian Monogram Dark', hex: '#141416', text: '#FFFFFF', role: 'Monogram "z" & Cutout' },
                { name: 'Deep Violet Black', hex: '#1A0C38', text: '#FFFFFF', role: 'Primary Logo "P" Stem' },
                { name: 'Pure White', hex: '#FFFFFF', text: '#18181B', role: 'Wordmark & "z" Contrast' },
              ].map((c) => (
                <div
                  key={c.name}
                  style={{
                    backgroundColor: c.hex,
                    color: c.text,
                    padding: '20px',
                    borderRadius: '12px',
                    border: c.hex === '#FFFFFF' ? '1px solid #E4E4E7' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '110px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{c.name}</div>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '16px' }}>{c.hex}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
