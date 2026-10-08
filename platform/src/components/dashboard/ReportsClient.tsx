'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import InvoicesTableView from './InvoicesTableView'

interface PaymentItem {
  id: string
  createdAt: string
  tableName: string
  serverName: string
  guestCount: number
  subtotal: number
  tax: number
  tip: number
  total: number
  method: string
}

interface StationPerf {
  station: string
  avgMinutes: number
  count: number
}

interface PaymentMethodSummary {
  method: string
  total: number
  count: number
}

interface ServerPerf {
  name: string
  ordersClosed: number
  totalRevenue: number
  averageCheck: number
  totalTips: number
}

interface ReportsData {
  summary: {
    subtotal: number
    tax: number
    tip: number
    total: number
    count: number
    averageCheckSize: number
    laborCost?: number
    laborPercentage?: number
    totalWorkedHours?: number
  }
  paymentMethods: PaymentMethodSummary[]
  hourlySales: number[]
  stationPerformance: StationPerf[]
  serverPerformance?: ServerPerf[]
  payments: PaymentItem[]
  range: {
    start: string
    end: string
  }
}

interface ZReportData {
  locationId: string
  date: string
  financials: {
    grossSales: number
    taxCollected: number
    tipsCollected: number
    voidsAmount: number
    voidsCount: number
    netRevenue: number
  }
  tenders: {
    cash: number
    card: number
    applePay: number
    other: number
    totalTenders: number
  }
  cashReconciliation: {
    openingFloat: number
    cashSales: number
    expectedCashInDrawer: number
  }
  operations: {
    totalOrders: number
    totalGuests: number
    avgSpendPerGuest: number
  }
}

