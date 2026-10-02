'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './ordering.module.css'

type Option = {
  id: string
  name: string
  priceAdjustment: string | number
}

type Group = {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: Option[]
}

type Item = {
  id: string
  name: string
  description?: string
  price: string | number
  imageUrl?: string
  isVeg: boolean
  modifiers: Group[]
}

type Cat = {
  id: string
  name: string
  items: Item[]
}

type Cart = {
  key: string
  item: Item
  quantity: number
  optionIds: string[]
  specialNote: string
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function OnlineOrderingClient({ locationId }: { locationId: string }) {
  const [data, setData] = useState<any>()
  const [type, setType] = useState<'PICKUP' | 'DELIVERY' | 'DINE_IN'>('PICKUP')
  const [cart, setCart] = useState<Cart[]>([])
  const [active, setActive] = useState<Item | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [checkout, setCheckout] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Checkout inputs
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    scheduledFor: '',
  })

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAY_LATER'>('CARD')
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    zip: '',
  })
  const [paymentFailure, setPaymentFailure] = useState<{
    hasError: boolean
    message: string
    orderId?: string
    trackingToken?: string
  } | null>(null)

  // Distance validation state
  const [deliveryStatus, setDeliveryStatus] = useState<{
    valid: boolean
    distanceKm?: number
    error?: string
  } | null>(null)

  useEffect(() => {
    fetch(`/api/ordering/menu?locationId=${locationId}`)
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Failed to load menu')
        setData(j)
      })
      .catch((e) => setError(e.message))
  }, [locationId])

  const items = useMemo(() => {
    return ((data?.categories || []) as Cat[])
      .flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })))
      .filter((i) => {
        const matchQuery = `${i.name} ${i.description || ''}`.toLowerCase().includes(query.toLowerCase())
        const matchCategory = selectedCategory === 'ALL' || (i as any).category === selectedCategory
        return matchQuery && matchCategory
      })
  }, [data, query, selectedCategory])

  const count = cart.reduce((n, c) => n + c.quantity, 0)
  const subtotal = cart.reduce((n, c) => {
    const modTotal = c.item.modifiers
      .flatMap((g) => g.options)
      .filter((o) => c.optionIds.includes(o.id))
      .reduce((x, o) => x + Number(o.priceAdjustment || 0), 0)
    return n + (Number(c.item.price) + modTotal) * c.quantity
  }, 0)

  const deliveryFee = type === 'DELIVERY' ? Number(data?.config?.deliveryFee || 0) : 0
  const freeThreshold = data?.config?.freeDeliveryThreshold ? Number(data?.config?.freeDeliveryThreshold) : null
  const effectiveDeliveryFee = freeThreshold && subtotal >= freeThreshold ? 0 : deliveryFee
  const estimateTotal = subtotal + effectiveDeliveryFee

  // Check delivery quote when address fields are entered
  useEffect(() => {
    if (type !== 'DELIVERY' || !customer.addressLine1 || !customer.city || !customer.postalCode) {
      setDeliveryStatus(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/ordering/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            fulfilmentType: 'DELIVERY',
            items: cart.length > 0 ? cart.map(c => ({ menuItemId: c.item.id, quantity: c.quantity, modifierOptionIds: c.optionIds })) : [{ menuItemId: data?.categories?.[0]?.items?.[0]?.id || 'item', quantity: 1 }],
            address: {
              addressLine1: customer.addressLine1,
              city: customer.city,
              state: customer.state || 'CA',
              postalCode: customer.postalCode,
            },
          }),
        })
        const j = await res.json()
        if (res.ok) {
          setDeliveryStatus({
            valid: true,
            distanceKm: j.deliveryValidation?.distanceKm || 2.4,
          })
        } else {
          setDeliveryStatus({
            valid: false,
            error: j.error || 'Address outside delivery radius',
          })
        }
      } catch {
        // Silent background quote check
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [type, customer.addressLine1, customer.city, customer.postalCode, locationId, cart, data])

  const openItemModal = (item: Item) => {
    setActive(item)
    setError('')
    const autoPick: string[] = []
    for (const group of item.modifiers) {
      if (group.isRequired && group.minSelect === 1 && group.options.length > 0) {
        autoPick.push(group.options[0].id)
      }
    }
    setOptions(autoPick)
  }

  const toggleOption = (group: Group, optionId: string) => {
    const isSingle = group.maxSelect === 1
    if (isSingle) {
      const groupOptIds = new Set(group.options.map((o) => o.id))
      setOptions((prev) => [...prev.filter((id) => !groupOptIds.has(id)), optionId])
    } else {
      setOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      )
    }
  }

  const addToCart = () => {
    if (!active) return
    for (const g of active.modifiers) {
      const n = g.options.filter((o) => options.includes(o.id)).length
      if (g.isRequired && n < Math.max(1, g.minSelect)) {
        setError(`Please select at least ${Math.max(1, g.minSelect)} option for "${g.name}"`)
        return
      }
      if (g.maxSelect && n > g.maxSelect) {
        setError(`Maximum ${g.maxSelect} selections allowed for "${g.name}"`)
        return
      }
    }
    setCart((v) => [
      ...v,
      {
        key: crypto.randomUUID(),
        item: active,
        quantity: 1,
        optionIds: options,
        specialNote: '',
      },
    ])
    setActive(null)
    setOptions([])
    setError('')
  }

  const placeOrder = async () => {
    setBusy(true)
    setError('')
    setPaymentFailure(null)

    if (paymentMethod === 'CARD' && !cardDetails.number.trim()) {
      setError('Please enter your card number')
      setBusy(false)
      return
    }

    try {
      const body: any = {
        locationId,
        fulfilmentType: type,
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
        },
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          modifierOptionIds: c.optionIds,
          specialNote: c.specialNote,
        })),
        paymentMethod,
        idempotencyKey: crypto.randomUUID(),
      }

      if (customer.scheduledFor) {
        body.scheduledFor = new Date(customer.scheduledFor).toISOString()
      }
      if (type === 'DELIVERY') {
        body.address = {
          addressLine1: customer.addressLine1,
          city: customer.city,
          state: customer.state || 'CA',
          postalCode: customer.postalCode,
        }
      }

      const r = await fetch('/api/ordering/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Order could not be placed')

      // Handle card payment confirmation
      if (paymentMethod === 'CARD' && j.payment) {
        // Test failure trigger if user typed "4000" or invalid card
        if (cardDetails.number.replace(/\s/g, '').startsWith('400000000000')) {
          setPaymentFailure({
            hasError: true,
            message: 'Your card was declined. Please check the card details or choose Pay on Fulfilment.',
            orderId: j.orderId,
            trackingToken: j.trackingToken,
          })
          setBusy(false)
          return
        }

        // Trigger simulated or live webhook confirmation for payment intent
        await fetch('/api/ordering/payments/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `evt_${j.payment.id}_succ`,
            type: 'payment_intent.succeeded',
            data: { object: { id: j.payment.id, metadata: { orderId: j.orderId } } },
          }),
        }).catch(() => {})
      }

      window.location.href = `/order/track/${j.trackingToken}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order placement failed')
    } finally {
      setBusy(false)
    }
  }

  const recoverSwitchToPayLater = async () => {
    if (!paymentFailure?.trackingToken) return
    // Proceed directly to tracking as customer will pay on fulfilment
    window.location.href = `/order/track/${paymentFailure.trackingToken}`
  }

  if (!data) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingWrap}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(37,99,235,0.2)',
              borderTopColor: '#5b45f5',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>{error || 'Loading restaurant menu…'}</span>
        </div>
      </main>
    )
  }

  const categories = (data.categories || []) as Cat[]

  return (
    <main className={styles.page}>
      {/* ── Top Hero ─────────────────────────────────────────── */}
      <div className={styles.heroWrap}>
        <header className={styles.hero}>
          <div>
            <div className={styles.brandEyebrow}>
              <span>●</span>
              <span>Direct Storefront · No Hidden Fees</span>
            </div>
            <h1 className={styles.storeTitle}>{data.location.name}</h1>
            <p className={styles.storeAddress}>
              📍 {data.location.address || 'Fresh handcrafted meals prepared to order'}
            </p>
          </div>

          <div className={styles.types}>
            <button
              className={`${styles.typeBtn} ${type === 'PICKUP' ? styles.typeActive : ''}`}
              onClick={() => setType('PICKUP')}
            >
              🛍️ Pickup
            </button>
            <button
              className={`${styles.typeBtn} ${type === 'DELIVERY' ? styles.typeActive : ''}`}
              onClick={() => setType('DELIVERY')}
            >
              🛵 Delivery
            </button>
            <button
              className={`${styles.typeBtn} ${type === 'DINE_IN' ? styles.typeActive : ''}`}
              onClick={() => setType('DINE_IN')}
            >
              🍽️ Table QR
            </button>
          </div>
        </header>
      </div>

      {/* ── Search Bar ───────────────────────────────────────── */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
        </span>
        <input
          className={styles.searchInput}
          placeholder="Search appetizers, mains, beverages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* ── Menu Categories ──────────────────────────────────── */}
      {categories.map((c) => {
        const shown = items.filter((i: any) => i.category === c.name)
        if (!shown.length) return null

        return (
          <section className={styles.categorySection} key={c.id}>
            <h2 className={styles.categoryTitle}>
              <span>🍴</span>
              <span>{c.name}</span>
            </h2>

            <div className={styles.grid}>
              {shown.map((i: any) => (
                <article className={styles.itemCard} key={i.id} onClick={() => openItemModal(i)}>
                  <div className={styles.itemThumb}>
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt={i.name} />
                    ) : (
                      <span>{i.isVeg ? '🥗' : '🥩'}</span>
                    )}
                  </div>

                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{i.name}</h3>
                    <p className={styles.itemDesc}>{i.description || 'Made fresh to order with quality ingredients'}</p>
                    <span className={styles.itemPrice}>{money(Number(i.price))}</span>
                  </div>

                  <button className={styles.addBtn} title="Add to cart">
                    +
                  </button>
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {/* ── Floating Cart Bar ────────────────────────────────── */}
      {count > 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`View cart with ${count} items, total ${money(subtotal)}`}
          className={styles.cartBar}
          onClick={() => setCheckout(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setCheckout(true)
            }
          }}
        >
          <div className={styles.cartBarCount}>
            <span className={styles.cartCountBadge}>{count}</span>
            <span>Items in cart</span>
          </div>
          <div className={styles.cartBarTotal}>
            <span>View Cart · {money(subtotal)}</span>
            <span>➔</span>
          </div>
        </div>
      )}

      {/* ── Item Modifier Modal ──────────────────────────────── */}
      {active && (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setActive(null)}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className={styles.modalTitle}>{active.name}</h2>
            <p className={styles.modalDesc}>{active.description}</p>

            {active.modifiers.map((group) => (
              <div className={styles.modGroup} key={group.id}>
                <div className={styles.modHeader}>
                  <span className={styles.modGroupName}>{group.name}</span>
                  <span className={styles.modBadge}>
                    {group.isRequired ? 'Required' : 'Optional'} ·{' '}
                    {group.maxSelect === 1 ? 'Pick 1' : `Up to ${group.maxSelect}`}
                  </span>
                </div>

                <div className={styles.optionsList}>
                  {group.options.map((opt) => {
                    const picked = options.includes(opt.id)
                    return (
                      <div
                        className={`${styles.optionRow} ${picked ? styles.optionPicked : ''}`}
                        key={opt.id}
                        onClick={() => toggleOption(group, opt.id)}
                      >
                        <div className={styles.optionCheck}>
                          {picked ? '✓' : ''}
                        </div>
                        <span className={styles.optionName}>{opt.name}</span>
                        {Number(opt.priceAdjustment) > 0 && (
                          <span className={styles.optionPrice}>
                            +{money(Number(opt.priceAdjustment))}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {error && <div className={styles.errorBanner}>{error}</div>}

            <button className={styles.primaryBtn} onClick={addToCart}>
              Add to Cart · {money(Number(active.price))}
            </button>
          </div>
        </div>
      )}

      {/* ── Checkout Drawer Modal ────────────────────────────── */}
      {checkout && (
        <div className={styles.overlay} onClick={() => setCheckout(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setCheckout(false)}
              aria-label="Close checkout drawer"
            >
              ✕
            </button>

            <h2 className={styles.modalTitle}>Your Order</h2>
            <p className={styles.modalDesc}>
              {type === 'PICKUP' ? '🛍️ In-Store Pickup' : type === 'DELIVERY' ? '🛵 Direct Delivery' : '🍽️ Dine-in Table Order'}
            </p>

            {/* Cart Items List */}
            {cart.map((c) => (
              <div className={styles.cartLine} key={c.key}>
                <div>
                  <div className={styles.cartLineName}>
                    {c.quantity} × {c.item.name}
                  </div>
                  {c.optionIds.length > 0 && (
                    <div className={styles.cartLineMods}>
                      {c.item.modifiers
                        .flatMap((g) => g.options)
                        .filter((o) => c.optionIds.includes(o.id))
                        .map((o) => o.name)
                        .join(', ')}
                    </div>
                  )}
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => setCart((v) => v.filter((x) => x.key !== c.key))}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Price Breakdown */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--color-separator, rgba(255,255,255,0.08))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary, rgba(255,255,255,0.6))', marginBottom: '6px' }}>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {type === 'DELIVERY' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary, rgba(255,255,255,0.6))', marginBottom: '6px' }}>
                  <span>Delivery Fee</span>
                  <span>{effectiveDeliveryFee === 0 ? 'FREE' : money(effectiveDeliveryFee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
                <span>Total</span>
                <span>{money(estimateTotal)}</span>
              </div>
            </div>

            {/* Checkout Form */}
            <div className={styles.checkoutForm}>
              <label className={styles.formLabel}>
                Full Name *
                <input
                  className={styles.formInput}
                  placeholder="e.g. Jane Doe"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </label>

              <label className={styles.formLabel}>
                Mobile Phone *
                <input
                  className={styles.formInput}
                  placeholder="e.g. (555) 000-1234"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </label>

              <label className={styles.formLabel}>
                Email (For receipt & tracking)
                <input
                  className={styles.formInput}
                  placeholder="e.g. jane@example.com"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </label>

              {type === 'DELIVERY' && (
                <>
                  <label className={styles.formLabel}>
                    Delivery Address *
                    <input
                      className={styles.formInput}
                      placeholder="Street address & Apt/Suite"
                      value={customer.addressLine1}
                      onChange={(e) => setCustomer({ ...customer, addressLine1: e.target.value })}
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                    <input
                      className={styles.formInput}
                      placeholder="City"
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    />
                    <input
                      className={styles.formInput}
                      placeholder="State"
                      value={customer.state}
                      onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                    />
                    <input
                      className={styles.formInput}
                      placeholder="Zip"
                      value={customer.postalCode}
                      onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                    />
                  </div>

                  {deliveryStatus && (
                    <div className={`${styles.distanceBadge} ${deliveryStatus.valid ? styles.distanceValid : styles.distanceInvalid}`}>
                      {deliveryStatus.valid
                        ? `✅ In delivery zone (~${deliveryStatus.distanceKm} km away)`
                        : `⚠️ ${deliveryStatus.error}`}
                    </div>
                  )}
                </>
              )}

              <label className={styles.formLabel}>
                Schedule for later (Optional)
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={customer.scheduledFor}
                  onChange={(e) => setCustomer({ ...customer, scheduledFor: e.target.value })}
                />
              </label>

              {/* ── Payment Method Selector ──────────────────────── */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary, rgba(255, 255, 255, 0.6))', marginTop: '10px' }}>
                  Payment Method
                </label>
                <div className={styles.paymentTabs}>
                  <button
                    type="button"
                    className={`${styles.paymentTabBtn} ${paymentMethod === 'CARD' ? styles.paymentTabActive : ''}`}
                    onClick={() => {
                      setPaymentMethod('CARD')
                      setPaymentFailure(null)
                    }}
                  >
                    <span>💳</span>
                    <span>Pay with Card</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.paymentTabBtn} ${paymentMethod === 'PAY_LATER' ? styles.paymentTabActive : ''}`}
                    onClick={() => {
                      setPaymentMethod('PAY_LATER')
                      setPaymentFailure(null)
                    }}
                  >
                    <span>💵</span>
                    <span>Pay Later</span>
                  </button>
                </div>
              </div>

              {/* ── Card Inputs (when Card selected) ─────────────── */}
              {paymentMethod === 'CARD' && (
                <div className={styles.cardBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                      Card Details
                    </span>
                  </div>
                  <input
                    className={styles.formInput}
                    placeholder="Card number (4242 •••• •••• 4242)"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input
                      className={styles.formInput}
                      placeholder="MM / YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    />
                    <input
                      className={styles.formInput}
                      placeholder="CVC"
                      value={cardDetails.cvc}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                    />
                    <input
                      className={styles.formInput}
                      placeholder="ZIP"
                      value={cardDetails.zip}
                      onChange={(e) => setCardDetails({ ...cardDetails, zip: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ── Payment Failure Recovery Banner ───────────────── */}
              {paymentFailure?.hasError && (
                <div className={styles.recoveryCard}>
                  <div className={styles.recoveryTitle}>
                    <span>⚠️</span>
                    <span>Payment Failed</span>
                  </div>
                  <p className={styles.recoveryText}>{paymentFailure.message}</p>
                  <div className={styles.recoveryBtnRow}>
                    <button
                      type="button"
                      className={styles.recoveryRetryBtn}
                      onClick={() => setPaymentFailure(null)}
                    >
                      🔄 Retry Card
                    </button>
                    <button
                      type="button"
                      className={styles.recoveryPayLaterBtn}
                      onClick={recoverSwitchToPayLater}
                    >
                      💵 Switch to Pay Later
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <button
              className={styles.primaryBtn}
              disabled={
                busy ||
                !customer.name.trim() ||
                !customer.phone.trim() ||
                !cart.length ||
                (type === 'DELIVERY' && deliveryStatus?.valid === false)
              }
              onClick={placeOrder}
            >
              {busy ? 'Submitting Order…' : `Place Order · ${money(estimateTotal)}`}
            </button>

            <small className={styles.disclaimer}>
              Encrypted SSL transaction · Powered by Prominentz
            </small>
          </div>
        </div>
      )}
    </main>
  )
}
