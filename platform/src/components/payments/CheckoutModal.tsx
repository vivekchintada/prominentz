'use client'

import React, { useState, useEffect } from 'react'

interface ModifierSelection {
  modifierName: string
  optionName: string
  priceDelta: number
}

interface OrderItem {
  id: string
  quantity: number
  priceAtOrder: number
  modifiers: any
  specialNote: string | null
  menuItem: {
    name: string
  }
}

interface OrderData {
  id: string
  tableId: string
  guestCount: number
  notes: string | null
  subtotal: number
  tax: number
  total: number
  status: string
  table: { name: string }
  items: OrderItem[]
  originalSubtotal?: number
  coupon?: {
    code: string
    discountType: string
    discountAmount: number
    discountVal?: number
    pointsCost?: number | null
    pointsReward?: number | null
  } | null
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  order: OrderData
  showToast: (message: string, variant?: any) => void
  initialCoupon?: {
    code: string
    discountType: string
    discountAmount: number
    discountVal?: number
    pointsCost?: number | null
    pointsReward?: number | null
  } | null
  onCouponChange?: (coupon: any | null) => void
}

interface SplitShare {
  guestRef: string
  subtotal: number
  tax: number
  total: number
  tip: number
  status: 'PENDING' | 'PAID'
  method: 'CASH' | 'CARD'
  stripePaymentIntentId?: string | null
}

