'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './orderingSettings.module.css'
import { useToast, ToastContainer } from '../ui/Toast'

export default function OrderingSettingsClient() {
  const [data, setData] = useState<any>()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    fetch('/api/ordering/config')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        showToast('Failed to load ordering settings', 'error')
        setLoading(false)
      })
  }, [showToast])

  if (loading || !data?.config) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
        Loading ordering configuration...
      </div>
    )
  }

  const c = data.config
  const set = (k: string, v: any) =>
    setData({ ...data, config: { ...c, [k]: v } })

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/ordering/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...c,
          locationId: data.location.id,
          leadTimeMinutes: Number(c.leadTimeMinutes || 25),
          deliveryRadiusKm: Number(c.deliveryRadiusKm || 10),
          deliveryFee: Number(c.deliveryFee || 0),
          minOrderAmount: Number(c.minOrderAmount || 0),
          freeDeliveryThreshold:
            c.freeDeliveryThreshold === null || c.freeDeliveryThreshold === ''
              ? null
              : Number(c.freeDeliveryThreshold),
        }),
      })
      if (!r.ok) throw new Error('Could not save configuration')
      showToast('Online ordering settings updated successfully', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Storefront Banner ────────────────────────────────── */}
      <div className={styles.storeBanner}>
        <div className={styles.storeInfo}>
          <div className={styles.storeIcon}>🛍️</div>
          <div>
            <h3 className={styles.storeName}>{data.location.name} Storefront</h3>
            <div className={styles.storeUrl}>
              Public URL: <code>/order/{data.location.id}</code>
            </div>
          </div>
        </div>
        <Link href={`/order/${data.location.id}`} target="_blank" rel="noreferrer" className={styles.storeLinkBtn}>
          <span>Preview Live Storefront</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </Link>
      </div>

      {/* ── 1. Availability & Emergency Controls ────────────── */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>⚡</span>
            <span>Storefront Availability & Status</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Control whether customers can browse your menu and place new direct orders online.
          </p>
        </div>

        <div className={styles.toggleList}>
          <div className={styles.toggleRow} onClick={() => set('isEnabled', !c.isEnabled)}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Online Ordering Active</span>
              <span className={styles.toggleDesc}>Storefront is publicly accessible and accepts incoming checkouts</span>
            </div>
            <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                aria-label="Online Ordering Active"
                checked={c.isEnabled}
                onChange={(e) => set('isEnabled', e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.toggleRow} onClick={() => set('isPaused', !c.isPaused)}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Pause New Orders (Busy Kitchen)</span>
              <span className={styles.toggleDesc}>Keep menu visible but temporarily disable the checkout button</span>
            </div>
            <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                aria-label="Pause New Orders (Busy Kitchen)"
                checked={c.isPaused}
                onChange={(e) => set('isPaused', e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        {c.isPaused && (
          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label className={styles.label}>Customer Banner Notice</label>
            <input
              className={styles.input}
              placeholder="e.g. Kitchen temporarily at capacity. Resuming in 20 minutes."
              value={c.pauseReason || ''}
              onChange={(e) => set('pauseReason', e.target.value)}
            />
          </div>
        )}
      </section>

      {/* ── 2. Fulfillment Methods ──────────────────────────── */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>🛵</span>
            <span>Fulfillment Methods</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Enable the order types customers can select at checkout on your direct storefront.
          </p>
        </div>

        <div className={styles.toggleList}>
          {[
            { key: 'pickupEnabled', label: 'Pickup & Takeaway', desc: 'Customer collects order at restaurant counter' },
            { key: 'deliveryEnabled', label: 'Direct Delivery', desc: 'In-house or partner courier delivers to customer address' },
            { key: 'dineInEnabled', label: 'Dine-In QR Orders', desc: 'Guests order directly from their table via smartphone' },
            { key: 'scheduledOrdersEnabled', label: 'Scheduled Future Orders', desc: 'Allow customers to schedule orders hours or days ahead' },
          ].map((item) => (
            <div className={styles.toggleRow} key={item.key} onClick={() => set(item.key, !c[item.key])}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>{item.label}</span>
                <span className={styles.toggleDesc}>{item.desc}</span>
              </div>
              <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={item.label}
                  checked={!!c[item.key]}
                  onChange={(e) => set(item.key, e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Delivery & Order Rules ────────────────────────── */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>💰</span>
            <span>Delivery & Fee Parameters</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Set minimum order amounts, fixed delivery fees, and radius thresholds.
          </p>
        </div>

        <div className={styles.inputGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Standard Delivery Fee ($)</label>
            <input
              type="number"
              step="0.50"
              className={styles.input}
              value={c.deliveryFee ?? 0}
              onChange={(e) => set('deliveryFee', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Free Delivery Over Amount ($)</label>
            <input
              type="number"
              step="1"
              className={styles.input}
              placeholder="Leave empty for no free delivery"
              value={c.freeDeliveryThreshold ?? ''}
              onChange={(e) => set('freeDeliveryThreshold', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Minimum Order Subtotal ($)</label>
            <input
              type="number"
              step="1"
              className={styles.input}
              value={c.minOrderAmount ?? 0}
              onChange={(e) => set('minOrderAmount', e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Max Delivery Radius (km)</label>
            <input
              type="number"
              step="0.5"
              className={styles.input}
              value={c.deliveryRadiusKm ?? 10}
              onChange={(e) => set('deliveryRadiusKm', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── 4. Kitchen Prep & Automation ─────────────────────── */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>🍳</span>
            <span>Kitchen Preparation & Automation</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Configure preparation lead times and automated acceptance rules.
          </p>
        </div>

        <div className={styles.inputGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Estimated Preparation Time (Minutes)</label>
            <input
              type="number"
              min="5"
              max="180"
              className={styles.input}
              value={c.leadTimeMinutes ?? 25}
              onChange={(e) => set('leadTimeMinutes', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.toggleRow} onClick={() => set('autoAcceptOrders', !c.autoAcceptOrders)} style={{ marginTop: '8px' }}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Auto-Accept Incoming Orders</span>
            <span className={styles.toggleDesc}>
              Automatically confirm online orders and send them directly to the KDS kitchen screens without manual staff review
            </span>
          </div>
          <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              aria-label="Auto-Accept Incoming Orders"
              checked={!!c.autoAcceptOrders}
              onChange={(e) => set('autoAcceptOrders', e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </section>

      {/* ── Save Footer ──────────────────────────────────────── */}
      <div className={styles.footerActions}>
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              Saving Settings…
            </>
          ) : (
            '✓ Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}
