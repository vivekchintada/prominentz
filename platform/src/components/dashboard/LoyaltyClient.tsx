'use client'

import React, { useState, useEffect } from 'react'

interface LoyaltyReward {
  id: string
  name: string
  pointsRequired: number
  discountType: string
  discountAmount: number
  isActive: boolean
}

interface LoyaltyTier {
  id: string
  name: string
  minimumSpend: number
  pointsMultiplier: number
  perks: string[]
  badgeColor: string
  _count?: { customers: number }
}

interface LoyaltyLiability {
  totalMembers: number
  totalPointsOutstanding: number
  pointValueDollar: number
  estimatedDollarLiability: number
  totalLifetimeSpend: number
  pointsEarnedThisMonth: number
  pointsRedeemedThisMonth: number
  tierBreakdown: { id: string; name: string; badgeColor: string; memberCount: number; minimumSpend: number }[]
}

interface LoyaltyConfig {
  id: string
  pointsPerDollar: number
  pointsExpiryDays: number | null
  welcomeBonusPoints: number
  birthdayBonusPoints: number
  minimumRedemptionPoints: number
  isEnabled: boolean
}

export function LoyaltyClient() {
  const [activeTab, setActiveTab] = useState<'tiers' | 'rewards' | 'settings'>('tiers')
  const [liability, setLiability] = useState<LoyaltyLiability | null>(null)
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [config, setConfig] = useState<LoyaltyConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddRewardModal, setShowAddRewardModal] = useState(false)
  const [showAddTierModal, setShowAddTierModal] = useState(false)

  // Reward Form state
  const [rName, setRName] = useState('')
  const [rPoints, setRPoints] = useState('100')
  const [rType, setRType] = useState('FLAT')
  const [rDiscount, setRDiscount] = useState('10.00')
  const [rSubmitting, setRSubmitting] = useState(false)

  // Tier Form state
  const [tName, setTName] = useState('')
  const [tMinSpend, setTMinSpend] = useState('100')
  const [tMultiplier, setTMultiplier] = useState('1.2')
  const [tColor, setTColor] = useState('var(--color-text-primary)')
  const [tPerks, setTPerks] = useState('1.2x Points, Free Birthday Dessert')
  const [tSubmitting, setTSubmitting] = useState(false)

  // Config Form state
  const [savingConfig, setSavingConfig] = useState(false)
  const [expiringPoints, setExpiringPoints] = useState(false)

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [liabRes, tiersRes, rewRes, confRes] = await Promise.all([
        fetch('/api/loyalty/liability'),
        fetch('/api/loyalty/tiers'),
        fetch('/api/loyalty/rewards'),
        fetch('/api/loyalty/config'),
      ])

      if (liabRes.ok) setLiability(await liabRes.json())
      if (tiersRes.ok) {
        const d = await tiersRes.json()
        setTiers(d.tiers || [])
      }
      if (rewRes.ok) {
        const d = await rewRes.json()
        setRewards(d.rewards || [])
      }
      if (confRes.ok) {
        const d = await confRes.json()
        setConfig(d.config || null)
      }
    } catch (err) {
      console.error('Failed to load loyalty data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rName.trim() || !rPoints || !rDiscount) return
    setRSubmitting(true)
    try {
      const res = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rName.trim(),
          pointsRequired: Number(rPoints),
          discountType: rType,
          discountAmount: Number(rDiscount),
        }),
      })
      if (res.ok) {
        setShowAddRewardModal(false)
        setRName('')
        setRPoints('100')
        setRDiscount('10.00')
        fetchAllData()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to create reward')
      }
    } catch (err: unknown) {
      alert(err?.message || 'Error creating reward')
    } finally {
      setRSubmitting(false)
    }
  }

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tName.trim() || !tMinSpend) return
    setTSubmitting(true)
    try {
      const perksArr = tPerks.split(',').map((p) => p.trim()).filter(Boolean)
      const res = await fetch('/api/loyalty/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tName.trim(),
          minimumSpend: Number(tMinSpend),
          pointsMultiplier: Number(tMultiplier),
          badgeColor: tColor,
          perks: perksArr,
        }),
      })
      if (res.ok) {
        setShowAddTierModal(false)
        setTName('')
        setTMinSpend('100')
        setTMultiplier('1.2')
        setTPerks('1.2x Points, Free Birthday Dessert')
        fetchAllData()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to create tier')
      }
    } catch (err: unknown) {
      alert(err?.message || 'Error creating tier')
    } finally {
      setTSubmitting(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    setSavingConfig(true)
    try {
      const res = await fetch('/api/loyalty/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        alert('Loyalty program settings updated successfully')
        fetchAllData()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to update settings')
      }
    } catch (err: unknown) {
      alert(err?.message || 'Save error')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleTriggerExpiry = async () => {
    if (!confirm('Run points expiry audit now for inactive customers?')) return
    setExpiringPoints(true)
    try {
      const res = await fetch('/api/loyalty/expire', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`Points expiry complete: Expired ${data.totalPointsExpired} points across ${data.expiredCount} customers.`)
        fetchAllData()
      } else {
        alert(data.error || 'Failed to run expiry')
      }
    } catch (err: unknown) {
      alert(err?.message || 'Expiry error')
    } finally {
      setExpiringPoints(false)
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '32px' }}>
      {/* Liability Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            👥 Enrolled Loyalty Members
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--color-text-primary)' }}>
            {liability?.totalMembers.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Across {tiers.length} active milestone tiers
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            ⭐ Points in Circulation
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--color-brand-500)', fontFamily: 'var(--font-mono)' }}>
            {liability?.totalPointsOutstanding.toLocaleString() || '0'} <span style={{ fontSize: '16px' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            +{liability?.pointsEarnedThisMonth.toLocaleString() || '0'} pts earned this month
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            💳 Estimated Dollar Liability
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
            ${liability?.estimatedDollarLiability.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Valued at ~${liability?.pointValueDollar.toFixed(2) || '0.10'} / pt redemption value
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            🔥 Monthly Redemptions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            {liability?.pointsRedeemedThisMonth.toLocaleString() || '0'} <span style={{ fontSize: '16px' }}>pts</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Burned at POS and online checkout
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        {[
          { key: 'tiers', label: `Milestone Tiers (${tiers.length})`, icon: '🏆' },
          { key: 'rewards', label: `Redeemable Rewards (${rewards.length})`, icon: '🎁' },
          { key: 'settings', label: 'Program Settings & Expiry', icon: '⚙️' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: activeTab === t.key ? 700 : 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === t.key ? 'var(--color-brand-500)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--color-brand-500)' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TIERS */}
      {activeTab === 'tiers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>🏆 Loyalty Milestone Tiers</h3>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Customers automatically unlock higher tiers as their lifetime spend grows.
              </div>
            </div>
            <button onClick={() => setShowAddTierModal(true)} className="btn btn--primary btn--sm">
              + Create New Tier
            </button>
          </div>

          {tiers.length === 0 ? (
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No loyalty tiers configured yet</div>
              <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>Create Bronze, Silver, Gold, and VIP tiers with customized point multipliers.</p>
              <button onClick={() => setShowAddTierModal(true)} className="btn btn--primary btn--sm">
                Create First Tier
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {tiers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                    background: t.badgeColor,
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {t.name}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
                      background: t.badgeColor + '22', color: t.badgeColor,
                      border: `1px solid ${t.badgeColor}44`,
                    }}>
                      {t.pointsMultiplier}x Points
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                    Spend Threshold: <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>${Number(t.minimumSpend).toFixed(2)}</strong>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Perks:</div>
                    {Array.isArray(t.perks) && t.perks.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        {t.perks.map((p, pIdx) => (
                          <li key={pIdx} style={{ marginBottom: '2px' }}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Standard multiplier benefits</div>
                    )}
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '10px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>Members in Tier:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{t._count?.customers || 0} guests</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REWARDS */}
      {activeTab === 'rewards' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>🎁 Redeemable Rewards Catalog</h3>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Discounts guests can redeem during checkout using their accumulated loyalty points.
              </div>
            </div>
            <button onClick={() => setShowAddRewardModal(true)} className="btn btn--primary btn--sm">
              + Create Reward
            </button>
          </div>

          <div style={{
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            {rewards.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No rewards configured yet. Click "+ Create Reward" to add one!
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '12px 16px' }}>Reward Name</th>
                    <th style={{ padding: '12px 16px' }}>Points Required</th>
                    <th style={{ padding: '12px 16px' }}>Benefit</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                          background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {r.pointsRequired} pts
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                        {r.discountType === 'PERCENTAGE' ? `${r.discountAmount}% Off` : `$${Number(r.discountAmount).toFixed(2)} Off`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                          background: r.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.2)',
                          color: r.isActive ? '#22c55e' : '#9ca3af', fontWeight: 600,
                        }}>
                          {r.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & EXPIRY */}
      {activeTab === 'settings' && config && (
        <div style={{
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          maxWidth: '680px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>⚙️ Loyalty Program Rules & Automation</h3>
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
              />
              Enable Loyalty Points Accumulation & Redemptions
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Points Per Dollar Spent
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.pointsPerDollar}
                  onChange={(e) => setConfig({ ...config, pointsPerDollar: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Points Expiry (Days of Inactivity)
                </label>
                <input
                  type="number"
                  value={config.pointsExpiryDays || 365}
                  onChange={(e) => setConfig({ ...config, pointsExpiryDays: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Welcome Bonus Points (On Sign-up)
                </label>
                <input
                  type="number"
                  value={config.welcomeBonusPoints}
                  onChange={(e) => setConfig({ ...config, welcomeBonusPoints: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Birthday Bonus Points
                </label>
                <input
                  type="number"
                  value={config.birthdayBonusPoints}
                  onChange={(e) => setConfig({ ...config, birthdayBonusPoints: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleTriggerExpiry}
                disabled={expiringPoints}
                className="btn btn--secondary btn--sm"
              >
                {expiringPoints ? 'Running Expiry…' : '⏳ Run Points Expiry Check'}
              </button>
              <button type="submit" disabled={savingConfig} className="btn btn--primary">
                {savingConfig ? 'Saving…' : 'Save Rules'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE TIER MODAL */}
      {showAddTierModal && (
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
            width: '460px', maxWidth: '100%', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>🏆 Create Milestone Tier</h3>
              <button onClick={() => setShowAddTierModal(false)} className="btn btn--ghost btn--sm">×</button>
            </div>
            <form onSubmit={handleCreateTier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Tier Name *</label>
                <input type="text" placeholder="e.g. Gold Member" value={tName} onChange={e => setTName(e.target.value)} required className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Lifetime Spend Req ($) *</label>
                  <input type="number" step="1" value={tMinSpend} onChange={e => setTMinSpend(e.target.value)} required className="input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Points Multiplier *</label>
                  <input type="number" step="0.1" value={tMultiplier} onChange={e => setTMultiplier(e.target.value)} required className="input" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Badge Accent Color</label>
                <input type="color" value={tColor} onChange={e => setTColor(e.target.value)} className="input" style={{ width: '100%', height: '36px', padding: '2px 4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Perks (comma-separated)</label>
                <input type="text" placeholder="1.2x Points, Free Birthday Dessert" value={tPerks} onChange={e => setTPerks(e.target.value)} className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddTierModal(false)} className="btn btn--secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={tSubmitting} className="btn btn--primary" style={{ flex: 1 }}>
                  {tSubmitting ? 'Creating…' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REWARD MODAL */}
      {showAddRewardModal && (
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
            width: '460px', maxWidth: '100%', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>🎁 Create Redeemable Reward</h3>
              <button onClick={() => setShowAddRewardModal(false)} className="btn btn--ghost btn--sm">×</button>
            </div>
            <form onSubmit={handleCreateReward} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Reward Name *</label>
                <input type="text" placeholder="e.g. $10 Off Total Check" value={rName} onChange={e => setRName(e.target.value)} required className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Points Required *</label>
                <input type="number" value={rPoints} onChange={e => setRPoints(e.target.value)} required className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Discount Type</label>
                  <select value={rType} onChange={e => setRType(e.target.value)} className="input" style={{ width: '100%' }}>
                    <option value="FLAT">Flat Dollar ($)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Discount Amount *</label>
                  <input type="number" step="0.01" value={rDiscount} onChange={e => setRDiscount(e.target.value)} required className="input" style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddRewardModal(false)} className="btn btn--secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={rSubmitting} className="btn btn--primary" style={{ flex: 1 }}>
                  {rSubmitting ? 'Creating…' : 'Create Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
