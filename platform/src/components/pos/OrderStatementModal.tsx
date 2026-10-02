'use client'

import React, { useRef } from 'react'

interface OrderStatementModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
}

export default function OrderStatementModal({
  isOpen,
  onClose,
  order,
}: OrderStatementModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !order) return null

  const orderNum = order.orderNumber || `#${order.id?.slice(-5).toUpperCase()}`
  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date()
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Resolve dining type
  let diningType = 'Dine In'
  if (order.notes?.includes('Take Away')) diningType = 'Take Away'
  else if (order.notes?.includes('Delivery')) diningType = 'Delivery'
  else if (order.notes?.includes('Table')) diningType = 'Table'

  // Calculations
  const subtotal = Number(order.subtotal || 0)
  const tax = Number(order.tax || 0)
  const total = Number(order.total || 0)

  // Primary payment record if available
  const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null
  const tip = payment ? Number(payment.tip || 0) : 0
  const paymentMethod = payment?.method || 'CARD'
  const cashReceived = payment?.cashReceived ? Number(payment.cashReceived) : null
  const cashChange = payment?.cashChange ? Number(payment.cashChange) : null

  // Extract coupon info from order notes if present
  const couponMatch = order.notes?.match(/Coupon:\s*([A-Za-z0-9_-]+)(?:\s*\(-?\$?([\d.]+)\))?/i)
  const couponCode = couponMatch ? couponMatch[1] : null
  const couponDiscountAmount = couponMatch && couponMatch[2] ? parseFloat(couponMatch[2]) : null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Order Statement
            </h3>
            <span
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#16a34a',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              ✓ PAID & SETTLED
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '18px',
              fontWeight: 700,
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Printable Statement Content */}
        <div
          ref={printRef}
          style={{
            padding: '24px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Restaurant & Order Anchor */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {order.table?.location?.restaurant?.name || 'RESTO AI'}
            </h2>
            <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#64748b' }}>
              {order.table?.location?.name || 'Main Dining Hall'}
              {order.table?.location?.phone ? ` · Tel: ${order.table.location.phone}` : ''}
            </p>
            <div
              style={{
                marginTop: '10px',
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              Order {orderNum} · {diningType}
            </div>
          </div>

          {/* Meta Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '12px',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Date & Time</span>
              <strong style={{ color: '#1e293b' }}>{formattedDate}, {formattedTime}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Table / Location</span>
              <strong style={{ color: '#1e293b' }}>{order.table?.name || 'Quick Counter'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Server / Staff</span>
              <strong style={{ color: '#1e293b' }}>{order.server?.name || 'Staff'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Guest / Customer</span>
              <strong style={{ color: '#1e293b' }}>{order.customer?.name || 'Walk-in Guest'}</strong>
            </div>
          </div>

          {/* Itemized Order Items */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '6px',
                marginBottom: '8px',
              }}
            >
              <span>Items & Description</span>
              <span>Amount</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(order.items || []).map((item: any) => {
                const itemName = item.menuItem?.name || item.name || 'Dish'
                const itemPrice = Number(item.unitPrice || item.priceAtOrder || item.menuItem?.price || 0)
                const lineTotal = itemPrice * Number(item.quantity || 1)

                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {item.quantity}x {itemName}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          + {item.modifiers.map((m: any) => m.optionName || m.name).join(', ')}
                        </div>
                      )}
                      {item.specialNote && (
                        <div style={{ fontSize: '11px', color: '#ea580c', fontStyle: 'italic', marginTop: '1px' }}>
                          Note: "{item.specialNote}"
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                      ${lineTotal.toFixed(2)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subtotal / Tax / Tip Breakdown */}
          <div
            style={{
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>${(subtotal + (couponDiscountAmount || 0)).toFixed(2)}</span>
            </div>
            {couponCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Coupon Discount ({couponCode})</span>
                <span style={{ fontWeight: 600 }}>{couponDiscountAmount ? `-$${couponDiscountAmount.toFixed(2)}` : 'Applied'}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Tax (10%)</span>
              <span style={{ fontWeight: 600 }}>${tax.toFixed(2)}</span>
            </div>
            {tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Tip</span>
                <span style={{ fontWeight: 600 }}>+${tip.toFixed(2)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 900,
                color: '#0f172a',
                borderTop: '1.5px solid #0f172a',
                paddingTop: '8px',
                marginTop: '4px',
              }}
            >
              <span>TOTAL PAID</span>
              <span style={{ color: '#16a34a' }}>${(total + tip).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Details Pill Card */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#15803d', fontWeight: 700 }}>
                Payment Method: {paymentMethod}
              </span>
              <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '11px' }}>
                ✓ SETTLED
              </span>
            </div>
            {payment && (
              <div style={{ fontSize: '11px', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                <span>Transaction Ref:</span>
                <span style={{ fontFamily: 'monospace' }}>#{payment.id.slice(-8).toUpperCase()}</span>
              </div>
            )}
            {cashReceived !== null && cashReceived > 0 && (
              <div style={{ fontSize: '11px', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash Received / Change:</span>
                <span>${cashReceived.toFixed(2)} / ${Number(cashChange || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Note to cashier / customer */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
            Thank you for dining with us! This order is completed and paid in full.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            gap: '10px',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#5b45f5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            🖨️ Print Statement / Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: '#e2e8f0',
              color: '#334155',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
