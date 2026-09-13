'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

function LoginForm() {
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Fetch current session to get user role
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      
      if (session?.user?.role) {
        const role = session.user.role
        if (role === 'OWNER' || role === 'MANAGER') {
          router.push('/dashboard')
        } else if (role === 'SERVER') {
          router.push('/pos')
        } else if (role === 'KITCHEN') {
          router.push('/kds')
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Quick select helper for development testing
  const selectQuickRole = (roleEmail: string) => {
    setEmail(roleEmail)
    setPassword('resto123')
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <span>R</span>
          </div>
          <h2 className={styles.title}>Sign In to Resto</h2>
          <p className={styles.subtitle}>Enter your credentials to access the platform</p>
        </div>

        {isRegistered && (
          <div style={{
            background: 'rgba(48,209,88,0.15)',
            border: '1px solid #30D158',
            color: '#30D158',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            🎉 Restaurant account registered! Sign in below to start setup.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label className="label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@restaurant.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn--brand btn--full btn--lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-3 mb-4">
          <span className="text-xs text-secondary">New to Resto AI? </span>
          <Link href="/signup" className="text-xs font-semibold text-brand">
            Register your restaurant here
          </Link>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.roleHint}>Demo Accounts (Click to Autofill)</span>
          <div className={styles.roleList}>
            <button className={styles.roleBtn} onClick={() => selectQuickRole('owner@resto.com')}>
              Owner (Dashboard)
            </button>
            <button className={styles.roleBtn} onClick={() => selectQuickRole('manager@resto.com')}>
              Manager (Dashboard)
            </button>
            <button className={styles.roleBtn} onClick={() => selectQuickRole('server@resto.com')}>
              Server (POS)
            </button>
            <button className={styles.roleBtn} onClick={() => selectQuickRole('kitchen@resto.com')}>
              Kitchen (KDS)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0c' }} />}>
      <LoginForm />
    </Suspense>
  )
}
