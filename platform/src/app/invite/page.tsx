'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in the link. Please ask your manager for a valid link.')
      setLoading(false)
      return
    }

    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInvitation(data)
        } else {
          setError(data.error || 'This invitation is invalid or has expired.')
        }
      })
      .catch((err) => {
        setError('Failed to connect to the server to verify invitation.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)

        // Attempt automatic sign-in with the newly configured credentials
        try {
          const signInRes = await signIn('credentials', {
            email: invitation.email.toLowerCase().trim(),
            password,
            redirect: false,
          })

          if (signInRes?.ok) {
            setTimeout(() => {
              if (data.role === 'KITCHEN') {
                router.push('/kds')
              } else if (data.role === 'SERVER') {
                router.push('/server')
              } else {
                router.push('/dashboard')
              }
            }, 1000)
            return
          }
        } catch {
          // If auto sign-in has any edge case, fallback to login
        }

        setTimeout(() => {
          router.push(`/login?registered=true&email=${encodeURIComponent(invitation.email)}&role=${data.role || 'SERVER'}`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to accept invitation.')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error accepting invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg, #0d0f17)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Verifying Staff Invitation...</h3>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg, #0d0f17)', padding: '24px' }}>
      <div
        className="card card--elevated animate-fade-in"
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--color-bg-card, #161926)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 40 }}>🎉</span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary, #fff)', margin: '12px 0 6px 0' }}>
            Staff Invitation
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #94a3b8)', margin: 0 }}>
            You have been invited to join the team
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span style={{ fontSize: 48 }}>✅</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', margin: '14px 0 6px 0' }}>
              Welcome to the Team!
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #94a3b8)' }}>
              Your account is active. Redirecting to your workspace...
            </p>
          </div>
        ) : invitation ? (
          <>
            <div
              style={{
                background: 'rgba(91,69,245,0.08)',
                border: '1px solid rgba(91,69,245,0.25)',
                borderRadius: 14,
                padding: '16px',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-tertiary, #64748b)' }}>Restaurant:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary, #fff)' }}>{invitation.organizationName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-tertiary, #64748b)' }}>Location:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary, #fff)' }}>{invitation.locationName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-tertiary, #64748b)' }}>Role:</span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(91,69,245,0.2)',
                    color: '#818cf8',
                    textTransform: 'uppercase',
                  }}
                >
                  {invitation.role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-tertiary, #64748b)' }}>Email:</span>
                <span style={{ fontWeight: 600, color: '#38bdf8' }}>{invitation.email}</span>
              </div>
            </div>

            <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary, #94a3b8)', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary, #94a3b8)', marginBottom: 6 }}>
                  Choose a Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10 }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn--primary"
                style={{ width: '100%', padding: '14px', borderRadius: 10, fontWeight: 800, fontSize: 14, marginTop: 8 }}
              >
                {submitting ? 'Activating Account...' : 'Accept Invitation & Join Team'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/login" className="btn btn--secondary" style={{ width: '100%' }}>
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d0f17' }} />}>
      <InviteContent />
    </Suspense>
  )
}
