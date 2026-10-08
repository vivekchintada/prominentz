'use client'

import React, { useState, useEffect } from 'react'

interface QuickNoteModalProps {
  isOpen: boolean
  table: {
    id: string
    name: string
    note?: string | null
  } | null
  onClose: () => void
  onSaved?: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

const PRESET_NOTES = [
  '🌟 VIP Guest',
  '⚠️ Severe Allergy Alert',
  '🎂 Birthday / Anniversary',
  '👶 High Chair Needed',
  '🍷 Wine Pairing Interest',
  '🔇 Quiet Table Requested',
]

export default function QuickNoteModal({
  isOpen,
  table,
  onClose,
  onSaved,
  showToast,
}: QuickNoteModalProps) {
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (table) {
      setNoteText(table.note || '')
    }
  }, [table])

  if (!isOpen || !table) return null

  const handleSave = async (textToSave: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: textToSave.trim() || null }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save note')
      }

      showToast?.('Table note updated successfully', 'success')
      onSaved?.()
      onClose()
    } catch (err: unknown) {
      showToast?.(err.message || 'Error updating note', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePresetClick = (preset: string) => {
    if (!noteText.trim()) {
      setNoteText(preset)
    } else if (noteText.includes(preset)) {
      // Toggle off: remove preset chip
      const parts = noteText
        .split('•')
        .map((p) => p.trim())
        .filter((p) => p !== preset && p.length > 0)
      setNoteText(parts.join(' • '))
    } else {
      // Toggle on: append preset chip
      setNoteText((prev) => `${prev} • ${preset}`)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card card--elevated"
        style={{
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.35)',
          padding: 'var(--space-6)',
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center"
          style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>📝</span>
            <h3 className="text-lg font-bold">Quick Table Note &mdash; {table.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn--secondary btn--sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Quick Presets Tag Chips */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-xs font-semibold text-secondary">
              Quick Presets (Click to toggle):
            </label>
            {noteText.trim() && (
              <button
                type="button"
                onClick={() => setNoteText('')}
                className="text-xs font-medium text-brand hover:underline"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Clear text
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESET_NOTES.map((preset) => {
              const isSelected = noteText.includes(preset)
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? '1.5px solid var(--color-brand-500)'
                      : '1px solid var(--color-border)',
                    background: isSelected
                      ? 'rgba(249,115,22,0.12)'
                      : 'var(--color-bg-raised)',
                    color: isSelected
                      ? 'var(--color-brand-500)'
                      : 'var(--color-text-primary)',
                    boxShadow: isSelected ? '0 2px 8px rgba(249,115,22,0.15)' : 'none',
                    lineHeight: '1.3',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--color-text-secondary)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.transform = 'none'
                    }
                  }}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{preset}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Note Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-secondary">
            Table Note Details:
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder="Type server notes here (e.g. VIP guest, gluten allergy, celebrating 10th anniversary)..."
            className="input"
            style={{
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical',
              padding: 'var(--space-3)',
              lineHeight: '1.4',
            }}
          />
        </div>

        {/* Actions */}
        <div
          className="flex justify-between items-center mt-2"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}
        >
          {noteText.trim() ? (
            <button
              type="button"
              onClick={() => {
                setNoteText('')
                handleSave('')
              }}
              disabled={saving}
              className="btn btn--secondary btn--sm"
              style={{ color: 'var(--color-error)' }}
            >
              🗑️ Clear Note
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn--secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(noteText)}
              className="btn btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
