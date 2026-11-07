'use client'

import React, { useState } from 'react'
import styles from './MiddayMarketing.module.css'
import demo from './DemoRequest.module.css'
import { track } from '@/lib/analytics'

type FormState = {
  name: string
  email: string
  restaurantName: string
  phone: string
  locations: string
  currentPos: string
  message: string
  website: string // honeypot: real people leave this empty
}

const EMPTY: FormState = {
  name: '',
  email: '',
  restaurantName: '',
  phone: '',
  locations: '1',
  currentPos: '',
  message: '',
  website: '',
}

export default function DemoRequestSection() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      const params = new URLSearchParams(window.location.search)
      const source = params.get('utm_source') || document.referrer || 'direct'
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locations: Number(form.locations) || 1, source }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Please check the form and try again.')
      track('demo_requested', { locations: form.locations, currentPos: form.currentPos || 'none' })
      setState('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  return (
    <section id="demo" className={demo.section} aria-label="Book a demo">
      <div className={styles.container}>
        <div className={demo.grid}>
          <div>
            <span className={styles.eyebrow}>Book a demo</span>
            <h2 className={styles.sectionTitle}>See it running on your own menu in 15 minutes.</h2>
            <p className={styles.sectionDesc}>
              Tell us a little about your restaurant. We&apos;ll set up your menu for free and walk you through the POS, kitchen display,
              and QR ordering on a quick video call. No pressure, no contract.
            </p>
            <ul className={demo.points}>
              <li>✓ Free menu import from your PDF or photos</li>
              <li>✓ Runs on the iPads, tablets, and PCs you already have</li>
              <li>✓ Payouts go straight to your own Stripe account</li>
              <li>✓ Month-to-month. Cancel anytime.</li>
            </ul>
          </div>

          <div className={demo.card}>
            {state === 'sent' ? (
              <div className={demo.success} role="status">
                <h3>Thanks, {form.name.split(' ')[0] || 'there'}!</h3>
                <p>We&apos;ll email you within one business day to pick a time. Want to look around now?</p>
                <a href="/signup" className={styles.btnPrimary}>
                  Start your free trial
                </a>
              </div>
            ) : (
              <form onSubmit={submit} className={demo.form} noValidate={false}>
                <div className={demo.row}>
                  <label className={demo.field}>
                    <span>Your name</span>
                    <input required autoComplete="name" value={form.name} onChange={set('name')} />
                  </label>
                  <label className={demo.field}>
                    <span>Work email</span>
                    <input required type="email" autoComplete="email" value={form.email} onChange={set('email')} />
                  </label>
                </div>
                <div className={demo.row}>
                  <label className={demo.field}>
                    <span>Restaurant name</span>
                    <input required autoComplete="organization" value={form.restaurantName} onChange={set('restaurantName')} />
                  </label>
                  <label className={demo.field}>
                    <span>Phone (optional)</span>
                    <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
                  </label>
                </div>
                <div className={demo.row}>
                  <label className={demo.field}>
                    <span>Locations</span>
                    <select value={form.locations} onChange={set('locations')}>
                      <option value="1">1</option>
                      <option value="2">2–3</option>
                      <option value="4">4–10</option>
                      <option value="11">11+</option>
                    </select>
                  </label>
                  <label className={demo.field}>
                    <span>Current POS</span>
                    <select value={form.currentPos} onChange={set('currentPos')}>
                      <option value="">Select…</option>
                      <option>Toast</option>
                      <option>Square</option>
                      <option>Clover</option>
                      <option>TouchBistro</option>
                      <option>Lightspeed</option>
                      <option>SpotOn</option>
                      <option>Other</option>
                      <option>None / opening soon</option>
                    </select>
                  </label>
                </div>
                <label className={demo.field}>
                  <span>Anything we should know? (optional)</span>
                  <textarea rows={3} value={form.message} onChange={set('message')} maxLength={1000} />
                </label>
                <input
                  className={demo.honeypot}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.website}
                  onChange={set('website')}
                  name="website"
                />
                {error && (
                  <p className={demo.error} role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className={styles.btnPrimary} disabled={state === 'sending'}>
                  {state === 'sending' ? 'Sending…' : 'Book my demo'}
                </button>
                <p className={demo.fine}>We&apos;ll only use your details to set up the demo.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
