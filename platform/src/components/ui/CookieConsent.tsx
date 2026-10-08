'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

type ConsentChoice = 'all' | 'essential'

interface CookiePreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true and locked
    functional: true,
    analytics: true,
  })

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const stored = localStorage.getItem('prominentz_cookie_consent')
    if (!stored) {
      // Short delay before showing banner for smooth visual entrance
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for global custom event to re-open preferences modal from footer
  useEffect(() => {
    const handleOpen = () => {
      setVisible(true)
      setShowSettings(true)
    }
    window.addEventListener('prominentz:open-cookie-settings', handleOpen)
    return () => window.removeEventListener('prominentz:open-cookie-settings', handleOpen)
  }, [])

  // Handle ESC key to dismiss settings dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings])

  if (!mounted || !visible) return null

  const handleSave = (choice: ConsentChoice) => {
    const record = {
      choice,
      functional: choice === 'all' ? true : preferences.functional,
      analytics: choice === 'all' ? true : preferences.analytics,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('prominentz_cookie_consent', JSON.stringify(record))
    setVisible(false)
    setShowSettings(false)
  }

  const handleCustomSave = () => {
    const record = {
      choice: 'custom',
      functional: preferences.functional,
      analytics: preferences.analytics,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('prominentz_cookie_consent', JSON.stringify(record))
    setVisible(false)
    setShowSettings(false)
  }

  return (
    <>
      {/* ── Cookie Consent Banner ────────────────────────────────────────── */}
      <section
        role="region"
        aria-label="Cookie and Privacy Consent"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          maxWidth: '720px',
          margin: '0 auto',
          backgroundColor: 'rgba(20, 20, 24, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(91, 69, 245, 0.25)',
          zIndex: 9999,
          color: '#ffffff',
          fontFamily: '-apple-system, Inter, BlinkMacSystemFont, sans-serif',
          animation: 'cookieSlideUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }} role="img" aria-label="Cookie">🍪</span>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                We respect your privacy &amp; transparency
              </h2>
            </div>
          </div>

          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
            Prominentz uses essential cookies to ensure secure session authentication, table order routing, and real-time KDS synchronization. We do not use third-party advertising trackers. Read our{' '}
            <Link
              href="/privacy#cookies"
              style={{ color: '#a594fd', textDecoration: 'underline', fontWeight: 600 }}
            >
              Privacy &amp; Cookie Policy
            </Link>{' '}
            for full details.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              Preferences
            </button>

            <button
              type="button"
              onClick={() => handleSave('essential')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              Essential Only
            </button>

            <button
              type="button"
              onClick={() => handleSave('all')}
              style={{
                background: '#18181B',
                border: '1px solid #18181B',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                transition: 'all 150ms ease',
              }}
            >
              Accept All
            </button>
          </div>
        </div>
      </section>

      {/* ── Cookie Preferences Modal ─────────────────────────────────────── */}
      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false)
          }}
        >
          <div
            style={{
              backgroundColor: '#18181d',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
              fontFamily: '-apple-system, Inter, BlinkMacSystemFont, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="cookie-preferences-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Cookie &amp; Tracking Preferences
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Close preferences"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '22px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '20px' }}>
              Customize your data preferences below. Strictly necessary cookies are mandatory to authenticate POS logins and route live orders.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {/* Category 1: Essential */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Strictly Necessary</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#30D158', textTransform: 'uppercase' }}>Always Active</span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Enables user login sessions, security tokens, table ordering states, and live kitchen synchronization.
                </div>
              </div>

              {/* Category 2: Functional */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label htmlFor="pref-functional" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    Functional &amp; UI Preferences
                  </label>
                  <input
                    id="pref-functional"
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#5b45f5', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Remembers your visual theme (Dark/Light mode), collapsed sidebar states, and audio buzzer sounds.
                </div>
              </div>

              {/* Category 3: Analytics */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label htmlFor="pref-analytics" style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    Performance Diagnostics
                  </label>
                  <input
                    id="pref-analytics"
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#5b45f5', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Aggregated telemetry to measure websocket latency and diagnose system errors. No personal profiles created.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomSave}
                style={{
                  background: '#18181B',
                  border: '1px solid #18181B',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline animation style */}
      <style jsx global>{`
        @keyframes cookieSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
