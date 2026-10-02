'use client'

import React, { useState, useEffect, useCallback } from 'react'

/* ── Types ────────────────────────────────────────────────── */
export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
  specialNote?: string | null
}

export interface Invoice {
  id: string
  orderId: string
  invoiceId: string
  customer: {
    name: string
    phone: string | null
    email: string | null
    avatarColor: string
    initials: string
  }
  date: string
  rawDate: string
  orderType: 'Dine In' | 'Take Away' | 'Delivery'
  amount: number
  subtotal: number
  tax: number
  tip: number
  paymentMethod: string
  status: 'Paid' | 'Voided' | 'Refunded'
  tableName: string
  floor: string
  serverName: string
  items: InvoiceItem[]
}

interface InvoicesTableViewProps {
  embeddedInReports?: boolean
}

export default function InvoicesTableView({ embeddedInReports = false }: InvoicesTableViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Invoice Details / Print Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (orderTypeFilter !== 'All') params.set('orderType', orderTypeFilter)
      if (statusFilter !== 'All') params.set('status', statusFilter)
      if (sortBy) params.set('sortBy', sortBy)

      const res = await fetch(`/api/invoices?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
      showToast('Error loading invoices')
    } finally {
      setLoading(false)
    }
  }, [search, orderTypeFilter, statusFilter, sortBy])

  useEffect(() => {
    fetchInvoices()

    // Real-time SSE / event listener for dynamic billing updates
    const es = new EventSource('/api/events')
    const handleSync = () => {
      fetchInvoices()
    }

    es.addEventListener('payment.completed', handleSync)
    es.addEventListener('order.paid', handleSync)
    es.addEventListener('order.status.changed', handleSync)

    // Polling backup every 15s to keep billing in sync
    const interval = setInterval(fetchInvoices, 15000)

    return () => {
      es.close()
      clearInterval(interval)
    }
  }, [fetchInvoices])

  // Export to CSV
  const handleExport = () => {
    if (invoices.length === 0) {
      showToast('No invoices to export')
      return
    }

    const headers = ['Invoice ID', 'Customer', 'Date', 'Order Type', 'Amount ($)', 'Status', 'Payment Method', 'Table']
    const rows = invoices.map((inv) => [
      inv.invoiceId,
      `"${inv.customer.name}"`,
      `"${inv.date}"`,
      inv.orderType,
      inv.amount.toFixed(2),
      inv.status,
      inv.paymentMethod,
      `"${inv.tableName}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `invoices_${new Date().toISOString().substring(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Invoices exported successfully')
  }

  // Void Invoice
  const handleVoidInvoice = async (inv: Invoice) => {
    if (!confirm(`Are you sure you want to void invoice ${inv.invoiceId}?`)) return
    try {
      const res = await fetch(`/api/payments/${inv.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Voided by restaurant manager from invoices dashboard' }),
      })

      if (res.ok) {
        showToast(`Invoice ${inv.invoiceId} voided`)
        fetchInvoices()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to void invoice')
      }
    } catch {
      showToast('Error voiding invoice')
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: embeddedInReports ? 16 : 16,
        padding: '24px 28px',
        boxShadow: embeddedInReports ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        fontFamily: 'inherit',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            zIndex: 99999,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── Top Header Row ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Title & Reload Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Invoices
          </h2>
          <button
            onClick={fetchInvoices}
            title="Refresh Invoices (Sync from POS Billing)"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#5b45f5')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc'
            e.currentTarget.style.borderColor = '#94a3b8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.borderColor = '#cbd5e1'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* ── Toolbar: Search & Filters ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: 13,
              color: '#1e293b',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#5b45f5'
              e.currentTarget.style.backgroundColor = '#ffffff'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.backgroundColor = '#f8fafc'
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Right Tools: Filter button, Layout toggle, Sort by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          {/* Filter button */}
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: orderTypeFilter !== 'All' ? '#eff6ff' : '#ffffff',
              border: orderTypeFilter !== 'All' ? '1px solid #5b45f5' : '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: orderTypeFilter !== 'All' ? '#5b45f5' : '#475569',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
            {orderTypeFilter !== 'All' && <span style={{ fontSize: 11, background: '#5b45f5', color: '#fff', padding: '1px 5px', borderRadius: 99 }}>1</span>}
          </button>

          {/* Filter Dropdown Popover */}
          {showFilterDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 42,
                left: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                padding: 14,
                zIndex: 100,
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
                Order Type
              </div>
              {['All', 'Dine In', 'Take Away', 'Delivery'].map((type) => (
                <div
                  key={type}
                  onClick={() => {
                    setOrderTypeFilter(type)
                    setShowFilterDropdown(false)
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: orderTypeFilter === type ? 700 : 500,
                    backgroundColor: orderTypeFilter === type ? '#eff6ff' : 'transparent',
                    color: orderTypeFilter === type ? '#5b45f5' : '#334155',
                  }}
                >
                  {type}
                </div>
              ))}
            </div>
          )}

          {/* Layout Columns Button */}
          <button
            title="Table view"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Sort by : Newest</option>
              <option value="oldest">Sort by : Oldest</option>
              <option value="highest">Sort by : Highest Amount</option>
              <option value="lowest">Sort by : Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Invoices Data Table ───────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 10px auto' }} />
            Loading billing invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>No invoices found</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Completed POS bills and table orders will dynamically appear here.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Invoice ID</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Order Type</th>
                <th style={{ padding: '12px 16px' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13, color: '#0f172a' }}>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Invoice ID */}
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                    {inv.invoiceId}
                  </td>

                  {/* Customer (Avatar + Name) */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: inv.customer.avatarColor,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {inv.customer.initials}
                      </div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {inv.customer.name}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {inv.date}
                  </td>

                  {/* Order Type */}
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 500 }}>
                    {inv.orderType}
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                    ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor:
                          inv.status === 'Paid'
                            ? '#dcfce7'
                            : inv.status === 'Voided'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          inv.status === 'Paid'
                            ? '#16a34a'
                            : inv.status === 'Voided'
                            ? '#dc2626'
                            : '#d97706',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {/* Download / Print PDF */}
                      <button
                        onClick={() => {
                          setViewInvoice(inv)
                          setIsPrintMode(true)
                        }}
                        title="Download / Print Receipt"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
                          e.currentTarget.style.color = '#5b45f5'
                          e.currentTarget.style.borderColor = '#bfdbfe'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff'
                          e.currentTarget.style.color = '#64748b'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>

                      {/* View details eye */}
                      <button
                        onClick={() => {
                          setViewInvoice(inv)
                          setIsPrintMode(false)
                        }}
                        title="View Invoice Details"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
                          e.currentTarget.style.color = '#5b45f5'
                          e.currentTarget.style.borderColor = '#bfdbfe'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff'
                          e.currentTarget.style.color = '#64748b'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      {/* Delete / Void Trash */}
                      <button
                        onClick={() => handleVoidInvoice(inv)}
                        title="Void Invoice"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2'
                          e.currentTarget.style.color = '#dc2626'
                          e.currentTarget.style.borderColor = '#fecdd3'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff'
                          e.currentTarget.style.color = '#94a3b8'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Invoice Details & Printable Receipt Modal ─────── */}
      {viewInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          onClick={() => setViewInvoice(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {isPrintMode ? 'Print Tax Invoice' : 'Invoice Details'}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {viewInvoice.invoiceId} · {viewInvoice.date}
                </span>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Bill Summary Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                marginBottom: 16,
                fontSize: 12,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div><strong>Customer:</strong> {viewInvoice.customer.name}</div>
              <div><strong>Order Type:</strong> {viewInvoice.orderType}</div>
              <div><strong>Table:</strong> {viewInvoice.tableName} ({viewInvoice.floor})</div>
              <div><strong>Server:</strong> {viewInvoice.serverName}</div>
              <div><strong>Payment:</strong> {viewInvoice.paymentMethod}</div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ color: '#16a34a', fontWeight: 700 }}>{viewInvoice.status}</span>
              </div>
            </div>

            {/* Line Items */}
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: '#475569' }}>
              Order Items
            </h4>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                        Dining Check Total: ${viewInvoice.amount.toFixed(2)}
                      </td>
                    </tr>
                  ) : (
                    viewInvoice.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotals & Final Total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>${viewInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Tax:</span>
                <span>${viewInvoice.tax.toFixed(2)}</span>
              </div>
              {viewInvoice.tip > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Tip:</span>
                  <span>${viewInvoice.tip.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: 16,
                  color: '#0f172a',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <span>Total Amount Paid:</span>
                <span style={{ color: '#16a34a' }}>${viewInvoice.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setViewInvoice(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                }}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#5b45f5',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                🖨️ Print Invoice Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
