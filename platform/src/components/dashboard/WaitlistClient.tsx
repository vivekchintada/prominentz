'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast, ToastContainer } from '../ui/Toast'

interface Table {
  id: string
  name: string
  capacity: number
  status: string
  floor?: string
  shape?: 'square' | 'rectangle' | 'round'
  activeBooking?: {
    guestName: string
    bookingTime: string
    partySize: number
  } | null
}

interface WaitlistEntry {
  id: string
  guestName: string
  guestPhone: string
  partySize: number
  quotedWaitMins: number
  arrivedAt: string
  status: 'WAITING' | 'SEATED' | 'LEFT'
}

export default function WaitlistClient() {
  const [entries, setEntries]           = useState<WaitlistEntry[]>([])
  const [tables, setTables]             = useState<Table[]>([])
  const [loading, setLoading]           = useState(true)
  const [currentTime, setCurrentTime]   = useState(new Date())
  const [activeView, setActiveView]     = useState<'queue' | 'floor'>('queue')
  const [selectedFloor, setSelectedFloor] = useState<string>('3rd Floor')

  // Walk-in modal state
  const [isAddOpen, setIsAddOpen]       = useState(false)
  const [guestName, setGuestName]       = useState('')
  const [guestPhone, setGuestPhone]     = useState('')
  const [partySize, setPartySize]       = useState<number | ''>('')
  const [quotedWait, setQuotedWait]     = useState<number | ''>(20)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Convert modal state
  const [convertEntry, setConvertEntry] = useState<WaitlistEntry | null>(null)
  const [selectedTableId, setSelectedTableId] = useState('')
  const [convertNotes, setConvertNotes] = useState('')
  const [submittingConvert, setSubmittingConvert] = useState(false)

  const { toasts, showToast, dismissToast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [waitRes, tableRes] = await Promise.all([
        fetch('/api/waitlist'),
        fetch('/api/tables'),
      ])
      if (!waitRes.ok) throw new Error('Failed to load waitlist')
      setEntries(await waitRes.json())
      if (tableRes.ok) setTables(await tableRes.json())
    } catch (err: any) {
      showToast(err.message || 'Error loading waitlist', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
    const clock = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(clock)
  }, [fetchData])

  // Smart wait-time estimator: auto-calculates recommended wait time when party size changes
  useEffect(() => {
    if (typeof partySize === 'number' && partySize > 0) {
      const activeQueueCount = entries.filter(e => e.status === 'WAITING').length
      // Base 10 mins + 5 mins per existing party ahead
      const estimated = Math.max(15, 10 + activeQueueCount * 5 + (partySize > 4 ? 10 : 0))
      setQuotedWait(estimated)
    }
  }, [partySize, entries])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName || !guestPhone || !partySize || quotedWait === '') {
      showToast('All fields are required to queue walk-ins', 'error')
      return
    }

    try {
      setSubmittingAdd(true)
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestPhone,
          partySize: Number(partySize),
          quotedWaitMins: Number(quotedWait),
        }),
      })

      if (!res.ok) throw new Error('Failed to add guest to waitlist')

      showToast(`✅ "${guestName}" added to waitlist queue (${quotedWait} mins quoted)`, 'success')
      setIsAddOpen(false)
      setGuestName(''); setGuestPhone(''); setPartySize(''); setQuotedWait(20)
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error queuing guest', 'error')
    } finally {
      setSubmittingAdd(false)
    }
  }

  const handleUpdateStatus = async (entryId: string, status: 'SEATED' | 'LEFT') => {
    try {
      const res = await fetch(`/api/waitlist/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      showToast(status === 'SEATED' ? '🪑 Guest seated successfully' : 'Guest removed from waitlist', 'info')
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error updating guest status', 'error')
    }
  }

  const handleNotifyGuest = async (entry: WaitlistEntry) => {
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify: true }),
      })

      if (!res.ok) throw new Error('Failed to send notification')

      showToast(`📲 Table-ready alert sent to ${entry.guestName} (${entry.guestPhone}) via WhatsApp/SMS!`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Error sending notification', 'error')
    }
  }

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertEntry) return
    try {
      setSubmittingConvert(true)
      const res = await fetch(`/api/waitlist/${convertEntry.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableId || undefined,
          notes: convertNotes || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to convert waitlist entry to reservation')

      showToast(`📅 Converted ${convertEntry.guestName} to a reservation!`, 'success')
      setConvertEntry(null)
      setSelectedTableId('')
      setConvertNotes('')
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error converting entry', 'error')
    } finally {
      setSubmittingConvert(false)
    }
  }

  // ── Metrics ──
  const totalWaitingParties = entries.length
  const totalWaitingGuests  = entries.reduce((acc, e) => acc + e.partySize, 0)
  const avgQuotedMins       = entries.length > 0 ? Math.round(entries.reduce((acc, e) => acc + e.quotedWaitMins, 0) / entries.length) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Host Desk Summary Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 'var(--space-3)' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Waiting Queue</span>
          <div className="text-xl font-bold text-primary mt-1">⏳ {totalWaitingParties} Parties ({totalWaitingGuests} guests)</div>
          <span className="text-xs text-secondary">Active floor queue</span>
        </div>

        <div className="card" style={{ padding: 'var(--space-3)' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Avg Quoted Wait</span>
          <div className="text-xl font-bold text-primary mt-1">⏱️ {avgQuotedMins} Mins</div>
          <span className="text-xs text-secondary">Est. turnaround per party</span>
        </div>

        <div className="card" style={{ padding: 'var(--space-3)' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Available Tables</span>
          <div className="text-xl font-bold text-primary mt-1">🪑 {tables.filter(t => t.status === 'EMPTY').length} Free</div>
          <span className="text-xs text-secondary">Ready to seat walk-ins</span>
        </div>
      </div>

      {/* Control Action Bar & View Switcher */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="text-md font-bold text-primary" style={{ margin: 0 }}>
            {activeView === 'queue' ? '📋 Live Waitlist Queue' : '🪑 Floor & Table View'}
          </h2>
          <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-card)', padding: 3, borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveView('queue')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeView === 'queue' ? '#2563eb' : 'transparent',
                color: activeView === 'queue' ? '#ffffff' : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📋 Queue ({entries.length})
            </button>
            <button
              onClick={() => setActiveView('floor')}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeView === 'floor' ? '#2563eb' : 'transparent',
                color: activeView === 'floor' ? '#ffffff' : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🪑 Floor &amp; Tables
            </button>
          </div>
        </div>

        <button onClick={() => setIsAddOpen(true)} className="btn btn--brand">
          ➕ Queue Walk-In Party
        </button>
      </div>

      {activeView === 'floor' ? (
        /* ─── LIVE FLOOR & TABLE PLAN VIEW ─── */
        <div className="card" style={{ padding: 20 }}>
          {/* Floor filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['All Floors', '1st Floor', '2nd Floor', '3rd Floor'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFloor(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: selectedFloor === f ? '1px solid #2563eb' : '1px solid #f59e0b',
                    backgroundColor: selectedFloor === f ? '#2563eb' : '#ffffff',
                    color: selectedFloor === f ? '#ffffff' : '#d97706',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span>🟢 Available: {tables.filter((t) => t.status === 'EMPTY').length}</span>
              <span>🟠 Booked: {tables.filter((t) => t.status === 'RESERVED').length}</span>
              <span>🔴 Occupied: {tables.filter((t) => t.status === 'ACTIVE').length}</span>
            </div>
          </div>

          {/* Table Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
            {tables
              .filter((t) => selectedFloor === 'All Floors' || (t.floor || '1st Floor') === selectedFloor)
              .map((t) => {
                const isAvailable = t.status === 'EMPTY'
                const isBooked = t.status === 'RESERVED'
                const isOccupied = t.status === 'ACTIVE'

                return (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      padding: '14px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: isAvailable && entries.length > 0 ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    onClick={() => {
                      if (isAvailable && entries.length > 0) {
                        const firstWaiting = entries[0]
                        if (confirm(`Seat next waiting guest "${firstWaiting.guestName}" (${firstWaiting.partySize} guests) at ${t.name}?`)) {
                          handleUpdateStatus(firstWaiting.id, 'SEATED')
                        }
                      }
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, margin: '2px 0 8px 0' }}>
                      👥 {t.capacity} seats · {t.floor || '1st Floor'}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: isAvailable ? 'rgba(34,197,94,0.1)' : isBooked ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isAvailable ? '#16a34a' : isBooked ? '#ea580c' : '#dc2626',
                        border: `1px solid ${isAvailable ? 'rgba(34,197,94,0.3)' : isBooked ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}
                    >
                      {isAvailable ? 'Available' : isBooked ? 'Booked' : 'Occupied'}
                    </span>

                    {isAvailable && entries.length > 0 && (
                      <button
                        className="btn btn--sm"
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          padding: '3px 8px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        🪑 Seat Next Party
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      ) : (
      /* Waitlist Grid List */
      <div className="card">
        {loading && entries.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner" style={{ width: '30px', height: '30px' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-secondary italic">The waitlist is currently empty. All guests have been seated!</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Guest Details</th>
                  <th style={{ padding: 'var(--space-3)' }}>Party Size</th>
                  <th style={{ padding: 'var(--space-3)' }}>Quoted Wait</th>
                  <th style={{ padding: 'var(--space-3)' }}>Time Elapsed</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 'var(--text-sm)' }}>
                {entries.map((entry) => {
                  const arrivedDate = new Date(entry.arrivedAt)
                  const elapsedMs = currentTime.getTime() - arrivedDate.getTime()
                  const elapsedMins = Math.floor(elapsedMs / 60000)
                  const isOverdue = elapsedMins >= entry.quotedWaitMins

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div className="font-bold text-primary">{entry.guestName}</div>
                        <div className="text-secondary text-xs">{entry.guestPhone}</div>
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>
                        👤 {entry.partySize} guests
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>
                        ⏳ {entry.quotedWaitMins} mins
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span
                          className="badge font-mono"
                          style={{
                            fontSize: '11px',
                            background: isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                            color: isOverdue ? 'var(--color-error)' : '#22c55e',
                            fontWeight: 'bold',
                          }}
                        >
                          {elapsedMins} mins
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleNotifyGuest(entry)}
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', borderColor: '#25D366', color: '#25D366' }}
                            title="Send Table-Ready Alert via WhatsApp / SMS"
                          >
                            📲 Notify
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(entry.id, 'SEATED')}
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', borderColor: '#22c55e', color: '#22c55e' }}
                          >
                            🪑 Seat
                          </button>
                          <button
                            onClick={() => setConvertEntry(entry)}
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', borderColor: '#818cf8', color: '#818cf8' }}
                          >
                            📅 Convert to Booking
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(entry.id, 'LEFT')}
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Add Walk-in Guest Modal */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 'var(--z-modal)' as any,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)', backdropFilter: 'blur(4px)',
          }}
        >
          <form onSubmit={handleAddSubmit} className="card card--elevated" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 className="text-lg font-bold">➕ Queue Walk-in Guest</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary font-semibold">Guest Name *</label>
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required className="input" placeholder="e.g. Sarah Connor" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary font-semibold">Contact Phone *</label>
              <input type="text" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required className="input" placeholder="e.g. +1 555-0101" />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1" style={{ flex: 1 }}>
                <label className="text-xs text-secondary font-semibold">Party Size *</label>
                <input type="number" min="1" value={partySize} onChange={(e) => setPartySize(e.target.value === '' ? '' : Number(e.target.value))} required className="input" placeholder="4" />
              </div>
              <div className="flex flex-col gap-1" style={{ flex: 1 }}>
                <label className="text-xs text-secondary font-semibold">Quoted Wait (mins) *</label>
                <input type="number" min="0" value={quotedWait} onChange={(e) => setQuotedWait(e.target.value === '' ? '' : Number(e.target.value))} required className="input" />
              </div>
            </div>
            
            <div className="p-2 rounded bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300">
              💡 <strong>Smart Estimator:</strong> Recommended wait calculated based on {totalWaitingParties} active parties ahead.
            </div>

            <div className="flex gap-2 justify-end mt-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn--secondary">
                Cancel
              </button>
              <button type="submit" disabled={submittingAdd} className="btn btn--primary">
                {submittingAdd ? 'Queuing...' : 'Add to Queue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Convert to Reservation Modal */}
      {convertEntry && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 'var(--z-modal)' as any,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)', backdropFilter: 'blur(4px)',
          }}
        >
          <form onSubmit={handleConvertSubmit} className="card card--elevated" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 className="text-lg font-bold">📅 Convert Walk-in to Booking</h3>
            <p className="text-xs text-secondary">
              Guest: <strong>{convertEntry.guestName}</strong> ({convertEntry.partySize} guests)
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary font-semibold">Assign Physical Table (optional):</label>
              <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} className="input">
                <option value="">— Assign Later —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.name} ({t.capacity} pax) · {t.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-secondary font-semibold">Notes:</label>
              <input type="text" value={convertNotes} onChange={(e) => setConvertNotes(e.target.value)} className="input" placeholder="e.g. Seating preferences" />
            </div>

            <div className="flex gap-2 justify-end mt-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <button type="button" onClick={() => setConvertEntry(null)} className="btn btn--secondary">
                Cancel
              </button>
              <button type="submit" disabled={submittingConvert} className="btn btn--primary">
                {submittingConvert ? 'Converting...' : 'Convert to Reservation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
