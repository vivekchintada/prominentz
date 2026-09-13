'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/page.module.css'

export default function SignupPage() {
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName]           = useState('')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [locationName, setLocationName]     = useState('Main Outlet')
  const [phone, setPhone]                   = useState('')
  const [error, setError]                   = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName,
          ownerName,
          email,
          password,
          locationName,
          phone: phone || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create SaaS account')
      }

      // Registration successful -> redirect to login with query param
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard} style={{ maxWidth: '440px' }}>
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <span>R</span>
          </div>
          <h2 className={styles.title}>Register Your Restaurant</h2>
          <p className={styles.subtitle}>Start your 14-day free trial — all features included</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.formGroup}>
            <label className="label">Restaurant Name *</label>
            <input
              type="text"
              className="input"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Bella Italia Bistro"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className="label">Your Full Name *</label>
              <input
                type="text"
                className="input"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className="label">Outlet Name</label>
              <input
                type="text"
                className="input"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Main Outlet"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className="label">Work Email *</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@bellaitalia.com"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className="label">Password *</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                minLength={6}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className="label">Phone (optional)</label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          <button type="submit" className="btn btn--brand btn--full btn--lg" disabled={loading}>
            {loading ? 'Creating Restaurant Account...' : '🚀 Start 14-Day Free Trial'}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-xs text-secondary">Already have an account? </span>
          <Link href="/login" className="text-xs font-semibold text-brand">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  )
}
