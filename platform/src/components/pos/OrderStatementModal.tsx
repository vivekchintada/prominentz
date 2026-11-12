'use client'

import React, { useRef } from 'react'
import PosIcon from './PosIcon'
import { useMoney } from '@/components/providers/CurrencyProvider'

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
  const { money } = useMoney()
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
  // The rate actually charged on this order (items can carry their own rates).
  const taxRateLabel = subtotal > 0 ? `${Number(((tax / subtotal) * 100).toFixed(2))}%` : '0%'

  // Primary payment record if available
  const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null
  const tip = payment ? Number(payment.tip || 0) : 0
  const paymentMethod = payment?.method || 'CARD'
  const cashReceived = payment?.cashReceived ? Number(payment.cashReceived) : null
  const cashChange = payment?.cashChange ? Number(payment.cashChange) : null


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
          backgroundColor: 'var(--color-bg-card)',
          color: 'var(--color-text-primary)',
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
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-bg-card-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}><PosIcon name="file" /></span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Order Statement
            </h3>
            <span
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--color-success)',
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
              color: 'var(--color-text-secondary)',
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
          <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--color-border)', paddingBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {order.table?.location?.restaurant?.name || 'RESTO AI'}
            </h2>
            <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {order.table?.location?.name || 'Main Dining Hall'}
              {order.table?.location?.phone ? ` · Tel: ${order.table.location.phone}` : ''}
            </p>
            <div
              style={{
                marginTop: '10px',
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-input)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
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
              backgroundColor: 'var(--color-bg-card-hover)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>Date & Time</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{formattedDate}, {formattedTime}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>Table / Location</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{order.table?.name || 'Quick Counter'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>Server / Staff</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{order.server?.name || 'Staff'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '11px' }}>Guest / Customer</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{order.customer?.name || 'Walk-in Guest'}</strong>
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
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid var(--color-border)',
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
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {item.quantity}x {itemName}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          + {item.modifiers.map((m: any) => m.optionName || m.name).join(', ')}
                        </div>
                      )}
                      {item.specialNote && (
                        <div style={{ fontSize: '11px', color: 'var(--color-warning)', fontStyle: 'italic', marginTop: '1px' }}>
                          Note: "{item.specialNote}"
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'right' }}>
                      {money(lineTotal)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subtotal / Tax / Tip Breakdown */}
          <div
            style={{
              borderTop: '1px dashed var(--color-border)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{money(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Tax ({taxRateLabel})</span>
              <span style={{ fontWeight: 600 }}>{money(tax)}</span>
            </div>
            {tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                <span>Tip</span>
                <span style={{ fontWeight: 600 }}>+{money(tip)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                borderTop: '1.5px solid var(--color-text-primary)',
                paddingTop: '8px',
                marginTop: '4px',
              }}
            >
              <span>TOTAL PAID</span>
              <span style={{ color: 'var(--color-success)' }}>{money((total + tip))}</span>
            </div>
          </div>

          {/* Payment Details Pill Card */}
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-success) 35%, transparent)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                Payment Method: {paymentMethod}
              </span>
              <span style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: '11px' }}>
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
                <span>{money(cashReceived)} / {money(Number(cashChange || 0))}</span>
              </div>
            )}
          </div>

          {/* Note to cashier / customer */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            Thank you for dining with us! This order is completed and paid in full.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-card-hover)',
            display: 'flex',
            gap: '10px',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <PosIcon name="printer" />Print Statement / Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--color-bg-raised)',
              color: 'var(--color-text-secondary)',
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
