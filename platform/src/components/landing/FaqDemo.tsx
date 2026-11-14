'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { track } from '@/lib/analytics'
import s from './Landing.module.css'

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I have to buy hardware from you?',
    a: 'No. Prominentz runs in the browser on any iPad, Android tablet, Windows PC, Mac or phone. Use the devices you already have, or buy ordinary commercial tablets.',
  },
  {
    q: 'Will it print receipts and open the cash drawer?',
    a: 'Yes. It talks to standard 80mm thermal printers (Epson, Star Micronics, Munbyn and generic ESC/POS models) over USB from the tablet or PC. The cash drawer opens through the printer’s drawer port.',
  },
  {
    q: 'What happens if the internet drops during a rush?',
    a: 'Servers keep entering orders. They queue on the device and sync as soon as the connection is back. Card payments need a connection, so take cash or run the card once you’re back online.',
  },
  {
    q: 'Do you take a cut of our sales?',
    a: 'No. Prominentz takes 0% of your sales. Card payments from guests settle to your own Stripe account; you pay Stripe’s standard processing fee and nothing on top. Your Prominentz subscription is billed separately.',
  },
  {
    q: 'How hard is it to switch from Toast, Square or TouchBistro?',
    a: 'There’s nothing to install. Book a demo and send us your menu as a PDF or photos, and we’ll load your categories, modifiers and prices for you, free.',
  },
]

export function Faq() {
  return (
    <div className={s.faqList}>
      {FAQS.map((f, i) => (
        <details key={f.q} className={s.faqItem} open={i === 0}>
          <summary>
            {f.q}
            <Plus className={s.faqIcon} size={20} strokeWidth={1.5} aria-hidden="true" />
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

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

export function DemoForm() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className={`${s.panel} ${s.sent}`} role="status">
        <span className={s.chipGood}>
          <Check size={11} strokeWidth={2.5} /> Request received
        </span>
        <h3 className={s.h3}>Thanks, {form.name.split(' ')[0] || 'there'}.</h3>
        <p>We&apos;ll email you within one business day to pick a time. Want to look around first?</p>
        <a href="/signup" className={`${s.btnSolid} plausible-event-name=Trial+Click`}>
          Start free trial
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={`${s.panel} ${s.form}`}>
      <div className={s.formRow}>
        <label className={s.field}>
          <span>Your name</span>
          <input required autoComplete="name" value={form.name} onChange={set('name')} />
        </label>
        <label className={s.field}>
          <span>Work email</span>
          <input required type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
      </div>
      <div className={s.formRow}>
        <label className={s.field}>
          <span>Restaurant name</span>
          <input required autoComplete="organization" value={form.restaurantName} onChange={set('restaurantName')} />
        </label>
        <label className={s.field}>
          <span>Phone (optional)</span>
          <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </label>
      </div>
      <div className={s.formRow}>
        <label className={s.field}>
          <span>Locations</span>
          <select value={form.locations} onChange={set('locations')}>
            <option value="1">1</option>
            <option value="2">2–3</option>
            <option value="4">4–10</option>
            <option value="11">11+</option>
          </select>
        </label>
        <label className={s.field}>
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
      <label className={s.field}>
        <span>Anything we should know? (optional)</span>
        <textarea rows={3} value={form.message} onChange={set('message')} maxLength={1000} />
      </label>
      <input
        className={s.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={set('website')}
        name="website"
      />
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={s.btnSolid} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Book my demo'}
      </button>
      <p className={s.formFine}>We&apos;ll only use these details to set up your demo.</p>
    </form>
  )
}

export function DemoPoints() {
  const pts = [
    'Free menu import from your PDF or photos',
    'Runs on the iPads, tablets and PCs you already have',
    'Card payments settle to your own Stripe account',
    'Month to month. Cancel anytime.',
  ]
  return (
    <ul className={s.points}>
      {pts.map((p) => (
        <li key={p}>
          <Check size={16} strokeWidth={2.25} aria-hidden="true" />
          {p}
        </li>
      ))}
    </ul>
  )
}
