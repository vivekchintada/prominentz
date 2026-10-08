'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface AuditEntry {
  id: string
  actorName: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const ACTION_COLORS: Record<string, string> = {
  VOID_PAYMENT:     '#FF453A',
  VOID_ORDER:       '#FF453A',
  DELETE_MENU_ITEM: '#FF453A',
  EDIT_MENU_ITEM:   '#FF9F0A',
  CHANGE_USER_ROLE: '#FF9F0A',
  EDIT_SETTINGS:    '#FF9F0A',
  CREATE_USER:      '#30D158',
  CREATE_LOCATION:  '#30D158',
  COMP_ORDER:       '#BF5AF2',
}

const ACTION_ICONS: Record<string, string> = {
  VOID_PAYMENT:     '🚫',
  VOID_ORDER:       '🚫',
  DELETE_MENU_ITEM: '🗑️',
  EDIT_MENU_ITEM:   '✏️',
  CHANGE_USER_ROLE: '🔑',
  EDIT_SETTINGS:    '⚙️',
  CREATE_USER:      '👤',
  CREATE_LOCATION:  '📍',
  COMP_ORDER:       '🎁',
}

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (filterAction) params.set('action', filterAction)
      if (filterStart) params.set('startDate', filterStart)
      if (filterEnd)   params.set('endDate',   filterEnd)

      const res = await fetch(`/api/audit?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load audit log'); return }
      setLogs(json.logs)
      setPagination(json.pagination)
    } catch (e: unknown) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterStart, filterEnd])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const allActions = [
    'VOID_PAYMENT', 'VOID_ORDER', 'EDIT_MENU_ITEM', 'DELETE_MENU_ITEM',
    'CREATE_USER', 'CHANGE_USER_ROLE', 'COMP_ORDER', 'EDIT_SETTINGS', 'CREATE_LOCATION',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Filters */}
        <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Action</label>
            <select
              className="form-select"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
              style={{ minWidth: 180 }}
            >
              <option value="">All Actions</option>
              {allActions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>From</label>
            <input type="date" className="form-input" value={filterStart} onChange={(e) => { setFilterStart(e.target.value); setPage(1) }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>To</label>
            <input type="date" className="form-input" value={filterEnd} onChange={(e) => { setFilterEnd(e.target.value); setPage(1) }} />
          </div>
          <button className="btn btn--secondary btn--sm" onClick={() => { setFilterAction(''); setFilterStart(''); setFilterEnd(''); setPage(1) }}>
            Clear Filters
          </button>
        </div>

        {/* Stats row */}
        {pagination && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Showing {logs.length} of <strong style={{ color: 'var(--color-text-primary)' }}>{pagination.total}</strong> entries
          </div>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading audit log…</div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-error)', fontSize: 14 }}>{error}</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>No audit entries match your filters.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-raised)' }}>
                  {['Time', 'Actor', 'Action', 'Target', 'IP', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => {
                  const color = ACTION_COLORS[entry.action] ?? '#8E8E93'
                  const icon  = ACTION_ICONS[entry.action]  ?? '📋'
                  const isExpanded = expandedId === entry.id
                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        style={{ borderBottom: '1px solid var(--color-separator)', cursor: (entry.before || entry.after) ? 'pointer' : 'default' }}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {new Date(entry.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          {entry.actorName}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, color, letterSpacing: '0.3px' }}>
                            {icon} {entry.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: 'var(--color-text-tertiary)' }}>{entry.targetType} /</span>{' '}
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.targetId.slice(0, 12)}…</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {entry.ipAddress ?? '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                          {(entry.before || entry.after) && <span>{isExpanded ? '▲' : '▼'}</span>}
                        </td>
                      </tr>
                      {isExpanded && (entry.before || entry.after) && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 16px 16px', background: 'var(--color-bg-raised)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              {entry.before && (
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-error)', marginBottom: 6 }}>BEFORE</div>
                                  <pre style={{ margin: 0, background: 'var(--color-bg)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'auto', maxHeight: 200 }}>
                                    {JSON.stringify(entry.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.after && (
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', marginBottom: 6 }}>AFTER</div>
                                  <pre style={{ margin: 0, background: 'var(--color-bg)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'auto', maxHeight: 200 }}>
                                    {JSON.stringify(entry.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn--secondary btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
              Page {page} of {pagination.pages}
            </span>
            <button className="btn btn--secondary btn--sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>
  )
}