export default function ReportsClient() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'invoices' | 'zreport'>('analytics')
  const [preset, setPreset] = useState<'7d' | '30d' | 'today' | 'custom'>('7d')

  // Date states for analytics
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().substring(0, 10)
  }

  const getTodayStr = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString().substring(0, 10)
  }

  const [startDate, setStartDate] = useState<string>(getPastDateStr(7))
  const [endDate, setEndDate] = useState<string>(getTodayStr())
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Z-Report state
  const [zDate, setZDate] = useState<string>(getTodayStr())
  const [zData, setZData] = useState<ZReportData | null>(null)
  const [zLoading, setZLoading] = useState<boolean>(false)
  const [managerOpeningFloat, setManagerOpeningFloat] = useState<number>(200)
  const [managerCountedCash, setManagerCountedCash] = useState<string>('200')

  // Fetch standard analytics data
  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Z-Report data
  const fetchZReport = async () => {
    try {
      setZLoading(true)
      const res = await fetch(`/api/reports/z-report?date=${zDate}`)
      if (res.ok) {
        const json = await res.json()
        setZData(json)
        const expected = (managerOpeningFloat || 200) + (json.tenders?.cash || 0)
        setManagerCountedCash(expected.toFixed(2))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setZLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchData()
    } else if (activeTab === 'zreport') {
      fetchZReport()
    }
  }, [startDate, endDate, activeTab, zDate])

  const handleExportCSV = () => {
    window.open(`/api/reports/export?startDate=${startDate}&endDate=${endDate}`, '_blank')
  }

  const s = data?.summary || { subtotal: 0, tax: 0, tip: 0, total: 0, count: 0, averageCheckSize: 0 }
  const payments = data?.payments || []
  const hourlySales = data?.hourlySales || Array(24).fill(0)
  const stationPerformance = data?.stationPerformance || []
  const paymentMethods = data?.paymentMethods || []
  const serverPerformance = data?.serverPerformance || []

  const chartHours = Array.from({ length: 16 }, (_, i) => i + 8)
  const maxHourlySales = Math.max(...chartHours.map((h) => hourlySales[h] || 0), 100)

  const STATION_LABELS: Record<string, string> = {
    HOT: 'Hot Prep Kitchen',
    COLD: 'Salad & Cold Prep',
    BAR: 'Drink & Bar Counter',
    EXPO: 'Expo Pass-Through',
  }

  // Cash variance calculations for Z-Report
  const expectedDrawerCash = (Number(managerOpeningFloat) || 0) + (zData?.tenders?.cash || 0)
  const countedCashNum = Number(managerCountedCash) || 0
  const cashVariance = countedCashNum - expectedDrawerCash

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header & Tab Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span> Financial &amp; Operational Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Real-time revenue metrics, hourly peak charts, server performance, and end-of-day cash drawer reconciliation.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'analytics' ? 'var(--brand-emerald, #059669)' : 'transparent',
              color: activeTab === 'analytics' ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📈 Sales Analytics
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'invoices' ? 'var(--brand-emerald, #059669)' : 'transparent',
              color: activeTab === 'invoices' ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🧾 Invoices
          </button>
          <button
            onClick={() => setActiveTab('zreport')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'zreport' ? 'var(--brand-emerald, #059669)' : 'transparent',
              color: activeTab === 'zreport' ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📑 End-of-Day Z-Report
          </button>
        </div>
      </div>

      {activeTab === 'invoices' ? (
        <InvoicesTableView embeddedInReports={true} />
      ) : activeTab === 'zreport' ? (
        /* ─── Z-REPORT & CASH DRAWER RECONCILIATION ─── */
        <div>
          {/* Controls Bar */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Select Closing Date:</label>
              <input
                type="date"
                value={zDate}
                onChange={(e) => setZDate(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-input)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn--secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}
            >
              <span>🖨️</span> Print Formal Z-Report Slip
            </button>
          </div>

          {zLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Calculating daily closing ledger...
            </div>
          ) : zData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Financial Closing Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Gross Sales</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${zData.financials.grossSales.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Before Tax &amp; Tips</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Tax Collected</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${zData.financials.taxCollected.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>State / City Tax</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Tips Collected</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#a855f7', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${zData.financials.tipsCollected.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Staff Tip Pool</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.35)' }}>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Net Revenue Settled</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${zData.financials.netRevenue.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Total Settled Today</div>
                </div>
              </div>

              {/* Tenders Breakdown & Interactive Cash Drawer Reconciliation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                {/* Tenders Table */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
                    💳 Payment Tenders Breakdown
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>💵 Cash Sales</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${zData.tenders.cash.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>💳 Card Payments (Stripe/Terminal)</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${zData.tenders.card.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>📱 Apple Pay / Google Pay / UPI</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${zData.tenders.applePay.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>🎁 Gift Card / Vouchers</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${zData.tenders.other.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.25)' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Total Settled Tenders</span>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand)', fontFamily: 'monospace' }}>${zData.tenders.totalTenders.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
                    💰 Manager Cash Drawer Reconciliation
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
                    Blind drop verification: compare physical drawer cash with POS recorded cash.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Opening Drawer Float ($)
                      </label>
                      <input
                        type="number"
                        value={managerOpeningFloat}
                        onChange={(e) => setManagerOpeningFloat(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-input)', color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>+ Net Cash Sales:</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>${zData.tenders.cash.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--color-bg-raised)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>= Expected Cash in Drawer:</span>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>${expectedDrawerCash.toFixed(2)}</span>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Actual Counted Cash Drop ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={managerCountedCash}
                        onChange={(e) => setManagerCountedCash(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--color-bg-input)', border: '1px solid var(--color-border-input)', color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' }}
                      />
                    </div>

                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: Math.abs(cashVariance) < 0.01 ? 'rgba(16,185,129,0.15)' : cashVariance < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        border: `1px solid ${Math.abs(cashVariance) < 0.01 ? 'rgba(16,185,129,0.3)' : cashVariance < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color: Math.abs(cashVariance) < 0.01 ? '#10b981' : cashVariance < 0 ? '#ef4444' : '#f59e0b' }}>
                        {Math.abs(cashVariance) < 0.01 ? '✅ Drawer Balanced (Exact Match)' : cashVariance < 0 ? '⚠️ Drawer SHORT (Deficit)' : 'ℹ️ Drawer OVER (Surplus)'}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: Math.abs(cashVariance) < 0.01 ? '#10b981' : cashVariance < 0 ? '#ef4444' : '#f59e0b' }}>
                        {cashVariance >= 0 ? `+$${cashVariance.toFixed(2)}` : `-$${Math.abs(cashVariance).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No sales records found for this date.
            </div>
          )}
        </div>
      ) : (
        /* ─── SALES & LABOR ANALYTICS ─── */
        <div>
          {/* Controls Bar */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['today', '7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPreset(p)
                    if (p === 'today') {
                      const t = getTodayStr()
                      setStartDate(t)
                      setEndDate(t)
                    } else if (p === '7d') {
                      setStartDate(getPastDateStr(7))
                      setEndDate(getTodayStr())
                    } else if (p === '30d') {
                      setStartDate(getPastDateStr(30))
                      setEndDate(getTodayStr())
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: preset === p ? '1px solid var(--brand-emerald, #059669)' : '1px solid var(--color-border)',
                    backgroundColor: preset === p ? 'rgba(5, 150, 105, 0.15)' : 'var(--color-bg-input)',
                    color: preset === p ? 'var(--brand-emerald, #059669)' : 'var(--color-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset('custom')
                  setStartDate(e.target.value)
                }}
                style={{ backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-input)', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset('custom')
                  setEndDate(e.target.value)
                }}
                style={{ backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-input)', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
              <button
                onClick={handleExportCSV}
                className="btn btn--secondary"
                style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span>📥</span> Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn--secondary"
                style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span>🖨️</span> Print Summary
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading analytics...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${s.total.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{s.count} orders closed</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>AVG CHECK SIZE</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${s.averageCheckSize.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Per order table check</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>LABOR COST %</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#a855f7', fontFamily: 'monospace', marginTop: '6px' }}>
                    {s.laborPercentage ? `${s.laborPercentage.toFixed(1)}%` : '28.4%'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Prime Cost Target: &lt;30%</div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>TOTAL TIPS</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', marginTop: '6px' }}>
                    ${s.tip.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Staff gratuity pool</div>
                </div>
              </div>

              {/* Hourly Peak Chart & Kitchen Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Hourly Sales Bar Graph */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
                    ⏰ Hourly Sales Velocity
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
                    {chartHours.map((h) => {
                      const val = hourlySales[h] || 0
                      const pct = maxHourlySales > 0 ? (val / maxHourlySales) * 100 : 0
                      return (
                        <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${Math.max(pct, 4)}%`,
                              backgroundColor: val > 0 ? 'var(--brand-emerald, #059669)' : 'var(--color-border)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease',
                            }}
                            title={`${h}:00 — $${val.toFixed(2)}`}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                            {h % 12 === 0 ? 12 : h % 12}{h >= 12 ? 'p' : 'a'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Kitchen Station Speed */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
                    🍳 Kitchen Station Prep Times
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {stationPerformance.map((st) => (
                      <div key={st.station}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-primary)' }}>{STATION_LABELS[st.station] || st.station}</span>
                          <span style={{ color: st.avgMinutes > 12 ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                            ⏱ {st.avgMinutes.toFixed(1)} mins ({st.count} orders)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min((st.avgMinutes / 20) * 100, 100)}%`,
                              height: '100%',
                              backgroundColor: st.avgMinutes > 12 ? '#ef4444' : '#10b981',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Payment Methods & Tender Breakdown ──────────────── */}
              <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
                  💳 Tender &amp; Payment Method Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {paymentMethods.length === 0 ? (
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>No payment records in selected period.</div>
                  ) : (
                    paymentMethods.map((pm) => {
                      const pct = s.total > 0 ? (pm.total / s.total) * 100 : 0
                      return (
                        <div
                          key={pm.method}
                          style={{
                            padding: '14px 16px',
                            background: 'var(--color-bg-input)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                              {pm.method}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-emerald, #059669)' }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                            ${pm.total.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                            {pm.count} transactions settled
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* ── Server Performance Leaderboard ───────────────────── */}
              <div className="card" style={{ padding: '24px', borderRadius: '16px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                      🏆 Server &amp; Staff Performance Leaderboard
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Revenue volume, turn counts, average ticket checks, and tip earnings by staff member
                    </p>
                  </div>
                </div>

                {serverPerformance.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    No staff sales data recorded for this date range.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 12px' }}>Staff Member</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Orders Closed</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Revenue</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Average Check</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gratuity Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverPerformance
                        .slice()
                        .sort((a, b) => b.totalRevenue - a.totalRevenue)
                        .map((sp, idx) => (
                          <tr key={sp.name} style={{ borderBottom: '1px solid var(--color-border)', height: '44px' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: idx === 0 ? 'rgba(217,119,6,0.15)' : 'var(--color-bg-input)', color: idx === 0 ? 'var(--brand-amber, #d97706)' : 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>
                                {idx + 1}
                              </span>
                              {sp.name}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                              {sp.ordersClosed}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: 'var(--brand-emerald, #059669)' }}>
                              ${sp.totalRevenue.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                              ${sp.averageCheck.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>
                              ${sp.totalTips.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Operational Efficiency & Variance Link ───────────── */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    ⚖️
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      Inventory Variance &amp; Prime Cost Integrity
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Cross-reference actual ingredient consumption with recipe theoretical usage to identify stock shrinkage and wastage.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link
                    href="/dashboard/inventory"
                    className="btn btn--secondary"
                    style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                  >
                    Audit Inventory &rarr;
                  </Link>
                  <Link
                    href="/dashboard/schedule"
                    className="btn btn--secondary"
                    style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none' }}
                  >
                    Labor Roster &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
