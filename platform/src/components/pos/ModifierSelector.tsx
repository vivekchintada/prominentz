'use client'

import React, { useState, useEffect } from 'react'

interface Option {
  id:              string
  name:            string
  priceAdjustment: number
}

interface Modifier {
  id:           string
  name:         string
  isRequired:   boolean
  minSelect:    number
  maxSelect:    number
  options:      Option[]
}

interface MenuItem {
  id:          string
  name:        string
  price:       number
  modifiers:   Modifier[]
}

interface ModifierSelectorProps {
  isOpen:   boolean
  onClose:  () => void
  menuItem: MenuItem | null
  onConfirm: (
    selections: Array<{ modifierName: string; optionName: string; priceDelta: number }>
  ) => void
}

export default function ModifierSelector({
  isOpen,
  onClose,
  menuItem,
  onConfirm,
}: ModifierSelectorProps) {
  // Map of modifierId -> Array of selected option IDs
  const [selections, setSelections] = useState<Record<string, Option[]>>({})

  useEffect(() => {
    if (menuItem) {
      const initial: Record<string, Option[]> = {}
      menuItem.modifiers.forEach((mod) => {
        // Pre-fill default choices if required and maxSelect is 1
        if (mod.isRequired && mod.minSelect === 1 && mod.maxSelect === 1 && mod.options.length > 0) {
          initial[mod.id] = [mod.options[0]]
        } else {
          initial[mod.id] = []
        }
      })
      setSelections(initial)
    }
  }, [menuItem, isOpen])

  if (!isOpen || !menuItem) return null

  // Process clicking an option
  const handleToggleOption = (modifier: Modifier, option: Option) => {
    const currentList = selections[modifier.id] ?? []
    const isSelected = currentList.some((opt) => opt.id === option.id)

    let nextList: Option[] = []

    if (modifier.maxSelect === 1) {
      // Single selection group (Radio button style)
      if (isSelected) {
        // If not required, let them unselect. If required, keep it selected
        nextList = modifier.isRequired ? [option] : []
      } else {
        nextList = [option]
      }
    } else {
      // Multiple selection group (Checkbox style)
      if (isSelected) {
        nextList = currentList.filter((opt) => opt.id !== option.id)
      } else {
        if (currentList.length < modifier.maxSelect) {
          nextList = [...currentList, option]
        } else {
          // If already at limit, replace the first one (FIFO queue style) or just ignore
          nextList = [...currentList.slice(1), option]
        }
      }
    }

    setSelections((prev) => ({ ...prev, [modifier.id]: nextList }))
  }

  // Check if all modifier groups fulfill their minSelect criteria
  const validateSelections = (): boolean => {
    return menuItem.modifiers.every((mod) => {
      const chosen = selections[mod.id] ?? []
      return chosen.length >= mod.minSelect
    })
  }

  // Calculate live running total price
  const calculateLivePrice = (): number => {
    let extra = 0
    Object.values(selections).forEach((opts) => {
      opts.forEach((o) => {
        extra += Number(o.priceAdjustment)
      })
    })
    return Number(menuItem.price) + extra
  }

  const handleConfirm = () => {
    if (!validateSelections()) return

    // Format choices for backend addItems endpoint
    const result: Array<{ modifierName: string; optionName: string; priceDelta: number }> = []

    menuItem.modifiers.forEach((mod) => {
      const chosen = selections[mod.id] ?? []
      chosen.forEach((opt) => {
        result.push({
          modifierName: mod.name,
          optionName:   opt.name,
          priceDelta:   Number(opt.priceAdjustment),
        })
      })
    })

    onConfirm(result)
    onClose()
  }

  const isValid = validateSelections()

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
          maxWidth:   '500px',
          maxHeight:  '85vh',
          display:    'flex',
          flexDirection: 'column',
          gap:        'var(--space-4)',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
          <div>
            <h3 className="text-lg font-bold">{menuItem.name}</h3>
            <span className="text-xs text-secondary">Configure choices below</span>
          </div>
          <span className="text-brand font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
            ${calculateLivePrice().toFixed(2)}
          </span>
        </div>

        {/* Scrollable Modifiers List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {menuItem.modifiers.map((mod) => {
            const chosen = selections[mod.id] ?? []
            const isFulfill = chosen.length >= mod.minSelect
            const isRadio = mod.maxSelect === 1

            return (
              <div
                key={mod.id}
                style={{
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding:      'var(--space-3) var(--space-4)',
                  background:   'var(--color-bg-raised)',
                }}
              >
                {/* Section title & constraints */}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-sm">
                    {mod.name}
                    {mod.isRequired && <span className="text-brand" style={{ marginLeft: 4 }}>*</span>}
                  </span>
                  
                  <span
                    style={{
                      fontSize:   '10px',
                      padding:    '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: isFulfill ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color:      isFulfill ? 'var(--color-success)' : 'var(--color-error)',
                      fontWeight: 700,
                    }}
                  >
                    {mod.minSelect > 0
                      ? `Select min ${mod.minSelect} / max ${mod.maxSelect}`
                      : `Select up to ${mod.maxSelect}`}
                  </span>
                </div>

                {/* Options List */}
                <div className="flex flex-col gap-2">
                  {mod.options.map((opt) => {
                    const isSelected = chosen.some((o) => o.id === opt.id)

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleToggleOption(mod, opt)}
                        className="flex justify-between items-center"
                        style={{
                          padding:      'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          border:       `1px solid ${isSelected ? 'var(--color-brand-500)' : 'var(--color-border)'}`,
                          background:   isSelected ? 'rgba(249,115,22,0.06)' : 'var(--color-bg-card)',
                          cursor:       'pointer',
                          transition:   'all var(--transition-fast)',
                          fontSize:     'var(--text-sm)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {/* Circle for radio, square for checkbox */}
                          <div
                            style={{
                              width:        '14px',
                              height:       '14px',
                              borderRadius: isRadio ? '50%' : '3px',
                              border:       `1px solid ${isSelected ? 'var(--color-brand-500)' : 'var(--color-text-tertiary)'}`,
                              background:   isSelected ? 'var(--color-brand-500)' : 'transparent',
                              display:      'flex',
                              alignItems:   'center',
                              justifyContent: 'center',
                              color:        '#fff',
                              fontSize:     '8px',
                              fontWeight:   'bold',
                            }}
                          >
                            {isSelected && !isRadio && '✓'}
                          </div>
                          <span>{opt.name}</span>
                        </div>

                        {Number(opt.priceAdjustment) !== 0 && (
                          <span className="text-brand font-semibold text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                            {Number(opt.priceAdjustment) > 0 ? `+$${Number(opt.priceAdjustment).toFixed(2)}` : `-$${Math.abs(Number(opt.priceAdjustment)).toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
          <button type="button" onClick={onClose} className="btn btn--secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="btn btn--primary"
            style={{ flex: 1 }}
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  )
}
