'use client'

import { useEffect, useState } from 'react'
import styles from './tracking.module.css'

const STEPS = [
  { id: 'PENDING_ACCEPTANCE', label: 'Received' },
  { id: 'ACCEPTED', label: 'Confirmed' },
  { id: 'PREPARING', label: 'Cooking' },
  { id: 'READY', label: 'Ready' },
  { id: 'OUT_FOR_DELIVERY', label: 'En Route' },
  { id: 'DELIVERED', label: 'Completed' },
]

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function OrderTrackingClient({ token }: { token: string }) {
  const [order, setOrder] = useState<any>()
  const [error, setError] = useState('')

  useEffect(() => {
    let stop = false
    const load = () =>
      fetch(`/api/ordering/orders/${token}`)
        .then(async (r) => {
          const j = await r.json()
          if (!r.ok) throw new Error(j.error || 'Failed to load order')
          if (!stop) setOrder(j)
        })
        .catch((e) => setError(e.message))

    load()
    const t = setInterval(load, 6000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [token])

  if (!order) {
    return (
      <main className={styles.page}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.2)', borderTopColor: '#5b45f5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <span>{error || 'Locating your order…'}</span>
        </div>
      </main>
    )
  }

  const isDelivery = order.fulfilmentType === 'DELIVERY'
  const relevantSteps = isDelivery ? STEPS : STEPS.filter((s) => s.id !== 'OUT_FOR_DELIVERY')
  const currentIndex = Math.max(
    0,
    relevantSteps.findIndex((s) => s.id === order.status)
  )

  const isRejected = order.status === 'REJECTED'
  const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED'

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.topBadge}>
          <p className={styles.eyebrow}>
            ORDER #{order.orderNumber || order.id?.slice(-6).toUpperCase()}
          </p>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            Live Tracker
          </span>
        </div>

        <div>
          <h1 className={styles.title}>
            {isRejected
              ? 'Order Could Not Be Accepted'
              : isDelivered
              ? 'Order Completed!'
              : order.status === 'READY'
              ? isDelivery
                ? 'Ready for Courier Pickup'
                : 'Ready for Collection!'
              : order.status === 'PREPARING'
              ? 'Kitchen is Preparing Your Meal'
              : 'Order Confirmed'}
          </h1>
          <p className={styles.subtitle}>
            {order.location.name} · {order.fulfilmentType?.replaceAll('_', ' ')}
          </p>
        </div>

        {order.estimatedReadyAt && !isDelivered && !isRejected && (
          <div className={styles.etaCard}>
            <div>
              <span className={styles.etaLabel}>Estimated Completion</span>
              <div className={styles.etaTime}>
                {new Date(order.estimatedReadyAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <span style={{ fontSize: '30px' }}>⏱️</span>
          </div>
        )}

        {/* Live Stepper */}
        {!isRejected && (
          <div className={styles.timeline}>
            {relevantSteps.map((s, i) => {
              const isDone = i < currentIndex
              const isActive = i === currentIndex

              return (
                <div
                  key={s.id}
                  className={`${styles.timelineStep} ${
                    isDone ? styles.stepDone : isActive ? styles.stepActive : ''
                  }`}
                >
                  <i className={styles.stepIcon}>{isDone ? '✓' : i + 1}</i>
                  <span className={styles.stepLabel}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {order.rejectionReason && (
          <div className={styles.rejectionAlert}>
            ⚠️ Reason: {order.rejectionReason}
          </div>
        )}

        {/* Order Receipt */}
        <div className={styles.itemsList}>
          {order.items?.map((item: any) => (
            <div className={styles.itemRow} key={item.id}>
              <span className={styles.itemQuantity}>
                {item.quantity} × {item.name}
              </span>
              <span className={styles.itemTotal}>{money(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className={styles.totalRow}>
            <span>Total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.totalStatus}>{order.paymentStatus || 'PAY LATER'}</span>
              <span>{money(order.total)}</span>
            </div>
          </div>
        </div>

        <p className={styles.footerNote}>
          This tracking page refreshes automatically. Save or bookmark this URL to view real-time updates.
        </p>
      </section>
    </main>
  )
}
