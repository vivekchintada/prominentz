'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './labor.module.css'
import { useToast, ToastContainer } from '../ui/Toast'

type EmployeeRow = {
  employeeId: string
  name: string
  plannedMinutes: number
  actualMinutes: number
  cost: number
}

type Summary = {
  plannedHours: number
  actualHours: number
  plannedCost: number
  actualCost: number
  sales: number
  laborPercent: number
  salesPerLaborHour: number
  overtimeHours: number
  byEmployee: EmployeeRow[]
}

type Entry = {
  id: string
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  workedMinutes: number | null
  status: string
  approvedAt: string | null
  managerNote: string | null
  hourlyRate: number
  employee: {
    user: {
      name: string | null
      email: string
    }
  }
  shift?: {
    scheduledStart: string | null
    scheduledEnd: string | null
  } | null
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const hours = (minutes: number) => `${(minutes / 60).toFixed(1)}h`

export default function LaborClient() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const range = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    const end = new Date(monday)
    end.setDate(monday.getDate() + 7)
    end.setMilliseconds(-1)
    return {
      start: monday,
      end,
      label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    }
  }, [weekOffset])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const query = `startDate=${encodeURIComponent(range.start.toISOString())}&endDate=${encodeURIComponent(range.end.toISOString())}`
    try {
      const [s, t] = await Promise.all([
        fetch(`/api/labor/summary?${query}`),
        fetch(`/api/timesheets?${query}`),
      ])
      if (!s.ok || !t.ok) throw new Error('Could not load labor records')
      setSummary(await s.json())
      setEntries(await t.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load labor data')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (id: string, approved: boolean) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (!res.ok) throw new Error('Failed to update timesheet')
      showToast(approved ? 'Timesheet approved for payroll' : 'Timesheet reopened for review', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating timesheet', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Employee', 'Clock in', 'Clock out', 'Break minutes', 'Worked hours', 'Hourly rate ($)', 'Cost ($)', 'Approved'],
      ...entries.map((e) => [
        e.employee.user.name ?? e.employee.user.email,
        new Date(e.clockIn).toLocaleString('en-US'),
        e.clockOut ? new Date(e.clockOut).toLocaleString('en-US') : 'ACTIVE',
        String(e.breakMinutes),
        ((e.workedMinutes ?? 0) / 60).toFixed(2),
        String(e.hourlyRate),
        (((e.workedMinutes ?? 0) / 60) * e.hourlyRate).toFixed(2),
        e.approvedAt ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `resto-timesheets-${range.start.toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Timesheet export downloaded', 'success')
  }

  const pendingReviewCount = entries.filter((e) => !e.approvedAt).length

  return (
    <div className={styles.page}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── KPI Metric Cards ─────────────────────────────────── */}
      <div className={styles.metricsGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>⏱️</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Planned Labor</span>
            <span className={styles.kpiValue}>{loading ? '—' : money(summary?.plannedCost ?? 0)}</span>
            <span className={styles.kpiSubtext}>{(summary?.plannedHours ?? 0).toFixed(1)} scheduled hours</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>💰</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Actual Labor</span>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {loading ? '—' : money(summary?.actualCost ?? 0)}
            </span>
            <span className={styles.kpiSubtext}>{(summary?.actualHours ?? 0).toFixed(1)} clocked hours</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📊</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Labor / Sales %</span>
            <span className={styles.kpiValue} style={{ color: 'var(--brand)' }}>
              {loading ? '—' : `${(summary?.laborPercent ?? 0).toFixed(1)}%`}
            </span>
            <span className={styles.kpiSubtext}>{money(summary?.sales ?? 0)} net sales</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>⚡</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Sales / Labor Hr</span>
            <span className={styles.kpiValue} style={{ color: 'var(--color-text-primary)' }}>
              {loading ? '—' : money(summary?.salesPerLaborHour ?? 0)}
            </span>
            <span className={styles.kpiSubtext}>{(summary?.overtimeHours ?? 0).toFixed(1)} overtime hours</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Toolbar ───────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={() => setWeekOffset((v) => v - 1)} title="Previous week">
            ◀ Prev
          </button>
          <div className={styles.navLabel}>
            <span>📅 {range.label}</span>
          </div>
          <button className={styles.navBtn} onClick={() => setWeekOffset((v) => v + 1)} title="Next week">
            Next ▶
          </button>
          {weekOffset !== 0 && (
            <button className={styles.navBtn} onClick={() => setWeekOffset(0)} style={{ borderLeft: '1px solid var(--color-border)' }}>
              Current Week
            </button>
          )}
        </div>

        <button className={styles.exportBtn} onClick={exportCsv}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Team Variance Section ────────────────────────────── */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Team Labor Variance</h2>
            <p className={styles.panelSubtitle}>Scheduled plan versus clocked actual attendance by staff member</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Scheduled</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {summary?.byEmployee.map((r) => {
                const diffMins = r.actualMinutes - r.plannedMinutes
                const isOver = diffMins > 0
                return (
                  <tr key={r.employeeId}>
                    <td>
                      <div className={styles.empCell}>
                        <div className={styles.avatar}>{r.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className={styles.empName}>{r.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{hours(r.plannedMinutes)}</td>
                    <td>{hours(r.actualMinutes)}</td>
                    <td>
                      {diffMins === 0 ? (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>0.0h</span>
                      ) : (
                        <span className={isOver ? styles.overtimePill : styles.underPill}>
                          {isOver ? `+${hours(diffMins)}` : `-${hours(Math.abs(diffMins))}`}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{money(r.cost)}</td>
                  </tr>
                )
              })}
              {!loading && !summary?.byEmployee.length && (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    No scheduled shifts or clocked records found for this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Timesheet Review Section ─────────────────────────── */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Timesheet Payroll Approval</h2>
            <p className={styles.panelSubtitle}>Review completed punch times and approve entries for payroll</p>
          </div>
          <span className={pendingReviewCount > 0 ? `${styles.badgePill} ${styles.badgeWarning}` : `${styles.badgePill} ${styles.badgeSuccess}`}>
            {pendingReviewCount > 0 ? `⚠️ ${pendingReviewCount} Awaiting Review` : '✓ All Approved'}
          </span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Break</th>
                <th>Worked</th>
                <th>Est. Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isApproved = !!e.approvedAt
                const workedHours = (e.workedMinutes ?? 0) / 60
                const cost = workedHours * e.hourlyRate
                return (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.empCell}>
                        <div className={styles.avatar} style={{ background: isApproved ? 'var(--brand)' : '#f59e0b' }}>
                          {(e.employee.user.name ?? e.employee.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.empName}>{e.employee.user.name ?? 'Staff Member'}</div>
                          <div className={styles.empSub}>{e.employee.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {new Date(e.clockIn).toLocaleTimeString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      {e.clockOut ? (
                        new Date(e.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span style={{ color: '#30D158', fontWeight: 700 }}>🟢 On Floor</span>
                      )}
                    </td>
                    <td>{e.breakMinutes}m</td>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {e.workedMinutes === null ? '—' : hours(e.workedMinutes)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{money(cost)}</td>
                    <td>
                      <span className={isApproved ? `${styles.badgePill} ${styles.badgeSuccess}` : `${styles.badgePill} ${styles.badgeWarning}`}>
                        {isApproved ? 'Approved' : 'Needs Review'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={isApproved ? styles.actionBtn : `${styles.actionBtn} ${styles.actionBtnPrimary}`}
                        onClick={() => approve(e.id, !isApproved)}
                        disabled={actionLoading === e.id}
                      >
                        {actionLoading === e.id ? 'Saving…' : isApproved ? 'Reopen' : '✓ Approve'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!loading && !entries.length && (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No timesheets recorded for this week range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
