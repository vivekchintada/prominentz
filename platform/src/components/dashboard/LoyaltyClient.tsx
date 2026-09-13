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

export function LoyaltyClient() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [pointsRequired, setPointsRequired] = useState('100')
  const [discountType, setDiscountType] = useState('FLAT')
  const [discountAmount, setDiscountAmount] = useState('10.00')
  const [submitting, setSubmitting] = useState(false)

  const fetchRewards = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/loyalty/rewards')
      const data = await res.json()
      if (data.rewards) {
        setRewards(data.rewards)
      }
    } catch (err) {
      console.error('Failed to load rewards', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRewards()
  }, [])

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !pointsRequired || !discountAmount) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          pointsRequired: Number(pointsRequired),
          discountType,
          discountAmount: Number(discountAmount),
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setName('')
        setPointsRequired('100')
        setDiscountAmount('10.00')
        fetchRewards()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to create reward')
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating reward')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>⭐ Loyalty Program & Rewards Engine</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Earn 1 point per $1 spent automatically. Configured rewards redeemable at POS & Table QR checkout.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          🎁 Create Loyalty Reward Tier
        </button>
      </div>

      {/* Rules Summary Banner */}
      <div style={{ padding: '16px', backgroundColor: '#e0e7ff', borderRadius: '12px', border: '1px solid #c7d2fe', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '28px' }}>💡</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#3730a3', fontWeight: 700 }}>Automatic Points Earning System</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#4338ca' }}>
            Customers earn 1 point per $1 spent on check subtotals whenever a payment status changes to <code>COMPLETED</code>.
          </p>
        </div>
      </div>

      {/* Reward Tiers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ padding: '24px', color: '#6b7280' }}>Loading rewards configuration...</div>
        ) : rewards.length === 0 ? (
          <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
            No rewards created yet. Click <strong>"Create Loyalty Reward Tier"</strong> to configure your first points reward!
          </div>
        ) : (
          rewards.map((rw) => (
            <div key={rw.id} style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>{rw.name}</h3>
                <span style={{ padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                  ⭐ {rw.pointsRequired} pts
                </span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '20px', fontWeight: 800, color: '#059669' }}>
                {rw.discountType === 'FLAT' ? `$${Number(rw.discountAmount).toFixed(2)} OFF` : `${rw.discountAmount}% OFF`}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Redeemable during checkout at POS & Table QR
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Reward Tier Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>🎁 Create Loyalty Reward Tier</h3>
            <form onSubmit={handleCreateReward} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Reward Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. $10 Off Total Check"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Points Required *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="100"
                  value={pointsRequired}
                  onChange={(e) => setPointsRequired(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="FLAT">Flat Dollar Discount ($)</option>
                  <option value="PERCENTAGE">Percentage Discount (%)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Discount Value *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Creating...' : 'Save Reward Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
