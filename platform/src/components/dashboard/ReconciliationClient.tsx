'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './reconciliation.module.css'
import { useToast, ToastContainer } from '../ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string
  name: string
  slug: string
  isActive: boolean
}

interface Statement {
  id: string
  provider: { name: string; slug: string }
  lineCount: number
}

interface Period {
  id: string
  name: string
  periodStart: string
  periodEnd: string
  status: 'OPEN' | 'REVIEWING' | 'LOCKED' | 'EXPORTED'
  totalGross: number
  totalCommission: number
  totalTax: number
  totalRefunds: number
  totalNet: number
  matchedCount: number
  unmatchedCount: number
  exceptionCount: number
  lockedAt?: string
  exportedAt?: string
  statements: { statement: Statement }[]
}

interface ReconException {
  id: string
  periodId: string
  lineId?: string
  type: 'UNMATCHED_ORDER' | 'AMOUNT_DIFF' | 'MISSING_PAYOUT' | 'DUPLICATE_IMPORT'
  description: string
  amount?: number
  isResolved: boolean
  resolvedAt?: string
  resolutionNote?: string
  createdAt: string
}

interface ReconciliationClientProps {
  initialPeriods: Period[]
  providers: Provider[]
  locationId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const STATUS_LABELS: Record<string, string> = {
  OPEN: '⬜ Open',
  REVIEWING: '🔍 Reviewing',
  LOCKED: '🔒 Locked',
  EXPORTED: '✅ Exported',
}

const STATUS_CSS: Record<string, string> = {
  OPEN: styles.statusOpen,
  REVIEWING: styles.statusReviewing,
  LOCKED: styles.statusLocked,
  EXPORTED: styles.statusExported,
}

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  UNMATCHED_ORDER: '🔴 Unmatched',
  AMOUNT_DIFF: '🟡 Amount Diff',
  MISSING_PAYOUT: '🟣 Missing Payout',
  DUPLICATE_IMPORT: '⚫ Duplicate',
}

