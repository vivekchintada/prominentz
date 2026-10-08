'use client'

import React, { useState, useEffect } from 'react'

export interface CouponItem {
  id: string
  code: string
  validCategory?: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountAmount: number
  startDate?: string | null
  endDate?: string | null
  pointsCost?: number | null
  pointsReward?: number | null
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE'
  usageLimit?: number | null
  usageCount: number
  createdAt: string
}

export default function CouponsTableView() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'code' | 'discount'>('newest')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingCoupon, setViewingCoupon] = useState<CouponItem | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null)

  // Form Fields
  const [code, setCode] = useState('')
  const [validCategory, setValidCategory] = useState('All Categories')
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [discountAmount, setDiscountAmount] = useState<number | string>('')
  const [startDate, setStartDate] = useState('2026-01-01')
  const [endDate, setEndDate] = useState('2026-12-31')
  const [status, setStatus] = useState<'ACTIVE' | 'EXPIRED' | 'INACTIVE'>('ACTIVE')
  const [requiresLoyaltyPoints, setRequiresLoyaltyPoints] = useState(false)
  const [pointsCost, setPointsCost] = useState<number | string>(100)
  const [pointsReward, setPointsReward] = useState<number | string>(20)
  const [saving, setSaving] = useState(false)

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/coupons')
      if (res.ok) {
        const data = await res.json()
        setCoupons(data)
      }
    } catch (err) {
      console.error('Failed to load coupons:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleOpenAdd = () => {
    setEditingCoupon(null)
    setCode('')
    setValidCategory('All Categories')
    setDiscountType('PERCENTAGE')
    setDiscountAmount('')
    setStartDate('2026-01-01')
    setEndDate('2026-12-31')
    setStatus('ACTIVE')
    setRequiresLoyaltyPoints(false)
    setPointsCost(100)
    setPointsReward(20)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (coupon: CouponItem) => {
    setEditingCoupon(coupon)
    setCode(coupon.code)
    setValidCategory(coupon.validCategory || 'All Categories')
    setDiscountType(coupon.discountType)
    setDiscountAmount(Number(coupon.discountAmount))
    setStartDate(coupon.startDate ? coupon.startDate.split('T')[0] : '2026-01-01')
    setEndDate(coupon.endDate ? coupon.endDate.split('T')[0] : '2026-12-31')
    setStatus(coupon.status)
    setRequiresLoyaltyPoints(Boolean(coupon.pointsCost && coupon.pointsCost > 0))
    setPointsCost(coupon.pointsCost || 100)
    setPointsReward(coupon.pointsReward || 0)
    setIsModalOpen(true)
  }

  const handleOpenView = (coupon: CouponItem) => {
    setViewingCoupon(coupon)
    setIsViewModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || discountAmount === '') return

    try {
      setSaving(true)
      const payload = {
        code: code.trim().toUpperCase(),
        validCategory: validCategory === 'All Categories' ? null : validCategory,
        discountType,
        discountAmount: Number(discountAmount),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        status,
        pointsCost: requiresLoyaltyPoints ? Number(pointsCost) : 0,
        pointsReward: Number(pointsReward || 0),
      }

      if (editingCoupon) {
        const res = await fetch(`/api/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update coupon')
      } else {
        const res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create coupon')
      }

      setIsModalOpen(false)
      fetchCoupons()
    } catch (err: unknown) {
      console.error(err)
      alert(err.message || 'Error saving coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return

    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id))
      } else {
        alert('Failed to delete coupon')
      }
    } catch (err) {
      console.error(err)
      alert('Error deleting coupon')
    }
  }

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Ongoing'
    const s = start ? new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Start'
    const e = end ? new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'End'
    return `${s} - ${e}`
  }

  const filtered = coupons
    .filter((c) => {
      if (statusFilter === 'ACTIVE') return c.status === 'ACTIVE'
      if (statusFilter === 'EXPIRED') return c.status === 'EXPIRED'
      return true
    })
    .filter((c) => {
      const q = searchQuery.toLowerCase()
      return c.code.toLowerCase().includes(q) || (c.validCategory || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'code') return a.code.localeCompare(b.code)
      if (sortBy === 'discount') return Number(b.discountAmount) - Number(a.discountAmount)
      return 0
    })

  const exportCSV = () => {
    const headers = ['Coupon Code', 'Valid Category', 'Discount Type', 'Discount Amount', 'Duration', 'Loyalty Points Required', 'Status']
    const rows = filtered.map((c) => [
      c.code,
      c.validCategory || 'All Categories',
      c.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount',
      c.discountType === 'PERCENTAGE' ? `${c.discountAmount}%` : `$${c.discountAmount}`,
      formatDateRange(c.startDate, c.endDate),
      c.pointsCost || 0,
      c.status,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `coupons_${Date.now()}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ROW ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>Coupons</h1>
          <button
            onClick={fetchCoupons}
            title="Refresh"
            style={{
              background: 'var(--color-bg-card-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Export Button */}
          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export ▾
          </button>

          {/* Add New Button */}
          <button
            onClick={handleOpenAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--brand)',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Add New
          </button>
        </div>
      </div>

      {/* ── TOOLBAR / SEARCH / FILTERS ────────────────────────── */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 280 }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Filter Pills & Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status Filter Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-bg-input)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === s ? '#ffffff' : 'transparent',
                  color: statusFilter === s ? 'var(--brand)' : '#64748b',
                  boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Expired'}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Sort by : Newest</option>
            <option value="oldest">Sort by : Oldest</option>
            <option value="code">Sort by : Code</option>
            <option value="discount">Sort by : Discount</option>
          </select>
        </div>
      </div>

      {/* ── COUPONS TABLE ─────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Coupon Code</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Valid Category</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Discount Type</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Discount Amount</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Duration</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</th>
              <th style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  Loading coupons...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  No coupons found.
                </td>
              </tr>
            ) : (
              filtered.map((coupon) => (
                <tr key={coupon.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Code */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
                        {coupon.code}
                      </span>
                      {coupon.pointsCost && coupon.pointsCost > 0 ? (
                        <span
                          title={`Can be redeemed using ${coupon.pointsCost} Customer Loyalty Points`}
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                          }}
                        >
                          ⭐ {coupon.pointsCost} pts
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Valid Category */}
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {coupon.validCategory || 'All Categories'}
                  </td>

                  {/* Discount Type */}
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {coupon.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                  </td>

                  {/* Discount Amount */}
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${Number(coupon.discountAmount).toFixed(0)}%`
                      : `$${Number(coupon.discountAmount).toFixed(0)}`}
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                    {formatDateRange(coupon.startDate, coupon.endDate)}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: coupon.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: coupon.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                        border: coupon.status === 'ACTIVE' ? '1px solid rgba(22, 163, 74, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
                      }}
                    >
                      {coupon.status === 'ACTIVE' ? 'Active' : 'Expired'}
                    </span>
                  </td>

                  {/* Actions (View, Edit, Delete) */}
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {/* View Button */}
                      <button
                        onClick={() => handleOpenView(coupon)}
                        title="View Coupon & Loyalty Points"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(coupon)}
                        title="Edit Coupon"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(coupon.id, coupon.code)}
                        title="Delete Coupon"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── VIEW COUPON & LOYALTY DETAILS MODAL ───────────────── */}
      {isViewModalOpen && viewingCoupon && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Coupon: {viewingCoupon.code}
              </h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Discount</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 14 }}>
                  {viewingCoupon.discountType === 'PERCENTAGE' ? `${viewingCoupon.discountAmount}%` : `$${viewingCoupon.discountAmount}`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Valid Category</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>
                  {viewingCoupon.validCategory || 'All Categories'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Duration</span>
                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13 }}>
                  {formatDateRange(viewingCoupon.startDate, viewingCoupon.endDate)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Customer Loyalty Points</span>
                <span style={{ fontWeight: 700, color: '#b45309', fontSize: 13 }}>
                  {viewingCoupon.pointsCost ? `⭐ ${viewingCoupon.pointsCost} Points Required` : 'Free / No points required'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Points Awarded on Use</span>
                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>
                  +{viewingCoupon.pointsReward || 0} pts
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Status</span>
                <span style={{ fontWeight: 700, color: viewingCoupon.status === 'ACTIVE' ? '#16a34a' : '#dc2626', fontSize: 13 }}>
                  {viewingCoupon.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  background: 'var(--brand)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT COUPON MODAL ───────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Code */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SEAFOOD10, PIZZA20"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Valid Category */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Valid Category
                </label>
                <input
                  type="text"
                  value={validCategory}
                  onChange={(e) => setValidCategory(e.target.value)}
                  placeholder="e.g. Sea Foods, Pizza Orders, All Categories"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Discount Type & Amount (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Discount Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder={discountType === 'PERCENTAGE' ? '10' : '15.00'}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Dates (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* ── CUSTOMER LOYALTY POINTS INTEGRATION ── */}
              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: requiresLoyaltyPoints ? 12 : 0 }}>
                  <input
                    type="checkbox"
                    checked={requiresLoyaltyPoints}
                    onChange={(e) => setRequiresLoyaltyPoints(e.target.checked)}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                    ⭐ Redeemable with Customer Loyalty Points
                  </span>
                </label>

                {requiresLoyaltyPoints && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#78350f', marginBottom: 4 }}>
                        Points Required to Unlock
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pointsCost}
                        onChange={(e) => setPointsCost(e.target.value)}
                        placeholder="100"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #fcd34d',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#78350f', marginBottom: 4 }}>
                        Bonus Points on Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pointsReward}
                        onChange={(e) => setPointsReward(e.target.value)}
                        placeholder="20"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #fcd34d',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--color-bg-input)',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    background: 'var(--brand)',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