export default function CheckoutModal({
  isOpen,
  onClose,
  onComplete,
  order,
  showToast,
  initialCoupon = null,
  onCouponChange,
}: CheckoutModalProps) {
  const [tipPercentage, setTipPercentage] = useState<number | 'custom'>(0)
  const [customTip, setCustomTip] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT' | 'QR'>('CASH')

  // Coupon state in checkout
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(initialCoupon || order.coupon || null)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Keep coupon in sync if initialCoupon changes
  useEffect(() => {
    if (initialCoupon !== undefined) {
      setAppliedCoupon(initialCoupon)
    }
  }, [initialCoupon])

  // Cash payment state
  const [cashReceived, setCashReceived] = useState<string>('')
  const [cashChange, setCashChange] = useState<number>(0)

  // Card payment state
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [isProcessingCard, setIsProcessingCard] = useState(false)

  // Dynamic QR payment state
  const [qrType, setQrType] = useState<'UPI' | 'STRIPE'>('UPI')
  const [isWaitingQrPayment, setIsWaitingQrPayment] = useState(false)

  // Split billing state
  const [splitCount, setSplitCount] = useState<number>(2)
  const [splitShares, setSplitShares] = useState<SplitShare[]>([])
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null)

  // Post-payment state
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptEmail, setReceiptEmail] = useState('')
  const [isSendingReceipt, setIsSendingReceipt] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  // Subtotal & Discount calculations
  const rawSubtotal = Number(order.originalSubtotal ?? order.subtotal)
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'PERCENTAGE'
      ? Number(((rawSubtotal * Number(appliedCoupon.discountAmount)) / 100).toFixed(2))
      : Math.min(Number(appliedCoupon.discountAmount), rawSubtotal)
    : 0

  const subtotal = Math.max(0, Number((rawSubtotal - couponDiscount).toFixed(2)))
  const tax = Number((subtotal * 0.10).toFixed(2))

  // Calculate tip and totals based on active settings
  const tipAmount = tipPercentage === 'custom' ? customTip : Number(((subtotal * tipPercentage) / 100).toFixed(2))
  const finalTotal = Number((subtotal + tax + tipAmount).toFixed(2))

  // Apply coupon in checkout modal
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: rawSubtotal,
          orderSubtotal: rawSubtotal,
          allowCashierOverride: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || data.message || 'Invalid coupon')
      }
      const disc = Number(data.discount ?? data.coupon?.calculatedDiscount ?? 0)
      const newCoupon = {
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountAmount: Number(data.coupon.discountAmount),
        discountVal: disc,
        pointsCost: data.coupon.pointsCost,
        pointsReward: data.coupon.pointsReward,
      }
      setAppliedCoupon(newCoupon)
      onCouponChange?.(newCoupon)
      setCouponInput('')
      showToast(data.message || `Coupon ${data.coupon.code} applied! -$${disc.toFixed(2)}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to apply coupon', 'error')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    onCouponChange?.(null)
    showToast('Coupon removed', 'info')
  }

  // Set up split shares when splitCount or order changes
  useEffect(() => {
    if (paymentMethod === 'SPLIT') {
      const sharesList: SplitShare[] = []
      const baseSubtotal = subtotal / splitCount
      const baseTax = tax / splitCount
      const baseTip = tipAmount / splitCount

      for (let i = 0; i < splitCount; i++) {
        sharesList.push({
          guestRef: `Guest ${i + 1}`,
          subtotal: baseSubtotal,
          tax: baseTax,
          tip: baseTip,
          total: baseSubtotal + baseTax + baseTip,
          status: 'PENDING',
          method: 'CARD',
        })
      }
      setSplitShares(sharesList)
      setActiveSplitIndex(0)
    } else {
      setSplitShares([])
      setActiveSplitIndex(null)
    }
  }, [paymentMethod, splitCount, tipPercentage, customTip, order])

  // Compute cash change on the fly
  useEffect(() => {
    const received = parseFloat(cashReceived) || 0
    if (received >= finalTotal) {
      setCashChange(received - finalTotal)
    } else {
      setCashChange(0)
    }
  }, [cashReceived, finalTotal])

  if (!isOpen) return null

  // Process normal single-checkout cash/card/QR payment
  const handleProcessSinglePayment = async (overrideMethod?: string) => {
    const activeMethod = overrideMethod || paymentMethod

    if (activeMethod === 'CASH') {
      const received = parseFloat(cashReceived) || 0
      if (received < finalTotal) {
        showToast('Cash tendered is less than the balance due', 'error')
        return
      }
    }

    setIsFinishing(true)
    try {
      let stripePaymentIntentId: string | null = null

      if (activeMethod === 'CARD') {
        setIsProcessingCard(true)
        const intentRes = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, amount: finalTotal }),
        })
        if (!intentRes.ok) throw new Error('Stripe PaymentIntent generation failed')
        const intentData = await intentRes.json()
        stripePaymentIntentId = intentData.paymentIntentId

        await new Promise((resolve) => setTimeout(resolve, 1500))
        setIsProcessingCard(false)
      }

      // Submit checkout payment
      const checkoutRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          method: activeMethod === 'QR' ? 'APPLE_PAY' : activeMethod,
          subtotal,
          tax,
          tip: tipAmount,
          total: finalTotal,
          cashReceived: activeMethod === 'CASH' ? parseFloat(cashReceived) : undefined,
          cashChange: activeMethod === 'CASH' ? cashChange : undefined,
          stripePaymentIntentId,
          couponCode: appliedCoupon?.code || undefined,
          couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        }),
      })

      if (!checkoutRes.ok) {
        const checkoutErr = await checkoutRes.json()
        throw new Error(checkoutErr.error || 'Checkout transaction failed')
      }

      const paymentRecord = await checkoutRes.json()
      setPaymentSuccess(paymentRecord)
      setIsWaitingQrPayment(false)

      showToast('🎉 Instant Payment Confirmed! Order Settled.', 'success')
      const receiptRes = await fetch(`/api/payments/${paymentRecord.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (receiptRes.ok) {
        const receiptRecord = await receiptRes.json()
        setReceiptUrl(receiptRecord.url)
      }
    } catch (err: any) {
      showToast(err.message || 'Checkout failed', 'error')
      setIsProcessingCard(false)
      setIsWaitingQrPayment(false)
    } finally {
      setIsFinishing(false)
    }
  }

  // Handle active split checkout action
  const handleProcessSplitIndex = async (index: number) => {
    const share = splitShares[index]
    try {
      let stripePaymentIntentId: string | null = null

      if (share.method === 'CARD') {
        const intentRes = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, amount: share.total }),
        })
        if (!intentRes.ok) throw new Error('Stripe intent failed for split share')
        const intentData = await intentRes.json()
        stripePaymentIntentId = intentData.paymentIntentId
      }

      setSplitShares((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, status: 'PAID', stripePaymentIntentId } : s))
      )

      showToast(`${share.guestRef} paid successfully!`, 'success')

      const nextPendingIdx = splitShares.findIndex((s, idx) => idx !== index && s.status === 'PENDING')
      if (nextPendingIdx !== -1) {
        setActiveSplitIndex(nextPendingIdx)
      } else {
        setActiveSplitIndex(null)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed split checkout', 'error')
    }
  }

  // Finalize split bill checkout
  const handleFinalizeSplitBill = async () => {
    setIsFinishing(true)
    try {
      const checkoutRes = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          splits: splitShares.map((s) => ({
            guestRef: s.guestRef,
            method: s.method,
            subtotal: s.subtotal,
            tip: s.tip,
            total: s.total,
            stripePaymentIntentId: s.stripePaymentIntentId,
          })),
        }),
      })

      if (!checkoutRes.ok) {
        const checkoutErr = await checkoutRes.json()
        throw new Error(checkoutErr.error || 'Failed to submit split bill checkout')
      }

      const paymentRecord = await checkoutRes.json()
      setPaymentSuccess(paymentRecord)

      showToast('Split bill finalized! Generating receipt...', 'success')
      const receiptRes = await fetch(`/api/payments/${paymentRecord.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (receiptRes.ok) {
        const receiptRecord = await receiptRes.json()
        setReceiptUrl(receiptRecord.url)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize splits', 'error')
    } finally {
      setIsFinishing(false)
    }
  }

  // Dispatch receipt
  const handleSendReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiptEmail.trim()) return

    setIsSendingReceipt(true)
    try {
      const res = await fetch(`/api/payments/${paymentSuccess.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentTo: receiptEmail }),
      })
      if (!res.ok) throw new Error('Failed to send receipt')
      showToast(`Receipt successfully sent to ${receiptEmail}!`, 'success')
      setReceiptEmail('')
    } catch (err: any) {
      showToast(err.message || 'Failed to send receipt', 'error')
    } finally {
      setIsSendingReceipt(false)
    }
  }

  const handleKeypadPress = (val: string) => {
    if (val === 'clear') {
      setCashReceived('')
    } else if (val === 'exact') {
      setCashReceived(finalTotal.toFixed(2))
    } else {
      setCashReceived((prev) => prev + val)
    }
  }

  // Dynamic QR Code generation payloads
  const upiIntentString = `upi://pay?pa=restoai@upi&pn=RestoAI&am=${finalTotal.toFixed(2)}&tn=Table-${order.table.name}-Order`
  const stripeQrString = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/create-intent?orderId=${order.id}`
  const currentQrPayload = qrType === 'UPI' ? upiIntentString : stripeQrString
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentQrPayload)}`

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="card card--elevated"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          position: 'relative',
        }}
      >
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
          <h3 className="text-xl font-bold">Checkout &mdash; Table {order.table.name}</h3>
          {!paymentSuccess && (
            <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ minWidth: 'auto', padding: 'var(--space-1) var(--space-2)' }}>✕</button>
          )}
        </div>

        {paymentSuccess ? (
          /* SUCCESS POPUP SCREEN */
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-in">
            <div style={{ fontSize: '4.5rem', animation: 'bounce 1s infinite' }}>🎉</div>
            <h2 className="text-2xl font-bold text-success">✅ Instant Payment Confirmed!</h2>
            <p className="text-secondary text-sm" style={{ maxWidth: '400px' }}>
              Payment of <strong>${finalTotal.toFixed(2)}</strong> received. Order settled & Table {order.table.name} marked EMPTY.
            </p>

            <div
              className="card"
              style={{
                width: '100%',
                background: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-4)',
                textAlign: 'left',
              }}
            >
              <div className="flex justify-between text-sm mb-1">
                <span>Payment ID:</span>
                <span className="font-semibold text-secondary" style={{ fontFamily: 'var(--font-mono)' }}>{paymentSuccess.id}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Items Subtotal:</span>
                <span>${rawSubtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm mb-1" style={{ color: '#16a34a' }}>
                  <span>Coupon Discount ({appliedCoupon.code}):</span>
                  <span className="font-bold">-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {appliedCoupon?.pointsCost ? (
                <div className="flex justify-between text-sm mb-1" style={{ color: '#eab308' }}>
                  <span>Loyalty Points Redeemed:</span>
                  <span className="font-bold">-{appliedCoupon.pointsCost} pts</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm mb-1">
                <span>Net Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Tax (10%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Gratuity (Tip):</span>
                <span className="text-success">+${tipAmount.toFixed(2)}</span>
              </div>
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Settled:</span>
                <span className="text-brand">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {receiptUrl ? (
              <div className="flex flex-col gap-4 w-full">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary btn--full"
                  style={{ gap: 'var(--space-2)' }}
                >
                  📄 View Printable Receipt
                </a>

                <form onSubmit={handleSendReceipt} className="flex gap-2 w-full">
                  <input
                    type="email"
                    placeholder="Enter customer email address..."
                    className="input"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="submit" disabled={isSendingReceipt} className="btn btn--primary">
                    {isSendingReceipt ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <div className="spinner" style={{ width: '14px', height: '14px' }} />
                Generating digital receipt...
              </div>
            )}

            <button
              onClick={() => {
                onComplete()
                onClose()
              }}
              className="btn btn--primary btn--full mt-2"
            >
              Done
            </button>
          </div>
        ) : (
          /* PAYMENT FORM PANEL */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Order Totals Summary with Coupon Integration */}
            <div className="card" style={{ background: 'var(--color-bg-raised)', padding: 'var(--space-4)' }}>
              <div className="flex justify-between text-sm text-secondary mb-1">
                <span>Items Subtotal:</span>
                <span>${rawSubtotal.toFixed(2)}</span>
              </div>

              {appliedCoupon ? (
                <div
                  className="flex justify-between items-center text-sm my-1"
                  style={{
                    color: '#16a34a',
                    background: 'rgba(34, 197, 94, 0.08)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">🎟️ Coupon ({appliedCoupon.code})</span>
                    {appliedCoupon.pointsCost ? (
                      <span className="text-xs font-semibold" style={{ color: '#eab308' }}>
                        ⭐ {appliedCoupon.pointsCost} pts
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">-${couponDiscount.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      title="Remove coupon"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        padding: '0 2px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 my-2" style={{ alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Have a coupon? e.g. SEAFOOD10"
                    className="input"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApplyCoupon()
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="btn btn--secondary btn--sm"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {couponLoading ? '...' : 'Apply Coupon'}
                  </button>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between text-sm text-secondary mb-1">
                  <span>Discounted Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm text-secondary mb-1">
                <span>Sales Tax (10%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm mb-1" style={{ color: '#16a34a' }}>
                  <span>Gratuity / Tip:</span>
                  <span className="font-semibold">+${tipAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Due:</span>
                <span className="text-brand" style={{ fontSize: '1.25rem' }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tip Selection - Optional with Customer Consent */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label" style={{ margin: 0 }}>Gratuity / Tip (Optional)</label>
                <span className="text-xs text-secondary">
                  {tipAmount > 0 ? `+$${tipAmount.toFixed(2)} added` : 'No tip selected'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipPercentage(0)
                    setCustomTip(0)
                  }}
                  className={`btn ${tipPercentage === 0 ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1.2, padding: 'var(--space-2)', fontSize: '12px', fontWeight: tipPercentage === 0 ? 800 : 500 }}
                >
                  No Tip (0%)
                </button>
                {[10, 15, 18, 20].map((percent) => (
                  <button
                    type="button"
                    key={percent}
                    onClick={() => {
                      setTipPercentage(percent)
                      setCustomTip(0)
                    }}
                    className={`btn ${tipPercentage === percent ? 'btn--primary' : 'btn--secondary'}`}
                    style={{ flex: 1, padding: 'var(--space-2)', fontSize: '12px', fontWeight: tipPercentage === percent ? 800 : 500 }}
                  >
                    {percent}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTipPercentage('custom')}
                  className={`btn ${tipPercentage === 'custom' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1, padding: 'var(--space-2)', fontSize: '12px', fontWeight: tipPercentage === 'custom' ? 800 : 500 }}
                >
                  Custom
                </button>
              </div>

              {tipPercentage === 'custom' && (
                <div className="mt-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="Enter tip amount ($)..."
                    value={customTip || ''}
                    onChange={(e) => setCustomTip(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <label className="label">Checkout Method</label>
              <div className="flex gap-2" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                {[
                  { key: 'CASH', label: '💵 Cash' },
                  { key: 'CARD', label: '💳 Card' },
                  { key: 'QR', label: '📲 Dynamic QR Payment' },
                  { key: 'SPLIT', label: '🔀 Split Bill' },
                ].map((meth) => (
                  <button
                    key={meth.key}
                    onClick={() => setPaymentMethod(meth.key as any)}
                    className={`btn ${paymentMethod === meth.key ? 'btn--primary' : 'btn--secondary'}`}
                    style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                  >
                    {meth.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DYNAMIC BILL PAYMENT QR CODE METHOD */}
            {paymentMethod === 'QR' && (
              <div className="flex flex-col items-center gap-4 py-2 animate-fade-in text-center">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setQrType('UPI')}
                    className={`btn btn--sm ${qrType === 'UPI' ? 'btn--primary' : 'btn--secondary'}`}
                  >
                    🇮🇳 Dynamic UPI QR (GPay / PhonePe / Paytm)
                  </button>
                  <button
                    onClick={() => setQrType('STRIPE')}
                    className={`btn btn--sm ${qrType === 'STRIPE' ? 'btn--primary' : 'btn--secondary'}`}
                  >
                    🌐 Global Digital Pay QR (Apple Pay / Card)
                  </button>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #4f46e5', boxShadow: '0 10px 25px rgba(79,70,229,0.15)' }}>
                  <img src={qrImageUrl} alt="Dynamic Bill Payment QR Code" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto' }} />
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginTop: '12px' }}>
                    ${finalTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {qrType === 'UPI' ? 'Scan with any UPI app to pay exact bill amount' : 'Scan to pay with Apple Pay / Credit Card'}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderColor: '#166534 transparent transparent transparent' }} />
                  <span>Listening for instant payment confirmation webhook...</span>
                </div>

                <button
                  onClick={() => handleProcessSinglePayment('QR')}
                  disabled={isFinishing}
                  className="btn btn--primary btn--full"
                  style={{ backgroundColor: '#059669', fontWeight: 700 }}
                >
                  ⚡ Simulate Customer Instant Payment Scan
                </button>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="flex gap-4 animate-fade-in">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label className="label">Amount Tendered</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-lg font-bold"
                    placeholder="$0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    style={{ textAlign: 'right', fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}
                  />

                  {parseFloat(cashReceived) >= finalTotal && (
                    <div
                      className="card"
                      style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid var(--color-success)',
                        padding: 'var(--space-3)',
                        marginTop: 'var(--space-2)',
                      }}
                    >
                      <div className="flex justify-between font-bold text-success">
                        <span>Change Due:</span>
                        <span>${cashChange.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    width: '200px',
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'clear'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className="btn btn--secondary"
                      style={{ padding: 'var(--space-2)', fontSize: '14px', height: '40px' }}
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    onClick={() => handleKeypadPress('exact')}
                    className="btn btn--secondary"
                    style={{ gridColumn: 'span 3', padding: '4px', fontSize: '11px', height: '32px' }}
                  >
                    Exact Amount (${finalTotal.toFixed(2)})
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                {isProcessingCard ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="spinner" style={{ width: '40px', height: '40px' }} />
                    <span className="font-semibold text-brand">Authorizing with Stripe Terminal...</span>
                    <span className="text-secondary text-xs">Simulating presentation of VISA ending in 4242</span>
                  </div>
                ) : (
                  <>
                    <label className="label">Swipe Card Simulator (Demo Mode)</label>
                    <div className="card flex flex-col gap-3" style={{ background: 'var(--color-bg-raised)', padding: 'var(--space-4)' }}>
                      <div>
                        <span className="text-xs text-secondary">Cardholder Name</span>
                        <input
                          type="text"
                          className="input mt-1"
                          placeholder="John Doe"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-secondary">Card Number</span>
                        <input
                          type="text"
                          className="input mt-1"
                          placeholder="•••• •••• •••• 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {paymentMethod === 'SPLIT' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <label className="label" style={{ marginBottom: 0 }}>Number of Guests</label>
                  <div className="flex gap-2 items-center">
                    {[2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => {
                          const alreadyPaid = splitShares.some((s) => s.status === 'PAID')
                          if (alreadyPaid) {
                            showToast('Cannot change split count after a guest has paid', 'error')
                            return
                          }
                          setSplitCount(cnt)
                        }}
                        className={`btn btn--sm ${splitCount === cnt ? 'btn--primary' : 'btn--secondary'}`}
                        style={{ padding: '6px 12px' }}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divider" style={{ margin: '4px 0' }} />

                <div className="flex flex-col gap-2">
                  {splitShares.map((share, index) => {
                    const isPaid = share.status === 'PAID'
                    const isActive = activeSplitIndex === index

                    return (
                      <div
                        key={index}
                        className="card flex justify-between items-center"
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          background: isPaid ? 'rgba(34,197,94,0.06)' : isActive ? 'var(--color-bg-raised)' : 'transparent',
                          border: isPaid ? '1px solid var(--color-success)' : isActive ? '1px solid var(--color-brand-500)' : '1px solid var(--color-border)',
                        }}
                      >
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{share.guestRef}</span>
                            {isPaid ? (
                              <span className="badge badge--success" style={{ padding: '2px 6px', fontSize: '10px' }}>Paid</span>
                            ) : (
                              <span className="badge badge--neutral" style={{ padding: '2px 6px', fontSize: '10px' }}>Pending</span>
                            )}
                          </div>
                          <div className="text-xs text-secondary mt-1">
                            Share Sub: ${share.subtotal.toFixed(2)} | Tip: ${share.tip.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          {isPaid ? (
                            <span className="font-semibold text-success font-mono">${share.total.toFixed(2)}</span>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <select
                                className="input"
                                value={share.method}
                                onChange={(e) => {
                                  const nextShares = [...splitShares]
                                  nextShares[index] = { ...share, method: e.target.value as any }
                                  setSplitShares(nextShares)
                                }}
                                style={{ height: '32px', padding: '0 6px', fontSize: '12px', width: '90px' }}
                              >
                                <option value="CARD">Card</option>
                                <option value="CASH">Cash</option>
                              </select>
                              <button
                                onClick={() => handleProcessSplitIndex(index)}
                                className="btn btn--primary btn--sm"
                                style={{ padding: '6px 12px' }}
                              >
                                Collect ${share.total.toFixed(2)}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Total Balance presentation and submit */}
            {paymentMethod !== 'QR' && (
              <div
                className="flex justify-between items-center"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-4)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <div>
                  <span className="text-xs text-secondary uppercase tracking-wider">Total Balance Due</span>
                  <div className="text-2xl font-bold text-brand">${finalTotal.toFixed(2)}</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={onClose} disabled={isFinishing || isProcessingCard} className="btn btn--secondary">
                    Cancel
                  </button>

                  {paymentMethod === 'SPLIT' ? (
                    <button
                      onClick={handleFinalizeSplitBill}
                      disabled={isFinishing || splitShares.some((s) => s.status === 'PENDING')}
                      className="btn btn--primary"
                    >
                      {isFinishing ? 'Saving...' : 'Finalize Splits'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleProcessSinglePayment()}
                      disabled={isFinishing || isProcessingCard}
                      className="btn btn--primary"
                    >
                      {isFinishing ? 'Authorizing...' : `Pay $${finalTotal.toFixed(2)}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