const EXCEPTION_TYPE_CSS: Record<string, string> = {
  UNMATCHED_ORDER: styles.typeUnmatched,
  AMOUNT_DIFF: styles.typeAmountDiff,
  MISSING_PAYOUT: styles.typeMissing,
  DUPLICATE_IMPORT: styles.typeDuplicate,
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'periods' | 'exceptions' | 'profitability' | 'import'

export default function ReconciliationClient({ initialPeriods, providers: initialProviders, locationId }: ReconciliationClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('periods')
  const [periods, setPeriods] = useState<Period[]>(initialPeriods)
  const [providers, setProviders] = useState<Provider[]>(initialProviders)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  // ── Exceptions tab ──
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [exceptions, setExceptions] = useState<ReconException[]>([])
  const [exceptionsLoading, setExceptionsLoading] = useState(false)
  const [resolveModal, setResolveModal] = useState<ReconException | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  // ── Import tab ──
  const [importProviderId, setImportProviderId] = useState('')
  const [importPeriodStart, setImportPeriodStart] = useState('')
  const [importPeriodEnd, setImportPeriodEnd] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Create Period modal ──
  const [showCreatePeriod, setShowCreatePeriod] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [newPeriodStart, setNewPeriodStart] = useState('')
  const [newPeriodEnd, setNewPeriodEnd] = useState('')
  const [newPeriodNotes, setNewPeriodNotes] = useState('')
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([])
  const [allStatements, setAllStatements] = useState<(Statement & { id: string })[]>([])

  // ── Add Provider ──
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProviderName, setNewProviderName] = useState('')
  const [newProviderSlug, setNewProviderSlug] = useState('')

  // ── Load periods ──
  const loadPeriods = useCallback(async () => {
    const r = await fetch(`/api/reconciliation/periods?locationId=${locationId}`)
    if (r.ok) setPeriods(await r.json())
  }, [locationId])

  // ── Load exceptions for selected period ──
  const loadExceptions = useCallback(async (periodId: string) => {
    if (!periodId) return
    setExceptionsLoading(true)
    try {
      const r = await fetch(`/api/reconciliation/exceptions?periodId=${periodId}`)
      if (r.ok) setExceptions(await r.json())
    } finally {
      setExceptionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'exceptions' && selectedPeriodId) {
      loadExceptions(selectedPeriodId)
    }
  }, [activeTab, selectedPeriodId, loadExceptions])

  // ── Load statements for period creation ──
  useEffect(() => {
    if (showCreatePeriod) {
      // Gather all statements from loaded periods
      const stmts: (Statement & { id: string })[] = []
      periods.forEach((p) =>
        p.statements.forEach((ps) => {
          if (!stmts.find((s) => s.id === ps.statement.id)) {
            stmts.push({ ...ps.statement, id: ps.statement.id })
          }
        })
      )
      setAllStatements(stmts)
    }
  }, [showCreatePeriod, periods])

  // ── Action: Match period ──
  const matchPeriod = async (periodId: string) => {
    setActionLoading(`match-${periodId}`)
    try {
      const r = await fetch(`/api/reconciliation/periods/${periodId}/match`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      showToast(`Matched ${j.matched} orders, ${j.unmatched} unmatched, ${j.exceptions} exceptions`, 'success')
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Action: Lock period ──
  const lockPeriod = async (period: Period) => {
    if (period.unmatchedCount > 0) {
      showToast(`Cannot lock: ${period.unmatchedCount} unmatched orders remain. Resolve exceptions first.`, 'error')
      return
    }
    if (!confirm(`Lock period "${period.name}"? This cannot be undone.`)) return
    setActionLoading(`lock-${period.id}`)
    try {
      const r = await fetch(`/api/reconciliation/periods/${period.id}/lock`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      showToast('Period locked successfully', 'success')
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Action: Export CSV ──
  const exportPeriod = async (period: Period) => {
    setActionLoading(`export-${period.id}`)
    try {
      const r = await fetch(`/api/reconciliation/periods/${period.id}/export`)
      if (!r.ok) {
        const j = await r.json()
        throw new Error(j.error)
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconciliation-${period.name.replace(/\s+/g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV exported successfully', 'success')
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Action: Resolve exception ──
  const resolveException = async () => {
    if (!resolveModal) return
    setActionLoading(`resolve-${resolveModal.id}`)
    try {
      const r = await fetch(`/api/reconciliation/exceptions/${resolveModal.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      showToast('Exception resolved', 'success')
      setResolveModal(null)
      setResolutionNote('')
      await loadExceptions(selectedPeriodId)
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Action: Import CSV ──
  const handleImport = async () => {
    if (!importFile || !importProviderId || !importPeriodStart || !importPeriodEnd) {
      showToast('Please fill all fields and select a CSV file', 'error')
      return
    }
    setImportLoading(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      fd.append('providerId', importProviderId)
      fd.append('locationId', locationId)
      fd.append('periodStart', importPeriodStart)
      fd.append('periodEnd', importPeriodEnd)

      const r = await fetch('/api/reconciliation/import', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setImportResult(j)
      showToast(j.isDuplicate ? 'Duplicate statement — already imported' : `Imported ${j.lineCount} rows`, j.isDuplicate ? 'info' : 'success')
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setImportLoading(false)
    }
  }

  // ── Action: Create period ──
  const createPeriod = async () => {
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
      showToast('Name, start date, and end date are required', 'error')
      return
    }
    setActionLoading('create-period')
    try {
      const r = await fetch('/api/reconciliation/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          name: newPeriodName,
          periodStart: newPeriodStart,
          periodEnd: newPeriodEnd,
          notes: newPeriodNotes,
          statementIds: selectedStatementIds,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      showToast('Reconciliation period created', 'success')
      setShowCreatePeriod(false)
      setNewPeriodName(''); setNewPeriodStart(''); setNewPeriodEnd(''); setNewPeriodNotes(''); setSelectedStatementIds([])
      await loadPeriods()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Action: Add provider ──
  const addProvider = async () => {
    if (!newProviderName || !newProviderSlug) {
      showToast('Name and slug are required', 'error')
      return
    }
    setActionLoading('add-provider')
    try {
      const r = await fetch('/api/reconciliation/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, name: newProviderName, slug: newProviderSlug }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setProviders((prev) => [...prev.filter((p) => p.id !== j.id), j])
      showToast('Provider added', 'success')
      setShowAddProvider(false)
      setNewProviderName(''); setNewProviderSlug('')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Aggregated KPIs ──
  const totalGross = periods.reduce((s, p) => s + p.totalGross, 0)
  const totalNet = periods.reduce((s, p) => s + p.totalNet, 0)
  const totalCommission = periods.reduce((s, p) => s + p.totalCommission, 0)
  const openExceptions = periods.reduce((s, p) => s + p.exceptionCount, 0)
  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'REVIEWING').length

  // ── Profitability: group by provider across all periods ──
  const providerStats: Record<string, { name: string; gross: number; commission: number; net: number }> = {}
  periods.forEach((p) => {
    p.statements.forEach((ps) => {
      const key = ps.statement.provider.slug
      if (!providerStats[key]) {
        providerStats[key] = { name: ps.statement.provider.name, gross: 0, commission: 0, net: 0 }
      }
      // We don't have per-statement totals in the list view, use period-level as approximation
    })
  })
  // Use period-level totals as best available data for profitability
  const profitData = Object.values(providerStats)
  const maxGross = Math.max(...profitData.map((d) => d.gross), 1)

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className={styles.page}>
        {/* Header */}
        <div className={styles.topActions}>
          <button className={styles.secondaryBtn} onClick={() => setShowAddProvider(true)}>
            ⚙️ Manage Providers
          </button>
          <button className={styles.primaryBtn} onClick={() => setShowCreatePeriod(true)}>
            + New Period
          </button>
        </div>

        {/* KPI Strip */}
        <div className={styles.statsGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>💰</div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Total Gross</span>
              <span className={styles.kpiValue}>{money(totalGross)}</span>
              <span className={styles.kpiSubtext}>All periods</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>📤</div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Expected Net</span>
              <span className={styles.kpiValue}>{money(totalNet)}</span>
              <span className={styles.kpiSubtext}>After commission & fees</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>🏦</div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Platform Fees</span>
              <span className={styles.kpiValue}>{money(totalCommission)}</span>
              <span className={styles.kpiSubtext}>Commission charged</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>⚠️</div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Open Exceptions</span>
              <span className={styles.kpiValue}>{openExceptions}</span>
              <span className={styles.kpiSubtext}>{openPeriods} period{openPeriods !== 1 ? 's' : ''} active</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['periods', 'exceptions', 'profitability', 'import'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'periods' && '📋'}
              {t === 'exceptions' && '⚠️'}
              {t === 'profitability' && '📊'}
              {t === 'import' && '📥'}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'exceptions' && openExceptions > 0 && (
                <span className={styles.tabBadge}>{openExceptions}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Periods ── */}
        {activeTab === 'periods' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Reconciliation Periods</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {periods.length} period{periods.length !== 1 ? 's' : ''}
              </span>
            </div>
            {periods.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📋</span>
                <p className={styles.emptyTitle}>No reconciliation periods yet</p>
                <p className={styles.emptySubtext}>Import a statement and create a period to get started.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Providers</th>
                      <th>Status</th>
                      <th>Gross</th>
                      <th>Commission</th>
                      <th>Net Payout</th>
                      <th>Matched</th>
                      <th>Exceptions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</div>
                          <div className={styles.mono}>
                            {fmtShort(p.periodStart)} – {fmtShort(p.periodEnd)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {p.statements.map((ps, i) => (
                              <span key={i} style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--color-bg-raised)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                              }}>
                                {ps.statement.provider.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${STATUS_CSS[p.status] || styles.statusOpen}`}>
                            {STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        <td className={styles.amountNeutral}>{money(p.totalGross)}</td>
                        <td className={styles.amountNegative}>-{money(p.totalCommission)}</td>
                        <td className={styles.amountPositive}>{money(p.totalNet)}</td>
                        <td>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{p.matchedCount}</span>
                          {p.unmatchedCount > 0 && (
                            <span style={{ color: '#ef4444', marginLeft: 4, fontSize: 'var(--text-xs)' }}>
                              ({p.unmatchedCount} unmatched)
                            </span>
                          )}
                        </td>
                        <td>
                          {p.exceptionCount > 0 ? (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ {p.exceptionCount}</span>
                          ) : (
                            <span style={{ color: '#30D158', fontWeight: 600 }}>✓ None</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionRow}>
                            {p.status !== 'LOCKED' && p.status !== 'EXPORTED' && (
                              <button
                                className={styles.secondaryBtn}
                                disabled={actionLoading === `match-${p.id}`}
                                onClick={() => matchPeriod(p.id)}
                                title="Run order matching"
                              >
                                {actionLoading === `match-${p.id}` ? '...' : '🔗 Match'}
                              </button>
                            )}
                            {(p.status === 'REVIEWING' || p.status === 'OPEN') && (
                              <button
                                className={styles.secondaryBtn}
                                disabled={actionLoading === `lock-${p.id}` || p.unmatchedCount > 0}
                                onClick={() => lockPeriod(p)}
                                title={p.unmatchedCount > 0 ? 'Resolve exceptions first' : 'Lock this period'}
                              >
                                {actionLoading === `lock-${p.id}` ? '...' : '🔒 Lock'}
                              </button>
                            )}
                            <button
                              className={styles.secondaryBtn}
                              disabled={actionLoading === `export-${p.id}`}
                              onClick={() => exportPeriod(p)}
                              title="Export to CSV"
                            >
                              {actionLoading === `export-${p.id}` ? '...' : '⬇️ Export'}
                            </button>
                            <button
                              className={styles.secondaryBtn}
                              onClick={() => { setSelectedPeriodId(p.id); setActiveTab('exceptions') }}
                              title="View exceptions"
                            >
                              ⚠️ Exceptions
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Exceptions ── */}
        {activeTab === 'exceptions' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Exception Queue</h3>
              <select
                className={styles.formSelect}
                style={{ width: 'auto', minWidth: 220 }}
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
              >
                <option value="">— Select a period —</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.exceptionCount > 0 ? `(${p.exceptionCount} open)` : ''}
                  </option>
                ))}
              </select>
            </div>
            {!selectedPeriodId ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>⚠️</span>
                <p className={styles.emptyTitle}>Select a period to review exceptions</p>
              </div>
            ) : exceptionsLoading ? (
              <div className={styles.empty}><p className={styles.emptyTitle}>Loading exceptions…</p></div>
            ) : exceptions.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>✅</span>
                <p className={styles.emptyTitle}>No exceptions</p>
                <p className={styles.emptySubtext}>This period has no unresolved exceptions.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map((ex) => (
                      <tr key={ex.id} className={ex.isResolved ? styles.resolvedRow : undefined}>
                        <td>
                          <span className={`${styles.exceptionTypeBadge} ${EXCEPTION_TYPE_CSS[ex.type] || styles.typeMissing}`}>
                            {EXCEPTION_TYPE_LABELS[ex.type]}
                          </span>
                        </td>
                        <td style={{ maxWidth: 380, whiteSpace: 'normal', lineHeight: 1.4 }}>
                          {ex.description}
                          {ex.isResolved && ex.resolutionNote && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                              ✓ {ex.resolutionNote}
                            </div>
                          )}
                        </td>
                        <td>
                          {ex.amount != null ? (
                            <span className={styles.amountNegative}>-{money(ex.amount)}</span>
                          ) : '—'}
                        </td>
                        <td>
                          {ex.isResolved ? (
                            <span className={`${styles.statusBadge} ${styles.statusExported}`}>✅ Resolved</span>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.statusReviewing}`}>🔍 Open</span>
                          )}
                        </td>
                        <td className={styles.mono}>{fmtDate(ex.createdAt)}</td>
                        <td>
                          {!ex.isResolved && (
                            <button
                              className={styles.secondaryBtn}
                              onClick={() => { setResolveModal(ex); setResolutionNote('') }}
                              disabled={actionLoading === `resolve-${ex.id}`}
                            >
                              ✓ Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Profitability ── */}
        {activeTab === 'profitability' && (
          <div className={styles.profitSection}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Provider Profitability</h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>All periods combined</span>
              </div>
              {periods.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>📊</span>
                  <p className={styles.emptyTitle}>No data yet</p>
                  <p className={styles.emptySubtext}>Import statements and run matching to see profitability.</p>
                </div>
              ) : (
                <div style={{ padding: '20px 24px' }}>
                  <div className={styles.providerCards}>
                    {/* Aggregate per-period data into provider buckets */}
                    {(() => {
                      const byProvider: Record<string, { name: string; gross: number; commission: number; tax: number; net: number; orders: number }> = {}
                      periods.forEach((p) => {
                        p.statements.forEach((ps) => {
                          const key = ps.statement.provider.name
                          if (!byProvider[key]) byProvider[key] = { name: key, gross: 0, commission: 0, tax: 0, net: 0, orders: 0 }
                          // Use period totals divided by statement count as approximation
                          const factor = 1 / Math.max(p.statements.length, 1)
                          byProvider[key].gross += p.totalGross * factor
                          byProvider[key].commission += p.totalCommission * factor
                          byProvider[key].net += p.totalNet * factor
                          byProvider[key].orders += p.matchedCount * factor
                        })
                      })
                      const entries = Object.values(byProvider)
                      const maxGross = Math.max(...entries.map((e) => e.gross), 1)
                      return entries.map((prov) => (
                        <div key={prov.name} className={styles.providerCard}>
                          <div className={styles.providerCardHeader}>
                            <span className={styles.providerName}>
                              🚚 {prov.name}
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                              {Math.round(prov.orders)} orders
                            </span>
                          </div>
                          <div className={styles.barChart}>
                            <div className={styles.barRow}>
                              <span className={styles.barLabel}>Gross Sales</span>
                              <div className={styles.barTrack}>
                                <div className={`${styles.barFill} ${styles.barGross}`} style={{ width: `${(prov.gross / maxGross) * 100}%` }} />
                              </div>
                              <span className={styles.barValue}>{money(prov.gross)}</span>
                            </div>
                            <div className={styles.barRow}>
                              <span className={styles.barLabel}>Commission</span>
                              <div className={styles.barTrack}>
                                <div className={`${styles.barFill} ${styles.barCommission}`} style={{ width: `${(prov.commission / maxGross) * 100}%` }} />
                              </div>
                              <span className={styles.barValue} style={{ color: '#ef4444' }}>-{money(prov.commission)}</span>
                            </div>
                            <div className={styles.barRow}>
                              <span className={styles.barLabel}>Net Payout</span>
                              <div className={styles.barTrack}>
                                <div className={`${styles.barFill} ${styles.barNet}`} style={{ width: `${(prov.net / maxGross) * 100}%` }} />
                              </div>
                              <span className={styles.barValue} style={{ color: '#30D158' }}>{money(prov.net)}</span>
                            </div>
                          </div>
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-separator)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                            <span>Effective margin</span>
                            <span style={{ fontWeight: 700, color: prov.gross > 0 && prov.net / prov.gross > 0.7 ? '#30D158' : '#f59e0b' }}>
                              {prov.gross > 0 ? `${((prov.net / prov.gross) * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Summary Table */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      Period Summary
                    </h4>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Gross</th>
                            <th>Commission</th>
                            <th>Tax</th>
                            <th>Refunds</th>
                            <th>Net Payout</th>
                            <th>Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periods.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 700 }}>{p.name}</td>
                              <td>
                                <span className={`${styles.statusBadge} ${STATUS_CSS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                              </td>
                              <td>{money(p.totalGross)}</td>
                              <td className={styles.amountNegative}>-{money(p.totalCommission)}</td>
                              <td className={styles.amountNegative}>-{money(p.totalTax)}</td>
                              <td className={styles.amountNegative}>-{money(p.totalRefunds)}</td>
                              <td className={styles.amountPositive}>{money(p.totalNet)}</td>
                              <td>
                                <span style={{ fontWeight: 700, color: p.totalGross > 0 && p.totalNet / p.totalGross > 0.7 ? '#30D158' : '#f59e0b' }}>
                                  {p.totalGross > 0 ? `${((p.totalNet / p.totalGross) * 100).toFixed(1)}%` : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Import ── */}
        {activeTab === 'import' && (
          <div className={styles.importSection}>
            <div className={styles.importCard}>
              <h3 className={styles.importCardTitle}>Import Payout Statement</h3>

              {providers.length === 0 && (
                <div className={styles.errorBanner} style={{ marginBottom: 20 }}>
                  ⚠️ No providers configured. Click "Manage Providers" to add one first.
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Delivery Provider</label>
                  <select
                    className={styles.formSelect}
                    value={importProviderId}
                    onChange={(e) => setImportProviderId(e.target.value)}
                  >
                    <option value="">Select provider…</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Period Start</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={importPeriodStart}
                    onChange={(e) => setImportPeriodStart(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Period End</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={importPeriodEnd}
                    onChange={(e) => setImportPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Drop Zone */}
              <div
                className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setIsDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f) setImportFile(f)
                }}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className={styles.fileInput}
                  onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]) }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={styles.dropZoneIcon}>📄</span>
                <p className={styles.dropZoneTitle}>Drag & drop your payout CSV here</p>
                <p className={styles.dropZoneSubtext}>Supports UrbanPiper, Swiggy, Zomato, and generic CSV formats</p>
                {importFile ? (
                  <div className={styles.fileSelected}>
                    ✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <button className={styles.secondaryBtn} style={{ pointerEvents: 'none' }}>Browse files</button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
                {importFile && (
                  <button className={styles.secondaryBtn} onClick={() => { setImportFile(null); setImportResult(null) }}>
                    ✕ Clear
                  </button>
                )}
                <button
                  className={styles.primaryBtn}
                  disabled={importLoading || !importFile || !importProviderId || !importPeriodStart || !importPeriodEnd}
                  onClick={handleImport}
                >
                  {importLoading ? '⏳ Importing…' : '📥 Import Statement'}
                </button>
              </div>

              {importResult && (
                <div className={importResult.isDuplicate ? styles.errorBanner : styles.successBanner} style={{ marginTop: 16 }}>
                  {importResult.isDuplicate
                    ? `⚠️ Duplicate detected — this CSV was already imported (statement ID: ${importResult.statementId})`
                    : `✅ Successfully imported ${importResult.lineCount} rows | Gross: ${money(importResult.totalGross)} | Statement ID: ${importResult.statementId}`
                  }
                </div>
              )}
            </div>

            {/* CSV Format Guide */}
            <div className={styles.importCard}>
              <h3 className={styles.importCardTitle}>Supported CSV Format</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                The importer auto-detects column headers from common delivery platform exports. Required columns:
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Accepted Column Names</th>
                      <th>Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { field: 'Order ID', aliases: 'order_id, external_order_id, ref_id, reference_id', required: true },
                      { field: 'Order Date', aliases: 'order_date, date, created_at, placed_at', required: true },
                      { field: 'Gross Amount', aliases: 'gross, gross_amount, order_amount, subtotal, total_amount', required: true },
                      { field: 'Commission', aliases: 'commission, commission_amount, platform_fee', required: false },
                      { field: 'Tax', aliases: 'tax, tax_amount, gst, vat', required: false },
                      { field: 'Promotions', aliases: 'promo, promotion, discount, promo_amount', required: false },
                      { field: 'Refund', aliases: 'refund, refund_amount, cancellation_amount', required: false },
                      { field: 'Adjustment', aliases: 'adjustment, adjustment_amount', required: false },
                      { field: 'Net Payout', aliases: 'net, net_amount, payout, settlement_amount', required: false },
                      { field: 'Customer', aliases: 'customer_name, customer, name', required: false },
                      { field: 'Payment Method', aliases: 'payment_method, payment_type, payment_mode', required: false },
                      { field: 'Status', aliases: 'status, order_status, state', required: false },
                    ].map((row) => (
                      <tr key={row.field}>
                        <td style={{ fontWeight: 700 }}>{row.field}</td>
                        <td className={styles.mono} style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>{row.aliases}</td>
                        <td>
                          {row.required ? (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Required</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>Optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Resolve Exception Modal ── */}
      {resolveModal && (
        <div className={styles.modalOverlay} onClick={() => setResolveModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Resolve Exception</h2>
            <p className={styles.modalSubtext}>{resolveModal.description}</p>
            <textarea
              className={styles.modalTextarea}
              placeholder="Enter resolution note (e.g. 'Confirmed with UrbanPiper support — order was cancelled on provider side')"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
            />
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setResolveModal(null)}>Cancel</button>
              <button
                className={styles.primaryBtn}
                disabled={actionLoading?.startsWith('resolve-')}
                onClick={resolveException}
              >
                {actionLoading?.startsWith('resolve-') ? '…' : '✓ Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Period Modal ── */}
      {showCreatePeriod && (
        <div className={styles.modalOverlay} onClick={() => setShowCreatePeriod(false)}>
          <div className={`${styles.modal} ${styles.periodModal}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Reconciliation Period</h2>
            <p className={styles.modalSubtext}>Group imported statements into a reviewable period.</p>

            <div className={styles.formGrid} style={{ marginBottom: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Period Name</label>
                <input className={styles.formInput} placeholder="e.g. Sep 2026 — UrbanPiper" value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Date</label>
                <input type="date" className={styles.formInput} value={newPeriodStart} onChange={(e) => setNewPeriodStart(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>End Date</label>
                <input type="date" className={styles.formInput} value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)} />
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 14 }}>
              <label className={styles.formLabel}>Notes (optional)</label>
              <textarea className={styles.modalTextarea} placeholder="Any notes about this period…" value={newPeriodNotes} onChange={(e) => setNewPeriodNotes(e.target.value)} rows={2} />
            </div>

            {allStatements.length > 0 && (
              <div className={styles.formGroup} style={{ marginBottom: 16 }}>
                <label className={styles.formLabel}>Include Statements</label>
                <div className={styles.statementCheckList}>
                  {allStatements.map((s) => (
                    <label key={s.id} className={styles.statementCheckItem}>
                      <input
                        type="checkbox"
                        checked={selectedStatementIds.includes(s.id)}
                        onChange={(e) => setSelectedStatementIds(e.target.checked
                          ? [...selectedStatementIds, s.id]
                          : selectedStatementIds.filter((id) => id !== s.id)
                        )}
                      />
                      {s.provider.name} — {s.lineCount} lines
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowCreatePeriod(false)}>Cancel</button>
              <button className={styles.primaryBtn} disabled={actionLoading === 'create-period'} onClick={createPeriod}>
                {actionLoading === 'create-period' ? '…' : '+ Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Provider Modal ── */}
      {showAddProvider && (
        <div className={styles.modalOverlay} onClick={() => setShowAddProvider(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Manage Providers</h2>
            <p className={styles.modalSubtext}>Existing providers for this location:</p>

            {providers.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {providers.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-raised)', marginBottom: 8,
                    border: '1px solid var(--color-border)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{p.name}</span>
                    <span className={styles.mono}>{p.slug}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-separator)', paddingTop: 16, marginBottom: 14 }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Add New Provider
              </p>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Provider Name</label>
                  <input className={styles.formInput} placeholder="e.g. UrbanPiper" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Slug (lowercase)</label>
                  <input className={styles.formInput} placeholder="e.g. urbanpiper" value={newProviderSlug} onChange={(e) => setNewProviderSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowAddProvider(false)}>Close</button>
              <button className={styles.primaryBtn} disabled={actionLoading === 'add-provider'} onClick={addProvider}>
                {actionLoading === 'add-provider' ? '…' : '+ Add Provider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
