'use client'

import React, { useState, useEffect } from 'react'
import CustomerProfileModal from './CustomerProfileModal'

interface Tier {
  id: string
  name: string
  badgeColor: string
  pointsMultiplier: number
}

interface Customer {
  id: string
  name: string
  phone: string
  email?: string | null
  pointsBalance: number
  lifetimeSpend: number
  totalVisits: number
  allergyTags: string[]
  tags?: string[]
  notes?: string | null
  createdAt: string
  lastVisitAt?: string | null
  tier?: Tier | null
  _count?: { orders: number }
}

interface SegmentSummary {
  key: string
  count: number
  sample: any[]
}

interface Campaign {
  id: string
  title: string
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP'
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
  targetSegment: string
  subject?: string | null
  messageBody: string
  recipientCount: number
  sentAt?: string | null
  createdAt: string
}

export function CrmClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [segments, setSegments] = useState<SegmentSummary[]>([])
  const [activeSegment, setActiveSegment] = useState<string>('ALL')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Marketing campaigns state
  const [showCampaignsModal, setShowCampaignsModal] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campTitle, setCampTitle] = useState('')
  const [campChannel, setCampChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL')
  const [campSegment, setCampSegment] = useState('ALL')
  const [campSubject, setCampSubject] = useState('')
  const [campBody, setCampBody] = useState('Hi {{name}}, we have a special offer for you!')
  const [campCreating, setCampCreating] = useState(false)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)

  // Form state for new guest
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [allergies, setAllergies] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCustomers = async (searchQuery = '') => {
    setLoading(true)
    try {
      const url = searchQuery ? `/api/customers?q=${encodeURIComponent(searchQuery)}` : '/api/customers'
      const res = await fetch(url)
      const data = await res.json()
      if (data.customers) {
        setCustomers(data.customers)
      }
    } catch (err) {
      console.error('Failed to fetch customers', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSegments = async () => {
    try {
      const res = await fetch('/api/customers/segments')
      const data = await res.json()
      if (data.summary) {
        setSegments(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch segments', err)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (data.campaigns) {
        setCampaigns(data.campaigns)
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err)
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchSegments()
    fetchCampaigns()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers(query)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSubmitting(true)
    try {
      const tagArray = allergies.split(',').map((t) => t.trim()).filter(Boolean)
      const segmentTags = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          allergyTags: tagArray,
          tags: segmentTags,
          notes: notes.trim() || null,
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setName('')
        setPhone('')
        setEmail('')
        setAllergies('')
        setTags('')
        setNotes('')
        fetchCustomers(query)
        fetchSegments()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to save customer')
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campTitle.trim() || !campBody.trim()) return
    setCampCreating(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campTitle.trim(),
          channel: campChannel,
          targetSegment: campSegment,
          subject: campChannel === 'EMAIL' ? campSubject.trim() : null,
          messageBody: campBody.trim(),
        }),
      })
      if (res.ok) {
        setCampTitle('')
        setCampSubject('')
        setCampBody('Hi {{name}}, we have a special offer for you!')
        fetchCampaigns()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create campaign')
      }
    } catch (err: any) {
      alert(err?.message || 'Campaign creation error')
    } finally {
      setCampCreating(false)
    }
  }

  const handleDispatchCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to broadcast this campaign to eligible opted-in customers?')) return
    setDispatchingId(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`Campaign broadcast successfully sent to ${data.sentCount} customers!`)
        fetchCampaigns()
      } else {
        alert(data.error || 'Failed to send campaign')
      }
    } catch (err: any) {
      alert(err?.message || 'Broadcast error')
    } finally {
      setDispatchingId(null)
    }
  }

  // Filter customers by active segment
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const filteredCustomers = customers.filter((c) => {
    if (activeSegment === 'ALL') return true
    if (activeSegment === 'NEW') return c.totalVisits <= 1 && new Date(c.createdAt) >= thirtyDaysAgo
    if (activeSegment === 'REPEAT') return c.totalVisits >= 2
    if (activeSegment === 'HIGH_VALUE') return Number(c.lifetimeSpend) >= 200 || c.tier !== null
    if (activeSegment === 'LAPSED') return c.totalVisits >= 1 && (!c.lastVisitAt || new Date(c.lastVisitAt) < sixtyDaysAgo)
    if (activeSegment === 'DIETARY') return Array.isArray(c.allergyTags) && c.allergyTags.length > 0
    return true
  })

  const handleExportCSV = () => {
    if (customers.length === 0) return
    const headers = ['Name', 'Phone', 'Email', 'Tier', 'Points', 'Lifetime Spend', 'Visits', 'Allergies', 'Tags', 'Joined']
    const rows = filteredCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.tier?.name || 'Standard'}"`,
      c.pointsBalance,
      Number(c.lifetimeSpend).toFixed(2),
      c.totalVisits,
      `"${(c.allergyTags || []).join('; ')}"`,
      `"${(c.tags || []).join('; ')}"`,
      `"${new Date(c.createdAt).toLocaleDateString()}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `guests_crm_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ padding: '0 0 32px 0', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            👥 Unified Guest Directory & CRM
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Cross-channel customer profiles from POS, QR, and online ordering with loyalty tiers and consent tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            className="btn btn--secondary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={() => setShowCampaignsModal(true)}
            className="btn btn--secondary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📢</span> Marketing Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn--primary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>➕</span> Register Guest
          </button>
        </div>
      </div>

      {/* Audience Segmentation Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {[
          { key: 'ALL', label: 'All Guests', icon: '👥' },
          { key: 'NEW', label: 'New Guests (30d)', icon: '🌱' },
          { key: 'REPEAT', label: 'Repeat (2+ visits)', icon: '🔁' },
          { key: 'HIGH_VALUE', label: 'VIP & High Spend', icon: '👑' },
          { key: 'LAPSED', label: 'Lapsed (>60d)', icon: '⏳' },
          { key: 'DIETARY', label: 'Dietary & Allergies', icon: '⚠️' },
        ].map((seg) => {
          const count = segments.find((s) => s.key === seg.key)?.count
          const isActive = activeSegment === seg.key
          return (
            <button
              key={seg.key}
              onClick={() => setActiveSegment(seg.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                background: isActive ? 'var(--brand-emerald, #059669)' : 'var(--color-bg-card)',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                border: isActive ? '1px solid var(--brand-emerald, #059669)' : '1px solid var(--color-border)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{seg.icon}</span>
              <span>{seg.label}</span>
              {count !== undefined && (
                <span style={{
                  fontSize: '11px', padding: '1px 6px', borderRadius: '10px',
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by guest name, phone (+1...), or email..."
          className="input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn--secondary">
          Search
        </button>
      </form>

      {/* Customer Directory Table */}
      <div style={{
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
            Loading guest directory...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>No guest profiles match this segment</div>
            <p style={{ fontSize: '13px', maxWidth: '400px', margin: '6px auto 16px' }}>
              Register guests manually or link customer info when taking POS and online orders.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn--primary btn--sm">
              Register New Guest
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Guest Name & Tier</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Loyalty Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Lifetime Spend</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Visits</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Allergies & Tags</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{c.name}</span>
                        {c.tier && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px',
                            background: c.tier.badgeColor + '22',
                            color: c.tier.badgeColor,
                            border: `1px solid ${c.tier.badgeColor}44`,
                          }}>
                            ★ {c.tier.name}
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          📝 {c.notes.slice(0, 40)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{c.phone}</div>
                      {c.email && <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{c.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        ⭐ {c.pointsBalance} pts
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                      ${Number(c.lifetimeSpend).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {c.totalVisits} visits
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Array.isArray(c.allergyTags) && c.allergyTags.map((t, idx) => (
                          <span key={idx} style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                          }}>
                            🚫 {t}
                          </span>
                        ))}
                        {Array.isArray(c.tags) && c.tags.map((t, idx) => (
                          <span key={idx} style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                          }}>
                            🏷️ {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Modal with Timeline */}
      {selectedCustomerId && (
        <CustomerProfileModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onCustomerUpdated={() => {
            fetchCustomers(query)
            fetchSegments()
          }}
        />
      )}

      {/* Register New Guest Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 950,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            width: '460px', maxWidth: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>➕ Register New Guest</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn--ghost btn--sm">×</button>
            </div>
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Sarah Connor" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Phone Number *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="e.g. +1 555-0199" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Email Address (optional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="guest@example.com" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Dietary & Allergies</label>
                <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Gluten, Peanuts" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Segmentation Tags</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="VIP, Wine Lover, Regular" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Prefers patio seating" className="input" style={{ width: '100%', minHeight: '50px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn--secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn--primary" style={{ flex: 1 }}>
                  {submitting ? 'Registering…' : 'Register Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marketing Campaigns Modal */}
      {showCampaignsModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 950,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            width: '680px', maxWidth: '100%', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>📢 Marketing Campaigns & Broadcasts</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Targeted messaging with automatic customer communication consent enforcement
                </div>
              </div>
              <button onClick={() => setShowCampaignsModal(false)} className="btn btn--ghost btn--sm">×</button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Campaign Composer */}
              <form onSubmit={handleCreateCampaign} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Compose New Campaign</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Channel</label>
                    <select
                      value={campChannel}
                      onChange={(e: any) => setCampChannel(e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="EMAIL">📧 Email (Resend)</option>
                      <option value="SMS">💬 SMS (Twilio)</option>
                      <option value="WHATSAPP">📱 WhatsApp (Meta)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Target Segment</label>
                    <select
                      value={campSegment}
                      onChange={(e) => setCampSegment(e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="ALL">All Opted-In Guests</option>
                      <option value="NEW">New Guests (30d)</option>
                      <option value="REPEAT">Repeat Guests</option>
                      <option value="HIGH_VALUE">VIP & High-Value</option>
                      <option value="LAPSED">Lapsed Guests</option>
                      <option value="BIRTHDAY">Birthdays this month</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Campaign Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekend Special"
                      value={campTitle}
                      onChange={(e) => setCampTitle(e.target.value)}
                      required
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {campChannel === 'EMAIL' && (
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Email Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. 20% Off Your Next Meal at Resto AI!"
                      value={campSubject}
                      onChange={(e) => setCampSubject(e.target.value)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Message Body</label>
                    <span style={{ fontSize: '11px', color: 'var(--color-brand-500)' }}>Tip: Use {'{{name}}'} for guest name</span>
                  </div>
                  <textarea
                    rows={3}
                    value={campBody}
                    onChange={(e) => setCampBody(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="submit" disabled={campCreating} className="btn btn--primary btn--sm">
                    {campCreating ? 'Saving Draft…' : 'Save Campaign Draft'}
                  </button>
                </div>
              </form>

              {/* Past Campaigns List */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Campaign History</div>
                {campaigns.length === 0 ? (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                    No campaigns created yet. Compose your first campaign above!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{camp.title}</span>
                            <span style={{
                              fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                              background: camp.status === 'SENT' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                              color: camp.status === 'SENT' ? '#22c55e' : '#818cf8',
                              fontWeight: 600,
                            }}>
                              {camp.status}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              via {camp.channel} · {camp.targetSegment}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            {camp.messageBody.slice(0, 70)}...
                          </div>
                        </div>

                        <div>
                          {camp.status === 'DRAFT' ? (
                            <button
                              onClick={() => handleDispatchCampaign(camp.id)}
                              disabled={dispatchingId === camp.id}
                              className="btn btn--primary btn--sm"
                            >
                              {dispatchingId === camp.id ? 'Sending…' : '🚀 Send Now'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              Sent to {camp.recipientCount} guests
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
