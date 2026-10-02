'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

type Template = 'FINE_DINING' | 'FAST_CASUAL' | 'BAR'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

const STEPS = [
  { label: 'Welcome',  icon: '👋' },
  { label: 'Location', icon: '📍' },
  { label: 'Team',     icon: '👥' },
  { label: 'Menu',     icon: '🍽️' },
  { label: 'Tables',   icon: '🪑' },
  { label: 'Finish',   icon: '🚀' },
]

interface TableRow { name: string; capacity: string }

export function OnboardingWizard({ initialStep = 0 }: { initialStep?: number }) {
  const router = useRouter()
  const [step, setStep] = useState(Math.max(1, initialStep + 1 > 6 ? 6 : initialStep + 1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [restName, setRestName] = useState('')
  // Step 2
  const [locationName, setLocationName] = useState('')
  const [address, setAddress]           = useState('')
  const [phone, setPhone]               = useState('')
  const [timezone, setTimezone]         = useState('America/New_York')
  // Step 3
  const [memberName, setMemberName]     = useState('')
  const [memberEmail, setMemberEmail]   = useState('')
  const [memberRole, setMemberRole]     = useState('SERVER')
  const [memberPassword, setMemberPass] = useState('')
  // Step 4
  const [template, setTemplate]         = useState<Template>('FAST_CASUAL')
  const [seeded, setSeeded]             = useState(false)
  const [seeding, setSeeding]           = useState(false)
  // Step 5
  const [tables, setTables] = useState<TableRow[]>([
    { name: 'Table 1', capacity: '4' },
    { name: 'Table 2', capacity: '4' },
    { name: 'Table 3', capacity: '2' },
    { name: 'Bar 1',   capacity: '2' },
  ])

  async function advance(data: Record<string, unknown> = {}) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Something went wrong'); return }
      setStep((s) => s + 1)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setSaving(false)
    }
  }

  async function skip() {
    setSaving(true)
    setError('')
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data: {} }),
      })
      setStep((s) => s + 1)
    } catch {}
    setSaving(false)
  }

  async function handleSeedMenu() {
    setSeeding(true)
    try {
      const res = await fetch('/api/onboarding/seed-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })
      if (res.ok) setSeeded(true)
      else { const j = await res.json(); setError(j.error) }
    } catch (e: any) { setError(e.message) }
    setSeeding(false)
  }

  function addTableRow() {
    setTables((prev) => [...prev, { name: `Table ${prev.length + 1}`, capacity: '4' }])
  }
  function removeTableRow(i: number) {
    setTables((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateTable(i: number, field: keyof TableRow, val: string) {
    setTables((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  if (step > 6) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.successCard}>
          <div style={{ fontSize: 64 }}>🎉</div>
          <h1 style={styles.successTitle}>You're all set!</h1>
          <p style={styles.successSub}>
            Your restaurant is configured and ready to go. Head to your dashboard to start taking orders.
          </p>
          <button style={styles.primaryBtn} onClick={() => router.push('/dashboard')}>
            Open Dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.shell}>
      {/* Progress header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <ProminentzLogo variant="full" size="sm" />
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.stepDots}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              ...styles.stepDot,
              ...(i + 1 === step ? styles.stepDotActive : {}),
              ...(i + 1 < step  ? styles.stepDotDone  : {}),
            }}>
              {i + 1 < step ? '✓' : s.icon}
            </div>
          ))}
        </div>
        <p style={styles.stepLabel}>Step {step} of {STEPS.length}: {STEPS[step - 1]?.label}</p>
      </div>

      {/* Card */}
      <div style={styles.card}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* ── Step 1: Restaurant Name ── */}
        {step === 1 && (
          <div>
            <h2 style={styles.cardTitle}>Welcome to Prominentz 👋</h2>
            <p style={styles.cardSub}>Let's set up your restaurant in a few quick steps. First — what's your restaurant called?</p>
            <label style={styles.label}>Restaurant Name</label>
            <input
              style={styles.input}
              value={restName}
              onChange={(e) => setRestName(e.target.value)}
              placeholder="e.g. The Golden Fork"
              autoFocus
            />
            <button
              style={styles.primaryBtn}
              disabled={!restName.trim() || saving}
              onClick={() => advance({ name: restName })}
            >
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step === 2 && (
          <div>
            <h2 style={styles.cardTitle}>Set up your first location 📍</h2>
            <p style={styles.cardSub}>This will be your primary dining location and HQ.</p>
            <label style={styles.label}>Location Name *</label>
            <input style={styles.input} value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Downtown Branch" />
            <label style={styles.label}>Street Address</label>
            <input style={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" />
            <label style={styles.label}>Phone</label>
            <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            <label style={styles.label}>Timezone</label>
            <select style={styles.select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={skip} disabled={saving}>Skip for now</button>
              <button style={styles.primaryBtn} disabled={!locationName.trim() || saving} onClick={() => advance({ locationName, address, phone, timezone })}>
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Team ── */}
        {step === 3 && (
          <div>
            <h2 style={styles.cardTitle}>Invite your first team member 👥</h2>
            <p style={styles.cardSub}>Add a manager, server, or kitchen staff. You can add more later in Settings.</p>
            <label style={styles.label}>Name</label>
            <input style={styles.input} value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Alex Johnson" />
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="alex@restaurant.com" />
            <label style={styles.label}>Role</label>
            <select style={styles.select} value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              <option value="MANAGER">Manager</option>
              <option value="SERVER">Server</option>
              <option value="KITCHEN">Kitchen</option>
            </select>
            <label style={styles.label}>Temporary Password</label>
            <input style={styles.input} type="password" value={memberPassword} onChange={(e) => setMemberPass(e.target.value)} placeholder="Min. 6 characters" />
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={skip} disabled={saving}>Skip for now</button>
              <button style={styles.primaryBtn} disabled={saving} onClick={() => advance({ memberName, memberEmail, memberRole, memberPassword })}>
                {saving ? 'Inviting…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Menu Template ── */}
        {step === 4 && (
          <div>
            <h2 style={styles.cardTitle}>Seed your menu 🍽️</h2>
            <p style={styles.cardSub}>Pick a starter template to auto-populate your menu with realistic items, or skip to build from scratch.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {(['FINE_DINING', 'FAST_CASUAL', 'BAR'] as Template[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  style={{
                    ...styles.templateCard,
                    ...(template === t ? styles.templateCardActive : {}),
                  }}
                >
                  <div style={{ fontSize: 28 }}>
                    {t === 'FINE_DINING' ? '🥂' : t === 'FAST_CASUAL' ? '🍔' : '🍺'}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 8, color: 'var(--color-text-primary, #E5E5EA)', fontSize: 13 }}>
                    {t.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #8E8E93)', marginTop: 4 }}>
                    {t === 'FINE_DINING' ? '3 cats, 8 items' : t === 'FAST_CASUAL' ? '3 cats, 8 items' : '3 cats, 9 items'}
                  </div>
                </button>
              ))}
            </div>
            {seeded && <div style={styles.successBanner}>✅ Menu seeded successfully!</div>}
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={skip} disabled={saving || seeding}>Skip for now</button>
              {!seeded
                ? <button style={styles.secondaryBtn} onClick={handleSeedMenu} disabled={seeding}>
                    {seeding ? 'Seeding…' : `Seed ${template.replace('_', ' ')} Menu`}
                  </button>
                : null}
              <button style={styles.primaryBtn} disabled={saving} onClick={() => advance({})}>
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Tables ── */}
        {step === 5 && (
          <div>
            <h2 style={styles.cardTitle}>Add your table layout 🪑</h2>
            <p style={styles.cardSub}>Start with these defaults or customize your floor plan. You can edit tables later in the dashboard.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
              {tables.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...styles.input, flex: 2, margin: 0 }} value={t.name} onChange={(e) => updateTable(i, 'name', e.target.value)} placeholder="Table name" />
                  <input style={{ ...styles.input, flex: 1, margin: 0 }} type="number" min={1} max={20} value={t.capacity} onChange={(e) => updateTable(i, 'capacity', e.target.value)} placeholder="Seats" />
                  <button style={styles.deleteBtn} onClick={() => removeTableRow(i)}>✕</button>
                </div>
              ))}
            </div>
            <button style={styles.addRowBtn} onClick={addTableRow}>+ Add Table</button>
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={skip} disabled={saving}>Skip for now</button>
              <button style={styles.primaryBtn} disabled={saving} onClick={() => advance({ tables: tables.map((t) => ({ name: t.name, capacity: parseInt(t.capacity) || 4 })) })}>
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Finish ── */}
        {step === 6 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <h2 style={styles.cardTitle}>Almost there!</h2>
            <p style={styles.cardSub}>Your restaurant is set up. You can always add payment configuration, more team members, and inventory from the dashboard.</p>
            <button style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center' }} disabled={saving} onClick={() => advance({})}>
              {saving ? 'Finishing…' : 'Enter Dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: '#0A0A0B',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 64px',
  },
  header: {
    width: '100%',
    maxWidth: 520,
    marginBottom: 24,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  logoBadge: {
    background: 'linear-gradient(135deg, #5b45f5, #7b68f7)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
    padding: '2px 5px',
    letterSpacing: '0.5px',
  },
  progressBar: {
    height: 4,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #5b45f5, #7b68f7)',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  stepDots: {
    display: 'flex',
    gap: 10,
    marginBottom: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#8E8E93',
    transition: 'all 0.25s ease',
  },
  stepDotActive: {
    background: 'rgba(37,99,235,0.18)',
    border: '1.5px solid #5b45f5',
    color: '#5b45f5',
  },
  stepDotDone: {
    background: 'rgba(48,209,88,0.12)',
    border: '1.5px solid #30D158',
    color: '#30D158',
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 12,
    color: '#8E8E93',
    margin: 0,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: '#1C1C1E',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 36,
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 700,
    color: '#E5E5EA',
  },
  cardSub: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#2C2C2E',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#E5E5EA',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 0,
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    background: '#2C2C2E',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#E5E5EA',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #5b45f5, #7b68f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 24,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtn: {
    background: 'rgba(37,99,235,0.1)',
    color: '#5b45f5',
    border: '1px solid rgba(91,69,245,0.3)',
    borderRadius: 10,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 24,
  },
  ghostBtn: {
    background: 'transparent',
    color: '#8E8E93',
    border: 'none',
    padding: '12px 16px',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 24,
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
  },
  templateCard: {
    flex: 1,
    background: '#2C2C2E',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  templateCardActive: {
    border: '1.5px solid #5b45f5',
    background: 'rgba(37,99,235,0.08)',
  },
  errorBanner: {
    background: 'rgba(255,69,58,0.1)',
    border: '1px solid rgba(255,69,58,0.3)',
    color: '#FF453A',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  successBanner: {
    background: 'rgba(48,209,88,0.1)',
    border: '1px solid rgba(48,209,88,0.3)',
    color: '#30D158',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  deleteBtn: {
    background: 'rgba(255,69,58,0.12)',
    border: 'none',
    color: '#FF453A',
    borderRadius: 8,
    width: 32,
    height: 40,
    cursor: 'pointer',
    fontSize: 12,
    flexShrink: 0,
  },
  addRowBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px dashed rgba(255,255,255,0.15)',
    color: '#8E8E93',
    borderRadius: 10,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    width: '100%',
    marginBottom: 8,
  },
  centerPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0A0A0B',
    padding: 24,
  },
  successCard: {
    background: '#1C1C1E',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 48,
    maxWidth: 440,
    textAlign: 'center',
  },
  successTitle: {
    color: '#E5E5EA',
    fontSize: 26,
    fontWeight: 700,
    margin: '12px 0 8px',
  },
  successSub: {
    color: '#8E8E93',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 28,
  },
}
