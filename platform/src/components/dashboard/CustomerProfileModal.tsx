'use client'

import React, { useState, useEffect } from 'react'

interface OrderItem { quantity: number; priceAtOrder: number | string; menuItem: { name: string } }
interface Order {
  id: string; createdAt: string; status: string; total: number | string
  table: { name: string }; items: OrderItem[]
}
interface Redemption {
  id: string; createdAt: string; pointsRedeemed: number
  reward: { name: string; pointsRequired: number }
}
interface LedgerEntry {
  id: string; type: string; pointsChange: number; balanceAfter: number; reason?: string | null; createdAt: string
}
interface Tier {
  id: string; name: string; badgeColor: string; pointsMultiplier: number
}
interface Customer {
  id: string; name: string; phone: string; email?: string | null
  pointsBalance: number; lifetimeSpend: number | string; totalVisits: number
  allergyTags: string[]; tags?: string[]; notes?: string | null; createdAt: string
  marketingConsentEmail: boolean; marketingConsentSms: boolean; marketingConsentWhatsApp: boolean
  birthDate?: string | null; tier?: Tier | null
  orders: Order[]; redemptions: Redemption[]; ledgerEntries?: LedgerEntry[]
}

interface Props {
  customerId: string
  onClose: () => void
  onCustomerUpdated?: () => void
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtMoney(v: number | string) {
  return '$' + Number(v).toFixed(2)
}

const STATUS_COLOR: Record<string, string> = {
  PAID: '#22c55e', OPEN: 'var(--color-text-primary)', VOIDED: '#ef4444',
  SENT_TO_KITCHEN: '#f59e0b', PARTIALLY_READY: '#f97316',
}

export default function CustomerProfileModal({ customerId, onClose, onCustomerUpdated }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState<'timeline' | 'orders' | 'loyalty'>('timeline')

  // Adjust points state
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjPoints, setAdjPoints]             = useState('')
  const [adjReason, setAdjReason]             = useState('')
  const [adjSubmitting, setAdjSubmitting]     = useState(false)

  // Edit fields
  const [eName, setEName]             = useState('')
  const [ePhone, setEPhone]           = useState('')
  const [eEmail, setEEmail]           = useState('')
  const [eAllergies, setEAllergies]   = useState('')
  const [eTags, setETags]             = useState('')
  const [eBirthDate, setEBirthDate]   = useState('')
  const [eConsentEmail, setEConsentEmail] = useState(true)
  const [eConsentSms, setEConsentSms]     = useState(true)
  const [eConsentWa, setEConsentWa]       = useState(false)
  const [eNotes, setENotes]           = useState('')

