'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './onlineOrders.module.css'
import { useToast, ToastContainer } from '../ui/Toast'

const COLUMNS = [
  { id: 'PENDING_ACCEPTANCE', title: 'Pending Approval', icon: '⏳' },
  { id: 'ACCEPTED', title: 'Accepted', icon: '📋' },
  { id: 'PREPARING', title: 'In Kitchen', icon: '🍳' },
  { id: 'READY', title: 'Ready / Dispatch', icon: '🔔' },
]

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function OnlineOrdersClient() {
  const [orders, setOrders] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toasts, showToast, dismissToast } = useToast()

  const load = useCallback(() => {
    return fetch('/api/ordering/manage')
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Failed to load online orders')
        setOrders(j)
        setError('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [load])

  const setStatus = async (id: string, status: string) => {
    setActionLoading(id)
    const reason =
      status === 'REJECTED'
        ? prompt('Reason for rejecting order:') || 'Kitchen at maximum capacity'
        : undefined

    try {
      const res = await fetch(`/api/ordering/manage/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, estimatedMinutes: 25, reason }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Failed to update order status')
      }
      showToast(`Order status updated to ${status.replaceAll('_', ' ').toLowerCase()}`, 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update order', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const pendingOrders = orders.filter((o) => o.onlineStatus === 'PENDING_ACCEPTANCE')
  const inKitchenOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.onlineStatus))
  const readyOrders = orders.filter((o) => o.onlineStatus === 'READY')
  const todayRevenue = orders
    .filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((n, o) => n + (o.total || 0), 0)

  return (
    <div className={styles.page}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Top Actions ──────────────────────────────────────── */}
      <div className={styles.topActions}>
        <button className={styles.secondaryBtn} onClick={() => load()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Refresh
        </button>
        <Link href="/dashboard/settings/ordering" className={styles.secondaryBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Ordering Settings
        </Link>
        <Link href="/order" target="_blank" rel="noreferrer" className={styles.storefrontBtn}>
          <span>Open Storefront</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </Link>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button className={styles.secondaryBtn} onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Stats Grid ───────────────────────────────────── */}
      <div className={styles.statsGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: pendingOrders.length > 0 ? 'rgba(239, 68, 68, 0.15)' : undefined }}>
            {pendingOrders.length > 0 ? '🚨' : '⚡'}
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Needs Action</span>
            <span className={styles.kpiValue} style={{ color: pendingOrders.length > 0 ? '#ef4444' : 'inherit' }}>
              {pendingOrders.length}
            </span>
            <span className={styles.kpiSubtext}>Pending staff confirmation</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🍳</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>In Preparation</span>
            <span className={styles.kpiValue} style={{ color: '#5b45f5' }}>
              {inKitchenOrders.length}
            </span>
            <span className={styles.kpiSubtext}>Active on kitchen line</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🔔</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Ready for Pickup</span>
            <span className={styles.kpiValue} style={{ color: '#30D158' }}>
              {readyOrders.length}
            </span>
            <span className={styles.kpiSubtext}>Awaiting customer / courier</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>💵</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Today's Online Sales</span>
            <span className={styles.kpiValue} style={{ color: '#a855f7' }}>
              {money(todayRevenue)}
            </span>
            <span className={styles.kpiSubtext}>{orders.length} total direct orders</span>
          </div>
        </div>
      </div>

      {/* ── Dispatch Kanban Board ────────────────────────────── */}
      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => {
            if (col.id === 'ACCEPTED') return o.onlineStatus === 'ACCEPTED'
            return o.onlineStatus === col.id
          })

          return (
            <div className={styles.column} key={col.id}>
              <div className={styles.columnHeader}>
                <h3 className={styles.columnTitle}>
                  <span>{col.icon}</span>
                  <span>{col.title}</span>
                </h3>
                <span className={styles.countBadge}>{colOrders.length}</span>
              </div>

              <div className={styles.columnList}>
                {colOrders.map((o) => {
                  const isPending = o.onlineStatus === 'PENDING_ACCEPTANCE'
                  const isAccepted = o.onlineStatus === 'ACCEPTED'
                  const isPreparing = o.onlineStatus === 'PREPARING'
                  const isReady = o.onlineStatus === 'READY'
                  const isDelivery = o.fulfilmentType === 'DELIVERY'
                  const isPickup = o.fulfilmentType === 'PICKUP'

                  return (
                    <article className={styles.orderCard} key={o.id}>
                      <div className={styles.cardTop}>
                        <span className={styles.orderNumber}>#{o.publicOrderNumber || o.id.slice(-6).toUpperCase()}</span>
                        <span
                          className={`${styles.fulfilmentPill} ${
                            isDelivery ? styles.pillDelivery : isPickup ? styles.pillPickup : styles.pillDineIn
                          }`}
                        >
                          {o.fulfilmentType}
                        </span>
                      </div>

                      <div>
                        <h4 className={styles.customerName}>{o.customerName || 'Customer'}</h4>
                        {o.customerPhone && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>
                            📞 {o.customerPhone}
                          </div>
                        )}
                      </div>

                      <p className={styles.itemsSummary}>
                        {o.items?.map((i: any) => `${i.quantity}× ${i.menuItem?.name || 'Item'}`).join(' · ') || 'Order details'}
                      </p>

                      <div className={styles.cardMeta}>
                        <span className={styles.timePlaced}>
                          🕒 {new Date(o.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={styles.orderTotal}>{money(o.total || 0)}</span>
                      </div>

                      {/* Card Action Buttons */}
                      {isPending && (
                        <div className={styles.cardActions}>
                          <button
                            className={`${styles.btnAction} ${styles.btnDanger}`}
                            style={{ flex: 1 }}
                            onClick={() => setStatus(o.id, 'REJECTED')}
                            disabled={actionLoading === o.id}
                          >
                            Reject
                          </button>
                          <button
                            className={`${styles.btnAction} ${styles.btnPrimary}`}
                            style={{ flex: 1.5 }}
                            onClick={() => setStatus(o.id, 'ACCEPTED')}
                            disabled={actionLoading === o.id}
                          >
                            ✓ Accept
                          </button>
                        </div>
                      )}

                      {isAccepted && (
                        <button
                          className={`${styles.btnAction} ${styles.btnPrimary} ${styles.btnFull}`}
                          onClick={() => setStatus(o.id, 'PREPARING')}
                          disabled={actionLoading === o.id}
                        >
                          🍳 Send to Kitchen
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          className={`${styles.btnAction} ${styles.btnPrimary} ${styles.btnFull}`}
                          style={{ background: '#30D158', borderColor: '#30D158' }}
                          onClick={() => setStatus(o.id, 'READY')}
                          disabled={actionLoading === o.id}
                        >
                          🔔 Mark as Ready
                        </button>
                      )}

                      {isReady && (
                        <button
                          className={`${styles.btnAction} ${styles.btnPrimary} ${styles.btnFull}`}
                          onClick={() => setStatus(o.id, isDelivery ? 'OUT_FOR_DELIVERY' : 'COMPLETED')}
                          disabled={actionLoading === o.id}
                        >
                          {isDelivery ? '🛵 Out for Delivery' : '✓ Order Completed'}
                        </button>
                      )}
                    </article>
                  )
                })}

                {!loading && colOrders.length === 0 && (
                  <div className={styles.emptyColumn}>No orders in {col.title.toLowerCase()}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
