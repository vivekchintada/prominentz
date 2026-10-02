'use client'

import React, { useState } from 'react'

interface NewOrderModalProps {
  isOpen:    boolean
  tableName: string
  onClose:   () => void
  onSubmit:  (guestCount: number, notes: string) => void
}

export default function NewOrderModal({
  isOpen,
  tableName,
  onClose,
  onSubmit,
}: NewOrderModalProps) {
  const [guestCount, setGuestCount] = useState<number>(2)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleIncrement = () => setGuestCount((c) => c + 1)
  const handleDecrement = () => setGuestCount((c) => (c > 1 ? c - 1 : 1))

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    onSubmit(guestCount, notes)
  }

  return (
    <div
      style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        bottom:          0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex:          'var(--z-modal)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        backdropFilter:  'blur(4px)',
      }}
    >
      <div
        className="card card--elevated animate-fade-in"
        style={{
          width:     '100%',
          maxWidth:   '420px',
          display:    'flex',
          flexDirection: 'column',
          gap:        'var(--space-4)',
          position:   'relative',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
          <h3 className="text-xl font-bold">Open Table &mdash; {tableName}</h3>
          <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ minWidth: 'auto', padding: 'var(--space-1) var(--space-2)' }}>✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          
          {/* Guest Count Touch Interface */}
          <div>
            <label className="label" style={{ textAlign: 'center' }}>Number of Guests</label>
            <div
              style={{
                display:        'flex',
                justifyContent: 'center',
                alignItems:     'center',
                gap:            'var(--space-4)',
                margin:         'var(--space-2) 0',
              }}
            >
              <button
                type="button"
                onClick={handleDecrement}
                className="btn btn--secondary"
                style={{
                  width:        '48px',
                  height:       '48px',
                  borderRadius: '50%',
                  fontSize:     'var(--text-xl)',
                  padding:      0,
                }}
              >
                &minus;
              </button>
              
              <span
                style={{
                  fontSize:   '2.25rem',
                  fontWeight: 'var(--font-bold)',
                  width:      '60px',
                  textAlign:  'center',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {guestCount}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                className="btn btn--secondary"
                style={{
                  width:        '48px',
                  height:       '48px',
                  borderRadius: '50%',
                  fontSize:     'var(--text-xl)',
                  padding:      0,
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Table Notes */}
          <div>
            <label className="label">Table Notes (Optional)</label>
            <textarea
              className="input"
              placeholder="e.g. Window seat, gluten allergy, high chair needed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <button type="button" onClick={onClose} disabled={loading} className="btn btn--secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn--primary" style={{ flex: 1 }}>
              {loading ? 'Initializing...' : 'Start Table Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