  const fetchCustomer = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/customers/' + customerId)
      const data = await res.json()
      if (data.customer) {
        const c = data.customer as Customer
        setCustomer(c)
        setEName(c.name)
        setEPhone(c.phone)
        setEEmail(c.email || '')
        setEAllergies((c.allergyTags || []).join(', '))
        setETags((c.tags || []).join(', '))
        setEBirthDate(c.birthDate ? c.birthDate.slice(0, 10) : '')
        setEConsentEmail(c.marketingConsentEmail ?? true)
        setEConsentSms(c.marketingConsentSms ?? true)
        setEConsentWa(c.marketingConsentWhatsApp ?? false)
        setENotes(c.notes || '')
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchCustomer() }, [customerId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/customers/' + customerId, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                     eName,
          phone:                    ePhone,
          email:                    eEmail || null,
          allergyTags:              eAllergies.split(',').map(t => t.trim()).filter(Boolean),
          tags:                     eTags.split(',').map(t => t.trim()).filter(Boolean),
          birthDate:                eBirthDate || null,
          marketingConsentEmail:    eConsentEmail,
          marketingConsentSms:      eConsentSms,
          marketingConsentWhatsApp: eConsentWa,
          notes:                    eNotes || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        await fetchCustomer()
        onCustomerUpdated?.()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to update customer')
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjPoints || !adjReason.trim()) return
    setAdjSubmitting(true)
    try {
      const res = await fetch('/api/loyalty/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          pointsChange: Number(adjPoints),
          reason: adjReason.trim(),
        }),
      })
      if (res.ok) {
        setShowAdjustModal(false)
        setAdjPoints('')
        setAdjReason('')
        await fetchCustomer()
        onCustomerUpdated?.()
      } else {
        const err = await res.json()
        alert(err.error || 'Adjustment failed')
      }
    } catch (err: unknown) {
      alert(err?.message || 'Adjustment error')
    } finally {
      setAdjSubmitting(false)
    }
  }

  // Combine orders, ledger entries, and redemptions into unified chronological timeline
  const timelineEvents = React.useMemo(() => {
    if (!customer) return []
    const events: { id: string; date: string; title: string; subtitle: string; badge: string; color: string; amount?: string }[] = []

    // Orders
    for (const o of customer.orders || []) {
      events.push({
        id: `order-${o.id}`,
        date: o.createdAt,
        title: `Dined at ${o.table?.name || 'Table'}`,
        subtitle: o.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ').slice(0, 60),
        badge: o.status,
        color: STATUS_COLOR[o.status] || 'var(--color-text-primary)',
        amount: fmtMoney(o.total),
      })
    }

    // Points Ledger
    for (const l of customer.ledgerEntries || []) {
      const isPositive = l.pointsChange > 0
      events.push({
        id: `ledger-${l.id}`,
        date: l.createdAt,
        title: l.type.replace(/_/g, ' '),
        subtitle: l.reason || 'Points adjustment',
        badge: `${isPositive ? '+' : ''}${l.pointsChange} pts`,
        color: isPositive ? '#22c55e' : '#ef4444',
        amount: `Bal: ${l.balanceAfter} pts`,
      })
    }

    // Redemptions (if not in ledger)
    if (!customer.ledgerEntries || customer.ledgerEntries.length === 0) {
      for (const r of customer.redemptions || []) {
        events.push({
          id: `redemption-${r.id}`,
          date: r.createdAt,
          title: `Redeemed Reward`,
          subtitle: r.reward.name,
          badge: `-${r.pointsRedeemed} pts`,
          color: 'var(--color-text-secondary)',
        })
      }
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [customer])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '560px', maxWidth: '95vw', height: '100%',
          background: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {loading ? 'Loading…' : customer?.name}
                </span>
                {customer?.tier && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                    background: customer.tier.badgeColor + '22',
                    color: customer.tier.badgeColor,
                    border: `1px solid ${customer.tier.badgeColor}44`,
                  }}>
                    ★ {customer.tier.name} ({customer.tier.pointsMultiplier}x)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Unified Guest Profile & Loyalty Ledger
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!editing && customer && (
              <>
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="btn btn--sm"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  ⚡ Adjust Points
                </button>
                <button onClick={() => setEditing(true)} className="btn btn--secondary btn--sm">Edit</button>
              </>
            )}
            <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ fontSize: '20px', lineHeight: 1, padding: '0 8px' }}>×</button>
          </div>
        </div>

        {/* Adjust Points Modal */}
        {showAdjustModal && (
          <div style={{ padding: '16px 24px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
              ⚡ Manual Loyalty Points Adjustment
            </div>
            <form onSubmit={handleAdjustPoints} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Points change (e.g. +50 or -20)"
                  value={adjPoints}
                  onChange={(e) => setAdjPoints(e.target.value)}
                  required
                  className="input"
                  style={{ width: '180px' }}
                />
                <input
                  type="text"
                  placeholder="Mandatory Manager Reason (e.g. VIP goodwill)"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  required
                  className="input"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn--secondary btn--sm">
                  Cancel
                </button>
                <button type="submit" disabled={adjSubmitting} className="btn btn--primary btn--sm">
                  {adjSubmitting ? 'Applying…' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : customer ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: 'Loyalty Points', value: customer.pointsBalance.toLocaleString() + ' pts', icon: '🎯' },
                { label: 'Lifetime Spend', value: fmtMoney(customer.lifetimeSpend),        icon: '💰' },
                { label: 'Total Visits',   value: String(customer.totalVisits) + ' visits', icon: '🍽️' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '16px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ fontSize: '18px' }}>{s.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-brand-500)', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Identity & Preferences */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Name</label>
                      <input type="text" value={eName} onChange={e => setEName(e.target.value)} className="input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Phone</label>
                      <input type="tel" value={ePhone} onChange={e => setEPhone(e.target.value)} className="input" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
                      <input type="email" value={eEmail} onChange={e => setEEmail(e.target.value)} className="input" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Birthday</label>
                      <input type="date" value={eBirthDate} onChange={e => setEBirthDate(e.target.value)} className="input" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Dietary & Allergies (comma-separated)</label>
                    <input type="text" value={eAllergies} onChange={e => setEAllergies(e.target.value)} className="input" style={{ width: '100%' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Tags (e.g. VIP, Regular, Wine Lover)</label>
                    <input type="text" value={eTags} onChange={e => setETags(e.target.value)} className="input" style={{ width: '100%' }} />
                  </div>

                  {/* Consent Preferences */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Marketing Communication Consent
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={eConsentEmail} onChange={e => setEConsentEmail(e.target.checked)} /> Email
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={eConsentSms} onChange={e => setEConsentSms(e.target.checked)} /> SMS
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={eConsentWa} onChange={e => setEConsentWa(e.target.checked)} /> WhatsApp
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Notes</label>
                    <textarea value={eNotes} onChange={e => setENotes(e.target.value)} className="input" style={{ width: '100%', minHeight: '50px' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditing(false)} className="btn btn--secondary" style={{ flex: 1 }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn btn--primary" style={{ flex: 1 }}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>📞 {customer.phone}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>📅 Joined {fmtDate(customer.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                    📧 {customer.email || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No email on file</span>}
                  </div>
                  {customer.birthDate && (
                    <div style={{ fontSize: '13px' }}>🎂 Birthday: {fmtDate(customer.birthDate)}</div>
                  )}

                  {/* Communication Consent Badges */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Consent:</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: customer.marketingConsentEmail ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.2)', color: customer.marketingConsentEmail ? '#22c55e' : '#9ca3af' }}>
                      Email: {customer.marketingConsentEmail ? 'Opted In' : 'No'}
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: customer.marketingConsentSms ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.2)', color: customer.marketingConsentSms ? '#22c55e' : '#9ca3af' }}>
                      SMS: {customer.marketingConsentSms ? 'Opted In' : 'No'}
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: customer.marketingConsentWhatsApp ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.2)', color: customer.marketingConsentWhatsApp ? '#22c55e' : '#9ca3af' }}>
                      WA: {customer.marketingConsentWhatsApp ? 'Opted In' : 'No'}
                    </span>
                  </div>

                  {/* Allergy Tags */}
                  {customer.allergyTags && customer.allergyTags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px' }}>⚠️</span>
                      {customer.allergyTags.map(t => (
                        <span key={t} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '999px' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Segmentation Tags */}
                  {customer.tags && customer.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {customer.tags.map(t => (
                        <span key={t} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '999px' }}>🏷️ {t}</span>
                      ))}
                    </div>
                  )}

                  {customer.notes && (
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>📝 {customer.notes}</div>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {(['timeline', 'orders', 'loyalty'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '12px', fontSize: '13px',
                    fontWeight: tab === t ? 700 : 400,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? 'var(--brand-emerald, #059669)' : 'var(--color-text-secondary)',
                    borderBottom: tab === t ? '2px solid var(--brand-emerald, #059669)' : '2px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {t === 'timeline'
                    ? `Chronological Timeline (${timelineEvents.length})`
                    : t === 'orders'
                    ? `Orders (${customer.orders.length})`
                    : `Points Ledger (${customer.ledgerEntries?.length || customer.redemptions.length})`}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tab === 'timeline' ? (
                timelineEvents.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No activity timeline recorded yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                    {timelineEvents.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{evt.title}</span>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                            background: evt.color + '22',
                            color: evt.color,
                            fontWeight: 700,
                          }}>
                            {evt.badge}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          <span>{evt.subtitle}</span>
                          {evt.amount && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{evt.amount}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {fmtDateTime(evt.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : tab === 'orders' ? (
                customer.orders.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No orders yet</p>
                ) : customer.orders.map(o => (
                  <div key={o.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(o.createdAt)} · {o.table?.name || 'Order'}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                          background: (STATUS_COLOR[o.status] || '#6b7280') + '22',
                          color: STATUS_COLOR[o.status] || '#6b7280', fontWeight: 600,
                        }}>
                          {o.status}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>{fmtMoney(o.total)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {o.items.slice(0, 4).map((item, i) => (
                        <span key={i}>{item.quantity}× {item.menuItem.name}{i < Math.min(o.items.length, 4) - 1 ? ', ' : ''}</span>
                      ))}
                      {o.items.length > 4 && <span style={{ fontStyle: 'italic' }}> +{o.items.length - 4} more</span>}
                    </div>
                  </div>
                ))
              ) : (
                (customer.ledgerEntries && customer.ledgerEntries.length > 0) ? (
                  customer.ledgerEntries.map(l => (
                    <div key={l.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{l.type.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{l.reason || fmtDateTime(l.createdAt)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
                          color: l.pointsChange >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {l.pointsChange >= 0 ? `+${l.pointsChange}` : l.pointsChange} pts
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bal: {l.balanceAfter} pts</div>
                      </div>
                    </div>
                  ))
                ) : (
                  customer.redemptions.map(r => (
                    <div key={r.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.reward.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{fmtDate(r.createdAt)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--brand-emerald, #059669)', fontWeight: 700 }}>
                        -{r.pointsRedeemed} pts
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--color-text-secondary)' }}>
            Customer not found
          </div>
        )}
      </div>
    </div>
  )
}
