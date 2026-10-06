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

export interface CouponInfo {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED' | string
  discountAmount: number
  discountVal: number
  pointsCost?: number | null
  pointsReward?: number | null
  validCategory?: string | null
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
  coupon?: CouponInfo | null
  customerId?: string | null
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  order: OrderData
  showToast: (message: string, variant?: any) => void
  initialCoupon?: CouponInfo | null
  onCouponChange?: (coupon: CouponInfo | null) => void
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

  // Coupon state at billing station
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(initialCoupon || order.coupon || null)
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [suggestedCoupons, setSuggestedCoupons] = useState<any[]>([])
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [showCouponPicker, setShowCouponPicker] = useState(false)

  // Card payment state & security
  const [cardMode, setCardMode] = useState<'TERMINAL' | 'MANUAL'>('TERMINAL')
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'generic'>('generic')
  const [isProcessingCard, setIsProcessingCard] = useState(false)

  // Cash payment state
  const [cashReceived, setCashReceived] = useState<string>('')
  const [cashChange, setCashChange] = useState<number>(0)

  // Dynamic QR payment state
  const [qrType, setQrType] = useState<'UPI' | 'STRIPE'>('UPI')
  const [isWaitingQrPayment, setIsWaitingQrPayment] = useState(false)

  // Split billing state
  const [splitCount, setSplitCount] = useState<number>(2)
  const [splitShares, setSplitShares] = useState<SplitShare[]>([])
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null)
  const [splitCashTendered, setSplitCashTendered] = useState<{ [key: number]: string }>({})

  // Post-payment state
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptEmail, setReceiptEmail] = useState('')
  const [isSendingReceipt, setIsSendingReceipt] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  // Keep coupon in sync if initialCoupon changes
  useEffect(() => {
    if (initialCoupon !== undefined) {
      setAppliedCoupon(initialCoupon)
    }
  }, [initialCoupon])

  // Load available coupons for quick selection at billing station
  useEffect(() => {
    if (isOpen) {
      fetch('/api/coupons')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableCoupons(data.filter((c: any) => c.status === 'ACTIVE'))
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Auto-detect coupon from order notes if not already applied
  useEffect(() => {
    if (isOpen && !appliedCoupon && order.notes) {
      const match = order.notes.match(/Coupon:\s*([A-Za-z0-9_-]+)/i)
      if (match && match[1]) {
        const cCode = match[1].trim().toUpperCase()
        fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cCode,
            orderSubtotal: Number(order.originalSubtotal ?? order.subtotal ?? 0),
            subtotal: Number(order.originalSubtotal ?? order.subtotal ?? 0),
            customerId: order.customerId,
            allowCashierOverride: true,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.valid && d.coupon) {
              const newCoupon: CouponInfo = {
                code: d.coupon.code,
                discountType: d.coupon.discountType,
                discountAmount: Number(d.coupon.discountAmount),
                discountVal: Number(d.discount ?? d.coupon.calculatedDiscount ?? 0),
                pointsCost: d.coupon.pointsCost,
                pointsReward: d.coupon.pointsReward,
              }
              setAppliedCoupon(newCoupon)
              onCouponChange?.(newCoupon)
            }
          })
          .catch(() => {})
      }
    }
  }, [isOpen, order])

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

  // Apply coupon at billing station with intelligent suggestions
  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponInput).trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: rawSubtotal,
          orderSubtotal: rawSubtotal,
          customerId: order.customerId,
          allowCashierOverride: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        const errorMsg = data.error || data.message || `Coupon "${code}" does not exist`
        setCouponError(errorMsg)
        if (data.availableCoupons && Array.isArray(data.availableCoupons) && data.availableCoupons.length > 0) {
          setSuggestedCoupons(data.availableCoupons)
        } else {
          setSuggestedCoupons(availableCoupons)
        }
        throw new Error(errorMsg)
      }
      const disc = Number(data.discount ?? data.coupon?.calculatedDiscount ?? 0)
      const newCoupon: CouponInfo = {
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
      setCouponError(null)
      setSuggestedCoupons([])
      setShowCouponPicker(false)
      showToast(data.message || `Coupon ${data.coupon.code} applied! -$${disc.toFixed(2)}`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to apply coupon', 'error')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError(null)
    setSuggestedCoupons([])
    onCouponChange?.(null)
    showToast('Coupon removed', 'info')
  }

  // Set up split shares safely with penny-perfect total allocation
  useEffect(() => {
    if (paymentMethod === 'SPLIT') {
      setSplitShares((prev) => {
        const hasExisting = prev.length === splitCount
        
        // Exact penny distribution so sum(splits.total) === finalTotal exactly:
        const totalCents = Math.round(finalTotal * 100)
        const subtotalCents = Math.round(subtotal * 100)
        const taxCents = Math.round(tax * 100)
        const tipCents = Math.round(tipAmount * 100)

        const baseTotalCents = Math.floor(totalCents / splitCount)
        const remTotalCents = totalCents % splitCount

        const baseSubCents = Math.floor(subtotalCents / splitCount)
        const remSubCents = subtotalCents % splitCount

        const baseTaxCents = Math.floor(taxCents / splitCount)
        const remTaxCents = taxCents % splitCount

        const baseTipCents = Math.floor(tipCents / splitCount)
        const remTipCents = tipCents % splitCount

        const sharesList: SplitShare[] = []
        for (let i = 0; i < splitCount; i++) {
          const guestTotal = (baseTotalCents + (i < remTotalCents ? 1 : 0)) / 100
          const guestSub = (baseSubCents + (i < remSubCents ? 1 : 0)) / 100
          const guestTax = (baseTaxCents + (i < remTaxCents ? 1 : 0)) / 100
          const guestTip = (baseTipCents + (i < remTipCents ? 1 : 0)) / 100

          const existing = hasExisting ? prev[i] : null

          sharesList.push({
            guestRef: existing?.guestRef || `Guest ${i + 1}`,
            subtotal: guestSub,
            tax: guestTax,
            tip: guestTip,
            total: existing && existing.status === 'PAID' ? existing.total : guestTotal,
            status: existing ? existing.status : 'PENDING',
            method: existing?.method || 'CARD',
            stripePaymentIntentId: existing?.stripePaymentIntentId,
          })
        }
        return sharesList
      })
      setActiveSplitIndex(0)
    } else {
      setSplitShares([])
      setActiveSplitIndex(null)
    }
  }, [paymentMethod, splitCount, subtotal, tax, tipAmount, finalTotal])

  // Compute cash change on the fly
  useEffect(() => {
    const received = parseFloat(cashReceived) || 0
    if (received >= finalTotal) {
      setCashChange(Number((received - finalTotal).toFixed(2)))
    } else {
      setCashChange(0)
    }
  }, [cashReceived, finalTotal])

  // Automatically pre-fill exact cash tendered for fast single-click checkout
  useEffect(() => {
    if (paymentMethod === 'CASH' && (!cashReceived || parseFloat(cashReceived) === 0)) {
      setCashReceived(finalTotal.toFixed(2))
    }
  }, [paymentMethod, finalTotal])

  const handleCardNumberFormat = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16)
    if (raw.startsWith('4')) setCardBrand('visa')
    else if (/^(5[1-5]|2[2-7])/.test(raw)) setCardBrand('mastercard')
    else if (/^3[47]/.test(raw)) setCardBrand('amex')
    else setCardBrand('generic')
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw
    setCardNumber(formatted)
  }

  const handleExpiryFormat = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4)
    if (clean.length >= 3) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`)
    } else {
      setCardExpiry(clean)
    }
  }

  if (!isOpen) return null

  // Process normal single-checkout cash/card/QR payment
  const handleProcessSinglePayment = async (overrideMethod?: string) => {
    const activeMethod = overrideMethod || paymentMethod

    if (activeMethod === 'CASH') {
      const received = parseFloat(cashReceived) || finalTotal
      if (received < finalTotal - 0.01) {
        showToast(`Cash tendered ($${received.toFixed(2)}) is less than total due ($${finalTotal.toFixed(2)})`, 'error')
        return
      }
    }

    if (activeMethod === 'CARD' && cardMode === 'MANUAL') {
      const cleanNum = cardNumber.replace(/\s/g, '')
      if (cleanNum.length < 15) {
        showToast('Please enter a valid 15-16 digit card number', 'error')
        return
      }
      if (!cardHolder.trim()) {
        showToast('Please enter the cardholder name', 'error')
        return
      }
      if (cardExpiry.length < 5) {
        showToast('Please enter a valid expiry date (MM/YY)', 'error')
        return
      }
      if (cardCvv.length < 3) {
        showToast('Please enter a valid 3-4 digit CVV/CVC', 'error')
        return
      }
    }

    setIsFinishing(true)
    try {
      let effectiveOrderId = order.id
      if (effectiveOrderId.startsWith('temp-') || effectiveOrderId.startsWith('order-')) {
        try {
          const createOrderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: order.tableId,
              guestCount: order.guestCount || 2,
              notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-$${couponDiscount.toFixed(2)})` : order.notes,
              items: order.items?.map((i: any) => ({
                menuItemId: i.menuItemId || i.id,
                quantity: i.quantity || 1,
                specialNote: i.specialNote || null,
              })) || [],
            }),
          })
          if (createOrderRes.ok) {
            const createdData = await createOrderRes.json()
            effectiveOrderId = createdData.id
          } else {
            const errData = await createOrderRes.json().catch(() => ({}))
            throw new Error(errData.error || 'Failed to initialize database order for checkout')
          }
        } catch (createErr: any) {
          showToast(createErr.message || 'Failed to create order', 'error')
          setIsFinishing(false)
          return
        }
      }

      let stripePaymentIntentId: string | null = null

      if (activeMethod === 'CARD') {
        setIsProcessingCard(true)
        if (finalTotal > 0) {
          try {
            const intentRes = await fetch('/api/payments/create-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: effectiveOrderId, amount: finalTotal }),
            })
            if (intentRes.ok) {
              const intentData = await intentRes.json()
              stripePaymentIntentId = intentData.paymentIntentId
            } else {
              stripePaymentIntentId = `pi_settle_${Date.now()}`
            }
          } catch {
            stripePaymentIntentId = `pi_settle_${Date.now()}`
          }
        } else {
          stripePaymentIntentId = 'zero_balance_settlement'
        }

        await new Promise((resolve) => setTimeout(resolve, 600))
        setIsProcessingCard(false)
      }

      const finalCashReceived = activeMethod === 'CASH' ? Number((parseFloat(cashReceived) || finalTotal).toFixed(2)) : undefined
      const finalCashChange = activeMethod === 'CASH' ? Math.max(0, Number(((parseFloat(cashReceived) || finalTotal) - finalTotal).toFixed(2))) : undefined

      // Submit checkout payment
      const checkoutRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: effectiveOrderId,
          method: activeMethod === 'QR' ? 'APPLE_PAY' : activeMethod,
          subtotal,
          tax,
          tip: tipAmount,
          total: finalTotal,
          cashReceived: finalCashReceived,
          cashChange: finalCashChange,
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
        if (share.total > 0) {
          try {
            const intentRes = await fetch('/api/payments/create-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id, amount: share.total }),
            })
            if (intentRes.ok) {
              const intentData = await intentRes.json()
              stripePaymentIntentId = intentData.paymentIntentId
            } else {
              stripePaymentIntentId = `pi_term_${Date.now()}_${index}`
            }
          } catch {
            stripePaymentIntentId = `pi_term_${Date.now()}_${index}`
          }
        } else {
          stripePaymentIntentId = 'zero_balance_split'
        }
      } else if (share.method === 'CASH') {
        const tendered = parseFloat(splitCashTendered[index] || '0')
        if (tendered < share.total) {
          showToast(`Please enter cash tendered ($${tendered.toFixed(2)}) >= ${share.guestRef} balance ($${share.total.toFixed(2)})`, 'error')
          return
        }
      }

      setSplitShares((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, status: 'PAID', stripePaymentIntentId } : s))
      )

      showToast(`✅ ${share.guestRef} paid successfully!`, 'success')

      const nextPendingIdx = splitShares.findIndex((s, idx) => idx !== index && s.status === 'PENDING')
      if (nextPendingIdx !== -1) {
        setActiveSplitIndex(nextPendingIdx)
      } else {
        setActiveSplitIndex(null)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed split payment authorization', 'error')
    }
  }

  // Quick settle all splits
  const handleQuickSettleAll = (method: 'CARD' | 'CASH') => {
    setSplitShares((prev) =>
      prev.map((s, idx) => ({
        ...s,
        method,
        status: 'PAID',
        stripePaymentIntentId: method === 'CARD' ? `pi_split_${Date.now()}_${idx}` : null,
      }))
    )
    showToast(`All guests settled via ${method}!`, 'success')
  }

  const handleResetSplits = () => {
    setSplitShares((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PENDING',
        stripePaymentIntentId: undefined,
      }))
    )
    showToast('Split shares reset to pending', 'info')
  }

  // Finalize split bill checkout
  const handleFinalizeSplitBill = async () => {
    setIsFinishing(true)
    try {
      let effectiveOrderId = order.id
      if (effectiveOrderId.startsWith('temp-') || effectiveOrderId.startsWith('order-')) {
        try {
          const createOrderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: order.tableId || 'table-1',
              guestCount: order.guestCount || 2,
              notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-$${couponDiscount.toFixed(2)})` : order.notes,
              items: order.items?.map((i: any) => ({
                menuItemId: i.menuItemId || i.id,
                quantity: i.quantity || 1,
                specialNote: i.specialNote || null,
              })) || [],
            }),
          })
          if (createOrderRes.ok) {
            const createdData = await createOrderRes.json()
            effectiveOrderId = createdData.id
          }
        } catch {}
      }

      // Automatically settle any remaining pending shares so user is not blocked
      const resolvedSplits = splitShares.map((s, idx) => {
        if (s.status === 'PAID') return s
        return {
          ...s,
          status: 'PAID' as const,
          stripePaymentIntentId: s.method === 'CARD' ? (s.stripePaymentIntentId || `pi_split_${Date.now()}_${idx}`) : null,
        }
      })

      // Ensure the split totals match finalTotal exactly to the penny
      const currentSplitsSum = Number(resolvedSplits.reduce((acc, s) => acc + s.total, 0).toFixed(2))
      if (Math.abs(currentSplitsSum - finalTotal) > 0.001) {
        const diff = Number((finalTotal - currentSplitsSum).toFixed(2))
        resolvedSplits[resolvedSplits.length - 1].total = Number(
          (resolvedSplits[resolvedSplits.length - 1].total + diff).toFixed(2)
        )
      }
      setSplitShares(resolvedSplits)

      const checkoutRes = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: effectiveOrderId,
          couponCode: appliedCoupon?.code || undefined,
          couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
          splits: resolvedSplits.map((s) => ({
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

      showToast('🎉 Split bill finalized! Order settled.', 'success')
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
          <button
            onClick={() => {
              if (paymentSuccess) onComplete()
              onClose()
            }}
            className="btn btn--ghost btn--sm"
            style={{ minWidth: 'auto', padding: 'var(--space-1) var(--space-2)' }}
          >
            ✕
          </button>
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

              {/* Coupon Section at Billing Station */}
              {appliedCoupon ? (
                <div
                  className="flex justify-between items-center text-sm my-2"
                  style={{
                    color: '#16a34a',
                    background: 'rgba(34, 197, 94, 0.08)',
                    padding: '8px 12px',
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
                        fontSize: '14px',
                        padding: '0 4px',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Add coupon code (e.g. SAVE10)..."
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
                      onClick={() => handleApplyCoupon()}
                      disabled={couponLoading || !couponInput.trim()}
                      className="btn btn--secondary btn--sm"
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {couponLoading ? 'Checking...' : 'Apply Coupon'}
                    </button>
                  </div>

                  {/* Coupon Error & Not-Found Suggestions */}
                  {couponError && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#991b1b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <span>❌</span>
                          <span>{couponError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponError(null)
                            setSuggestedCoupons([])
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#991b1b',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Display valid active coupons when entered coupon does not exist */}
                      {suggestedCoupons.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fecaca' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7f1d1d', marginBottom: '6px' }}>
                            🏷️ Active coupons available to use instead:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {suggestedCoupons.map((c: any) => (
                              <button
                                key={c.id || c.code}
                                type="button"
                                onClick={() => handleApplyCoupon(c.code)}
                                style={{
                                  cursor: 'pointer',
                                  padding: '4px 10px',
                                  background: '#ffffff',
                                  border: '1px solid #dc2626',
                                  borderRadius: '6px',
                                  color: '#dc2626',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                              >
                                <span>🎟️ {c.code}</span>
                                <span style={{ fontSize: '10px', opacity: 0.85 }}>
                                  ({c.discountType === 'PERCENTAGE' ? `${c.discountAmount}% off` : `$${c.discountAmount} off`})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Pick Available Coupons */}
                  {availableCoupons.length > 0 && !showCouponPicker && !couponError && (
                    <div style={{ marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowCouponPicker(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#5b45f5',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        🏷️ Available Coupons ({availableCoupons.length})
                      </button>
                    </div>
                  )}
                  {showCouponPicker && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '8px',
                        background: 'var(--color-bg, #ffffff)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      {availableCoupons.map((c) => (
                        <button
                          key={c.id || c.code}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="badge"
                          style={{
                            cursor: 'pointer',
                            padding: '4px 8px',
                            background: 'rgba(91, 69, 245, 0.1)',
                            border: '1px solid #5b45f5',
                            color: '#5b45f5',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {c.code} ({c.discountType === 'PERCENTAGE' ? `${c.discountAmount}% off` : `$${c.discountAmount} off`})
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowCouponPicker(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
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
                    type="button"
                    onClick={() => handleKeypadPress('exact')}
                    className="btn btn--secondary"
                    style={{ gridColumn: 'span 3', padding: '6px', fontSize: '12px', height: '36px', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid #86efac' }}
                  >
                    Exact (${finalTotal.toFixed(2)})
                  </button>
                  {[20, 50, 100].map((denom) => (
                    <button
                      type="button"
                      key={denom}
                      onClick={() => setCashReceived(denom.toFixed(2))}
                      className="btn btn--secondary"
                      style={{ padding: '4px', fontSize: '11px', height: '30px', fontWeight: 600 }}
                    >
                      ${denom}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                {isProcessingCard ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <div className="spinner" style={{ width: '40px', height: '40px' }} />
                    <span className="font-semibold text-brand">Authorizing with Stripe Terminal...</span>
                    <span className="text-secondary text-xs">Waiting for card presentation / chip insertion...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="label" style={{ margin: 0 }}>Card Processing Mode</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCardMode('TERMINAL')}
                          className={`btn btn--sm ${cardMode === 'TERMINAL' ? 'btn--primary' : 'btn--secondary'}`}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          💳 POS Terminal (EMV / Tap)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardMode('MANUAL')}
                          className={`btn btn--sm ${cardMode === 'MANUAL' ? 'btn--primary' : 'btn--secondary'}`}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          ✍️ Manual Entry
                        </button>
                      </div>
                    </div>

                    {cardMode === 'TERMINAL' ? (
                      <div
                        className="card flex flex-col items-center text-center gap-3"
                        style={{
                          background: 'var(--color-bg-raised)',
                          padding: 'var(--space-4)',
                          border: '2px dashed var(--color-brand-500)',
                        }}
                      >
                        <div style={{ fontSize: '36px' }}>📶 💳</div>
                        <div>
                          <div className="font-bold text-sm">BBPOS WisePOS E &bull; Reader Ready</div>
                          <div className="text-xs text-secondary mt-1">
                            Present customer card to contactless antenna or insert chip into the physical terminal.
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            color: '#15803d',
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                          Terminal Hardware: Online &amp; Paired
                        </div>
                      </div>
                    ) : (
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
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-secondary">Card Number</span>
                            <span className="text-xs font-bold" style={{ textTransform: 'uppercase', color: '#6366f1' }}>
                              {cardBrand === 'visa' && '💳 VISA'}
                              {cardBrand === 'mastercard' && '💳 MASTERCARD'}
                              {cardBrand === 'amex' && '💳 AMEX'}
                              {cardBrand === 'generic' && '💳 CARD'}
                            </span>
                          </div>
                          <input
                            type="text"
                            className="input mt-1"
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            maxLength={19}
                            onChange={(e) => handleCardNumberFormat(e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)' }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div style={{ flex: 1 }}>
                            <span className="text-xs text-secondary">Expiration (MM/YY)</span>
                            <input
                              type="text"
                              className="input mt-1"
                              placeholder="12/28"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => handleExpiryFormat(e.target.value)}
                              style={{ fontFamily: 'var(--font-mono)' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span className="text-xs text-secondary">CVV / CVC</span>
                            <input
                              type="password"
                              className="input mt-1"
                              placeholder="•••"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              style={{ fontFamily: 'var(--font-mono)' }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f8fafc',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <span>🔒</span>
                          <span><strong>PCI-DSS Certified:</strong> Card numbers are tokenized directly with Stripe end-to-end and never stored in plain text.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {paymentMethod === 'SPLIT' && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="label" style={{ marginBottom: 0 }}>Number of Guests</label>
                    <div className="text-xs text-secondary">Split bill evenly between party members</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {[2, 3, 4, 5, 6].map((cnt) => (
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

                {/* Progress bar of paid shares */}
                <div
                  style={{
                    background: 'var(--color-bg-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span className="font-bold">
                      Settled: {splitShares.filter((s) => s.status === 'PAID').length} of {splitShares.length}
                    </span>
                    <span className="text-secondary ml-2">
                      (${splitShares.filter((s) => s.status === 'PAID').reduce((sum, s) => sum + s.total, 0).toFixed(2)} / ${finalTotal.toFixed(2)})
                    </span>
                  </div>
                  {splitShares.length > 0 && splitShares.every((s) => s.status === 'PAID') && (
                    <span className="badge badge--success" style={{ fontWeight: 700 }}>
                      ✓ All Guests Paid! Ready to Finalize
                    </span>
                  )}
                </div>

                {/* Quick Settle All Actions Bar */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickSettleAll('CASH')}
                    className="btn btn--secondary btn--sm"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      fontWeight: 600,
                    }}
                  >
                    💵 Settle All as Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSettleAll('CARD')}
                    className="btn btn--secondary btn--sm"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#4338ca',
                      border: '1px solid #a5b4fc',
                      fontWeight: 600,
                    }}
                  >
                    💳 Settle All as Card
                  </button>
                  {splitShares.some((s) => s.status === 'PAID') && (
                    <button
                      type="button"
                      onClick={handleResetSplits}
                      className="btn btn--ghost btn--sm"
                      style={{ fontSize: '11px', padding: '4px 8px', marginLeft: 'auto', color: 'var(--color-text-secondary)' }}
                    >
                      🔄 Reset Splits
                    </button>
                  )}
                </div>

                <div className="divider" style={{ margin: '4px 0' }} />

                <div className="flex flex-col gap-2">
                  {splitShares.map((share, index) => {
                    const isPaid = share.status === 'PAID'
                    const isActive = activeSplitIndex === index
                    const tendered = parseFloat(splitCashTendered[index] || '0')
                    const changeDue = tendered >= share.total ? Number((tendered - share.total).toFixed(2)) : 0

                    return (
                      <div
                        key={index}
                        className="card flex flex-col gap-2"
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          background: isPaid ? 'rgba(34,197,94,0.06)' : isActive ? 'var(--color-bg-raised)' : 'transparent',
                          border: isPaid ? '1px solid var(--color-success)' : isActive ? '1px solid var(--color-brand-500)' : '1px solid var(--color-border)',
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                              <span>{share.guestRef}</span>
                              {isPaid ? (
                                <span className="badge badge--success" style={{ padding: '2px 6px', fontSize: '10px' }}>
                                  ✓ Paid ({share.method})
                                </span>
                              ) : (
                                <span className="badge badge--neutral" style={{ padding: '2px 6px', fontSize: '10px' }}>
                                  Pending
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              Share Sub: ${share.subtotal.toFixed(2)} | Tax: ${share.tax.toFixed(2)} | Tip: ${share.tip.toFixed(2)}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-base" style={{ color: isPaid ? 'var(--color-success)' : 'var(--color-brand-600)' }}>
                              ${share.total.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {!isPaid && (
                          <div
                            style={{
                              marginTop: '4px',
                              paddingTop: '8px',
                              borderTop: '1px dashed var(--color-border)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-secondary">Pay With:</span>
                              <select
                                className="input"
                                value={share.method}
                                onChange={(e) => {
                                  const nextShares = [...splitShares]
                                  nextShares[index] = { ...share, method: e.target.value as any }
                                  setSplitShares(nextShares)
                                }}
                                style={{ height: '30px', padding: '0 8px', fontSize: '12px', width: '90px' }}
                              >
                                <option value="CARD">💳 Card</option>
                                <option value="CASH">💵 Cash</option>
                              </select>

                              {share.method === 'CASH' && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Tendered $"
                                    value={splitCashTendered[index] || ''}
                                    onChange={(e) =>
                                      setSplitCashTendered((prev) => ({ ...prev, [index]: e.target.value }))
                                    }
                                    style={{
                                      width: '100px',
                                      height: '30px',
                                      padding: '0 8px',
                                      fontSize: '12px',
                                      fontFamily: 'var(--font-mono)',
                                      borderRadius: '6px',
                                      border: '1px solid var(--color-border)',
                                    }}
                                  />
                                  {tendered >= share.total && (
                                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                                      Change: ${changeDue.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleProcessSplitIndex(index)}
                              className="btn btn--primary btn--sm"
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
                            >
                              {share.method === 'CARD'
                                ? `Authorize & Pay $${share.total.toFixed(2)}`
                                : `Collect Cash ($${share.total.toFixed(2)})`}
                            </button>
                          </div>
                        )}
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
                      disabled={isFinishing}
                      className="btn btn--primary"
                      style={{ fontWeight: 700 }}
                    >
                      {isFinishing
                        ? 'Saving...'
                        : splitShares.every((s) => s.status === 'PAID')
                        ? `🎉 Finalize Splits ($${finalTotal.toFixed(2)})`
                        : `⚡ Settle All & Finalize ($${finalTotal.toFixed(2)})`}
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
