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
interface Customer {
  id: string; name: string; phone: string; email?: string | null
  pointsBalance: number; lifetimeSpend: number | string; totalVisits: number
  allergyTags: string[]; notes?: string | null; createdAt: string
  orders: Order[]; redemptions: Redemption[]
}

interface Props {
  customerId: string
  onClose: () => void
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtMoney(v: number | string) {
  return '$' + Number(v).toFixed(2)
}

const STATUS_COLOR: Record<string, string> = {
  PAID: '#22c55e', OPEN: '#6366f1', VOIDED: '#ef4444',
  SENT_TO_KITCHEN: '#f59e0b', PARTIALLY_READY: '#f97316',
}

export default function CustomerProfileModal({ customerId, onClose }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState<'orders' | 'loyalty'>('orders')

  const [eName,      setEName]      = useState('')
  const [ePhone,     setEPhone]     = useState('')
  const [eEmail,     setEEmail]     = useState('')
  const [eAllergies, setEAllergies] = useState('')
  const [eNotes,     setENotes]     = useState('')

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
        setEAllergies(c.allergyTags.join(', '))
        setENotes(c.notes || '')
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchCustomer() }, [customerId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/customers/' + customerId, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        eName,
          phone:       ePhone,
          email:       eEmail || null,
          allergyTags: eAllergies.split(',').map(t => t.trim()).filter(Boolean),
          notes:       eNotes || null,
        }),
      })
      setEditing(false)
      fetchCustomer()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

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
          width: '520px', maxWidth: '95vw', height: '100%',
          background: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {loading ? 'Loading…' : customer?.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Customer Profile</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!editing && customer && (
              <button onClick={() => setEditing(true)} className="btn btn--secondary btn--sm">Edit</button>
            )}
            <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ fontSize: '20px', lineHeight: 1, padding: '0 8px' }}>×</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : customer ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: 'Loyalty Pts',    value: customer.pointsBalance.toLocaleString(), icon: '🎯' },
                { label: 'Lifetime Spend', value: fmtMoney(customer.lifetimeSpend),        icon: '💰' },
                { label: 'Visits',         value: String(customer.totalVisits),             icon: '🍽️' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '16px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ fontSize: '20px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-brand-500)', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Identity */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {([
                    { label: 'Name',                       val: eName,      set: setEName,      type: 'text'  },
                    { label: 'Phone',                      val: ePhone,     set: setEPhone,     type: 'tel'   },
                    { label: 'Email',                      val: eEmail,     set: setEEmail,     type: 'email' },
                    { label: 'Allergies (comma-separated)',val: eAllergies, set: setEAllergies, type: 'text'  },
                  ] as { label: string; val: string; set: (v: string) => void; type: string }[]).map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                      <input
                        type={f.type} value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Notes</label>
                    <textarea
                      value={eNotes} onChange={e => setENotes(e.target.value)}
                      className="input"
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical' }}
                    />
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
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>📞 {customer.phone}</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                    📧 {customer.email || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No email on file</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>📅 Member since {fmtDate(customer.createdAt)}</div>
                  {customer.allergyTags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px' }}>⚠️</span>
                      {customer.allergyTags.map(t => (
                        <span key={t} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '999px' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {customer.notes && (
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>📝 {customer.notes}</div>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {(['orders', 'loyalty'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '12px', fontSize: '13px',
                    fontWeight: tab === t ? 700 : 400,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? 'var(--color-brand-500)' : 'var(--color-text-secondary)',
                    borderBottom: tab === t ? '2px solid var(--color-brand-500)' : '2px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {t === 'orders'
                    ? 'Order History (' + customer.orders.length + ')'
                    : 'Loyalty (' + customer.redemptions.length + ')'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tab === 'orders' ? (
                customer.orders.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No orders yet</p>
                ) : customer.orders.map(o => (
                  <div key={o.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(o.createdAt)} · {o.table.name}</div>
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
                customer.redemptions.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No redemptions yet</p>
                ) : customer.redemptions.map(r => (
                  <div key={r.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.reward.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{fmtDate(r.createdAt)}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-brand-500)', fontWeight: 700 }}>
                      -{r.pointsRedeemed} pts
                    </div>
                  </div>
                ))
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
