'use client'

import React, { useState, useEffect, useCallback } from 'react'

/* ── Types ────────────────────────────────────────────────── */
interface Table {
  id: string
  name: string
  capacity: number
  status: string
}

interface Reservation {
  id: string
  guestName: string
  guestPhone: string
  guestEmail: string | null
  partySize: number
  scheduledAt: string
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW'
  notes: string | null
  tableId: string | null
  createdAt: string
  table: { id: string; name: string; capacity: number } | null
}

/* ── Date Helpers ─────────────────────────────────────────── */
function parseDateParts(isoString: string): { month: string; day: string; year: string; time: string } {
  try {
    const d = new Date(isoString)
    const month = d.toLocaleDateString('en-US', { month: 'short' })
    const day = d.toLocaleDateString('en-US', { day: '2-digit' })
    const year = d.getFullYear().toString()
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    return { month, day, year, time }
  } catch {
    return { month: 'Dec', day: '15', year: '2026', time: '10:45' }
  }
}

function formatCreatedOn(isoString: string): string {
  try {
    const d = new Date(isoString)
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${date}, ${time}`
  } catch {
    return '9 Nov 2026, 2:30PM'
  }
}

export default function ReservationsClient() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)

  // Add / Edit Form State
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [partySize, setPartySize] = useState(4)
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [scheduledTime, setScheduledTime] = useState('19:00')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [notes, setNotes] = useState('Special anniversary table near the window.')
  const [editStatus, setEditStatus] = useState<Reservation['status']>('CONFIRMED')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  /* ── Fetch Data ─────────────────────────────────────────── */
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reservations?all=true')
      if (res.ok) {
        const data = await res.json()
        setReservations(data)
      }
    } catch (err) {
      console.error('Failed to load reservations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables')
      if (res.ok) {
        const data = await res.json()
        setTables(data)
        if (data.length > 0 && !selectedTableId) {
          setSelectedTableId(data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load tables:', err)
    }
  }, [selectedTableId])

  useEffect(() => {
    fetchReservations()
    fetchTables()

    // Real-time SSE listener
    const es = new EventSource('/api/events')
    const handleEvent = () => fetchReservations()

    es.addEventListener('reservation.confirmed', handleEvent)
    es.addEventListener('table.status.changed', handleEvent)

    return () => {
      es.close()
    }
  }, [fetchReservations, fetchTables])

  /* ── Create Reservation ─────────────────────────────────── */
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestPhone,
          guestEmail: guestEmail || undefined,
          partySize: Number(partySize),
          scheduledAt,
          tableId: selectedTableId || undefined,
          notes: notes || undefined,
        }),
      })

      if (res.ok) {
        showToast(`Table booked successfully for ${guestName}!`)
        setIsAddOpen(false)
        resetForm()
        fetchReservations()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`Error: ${err.error || res.statusText}`)
      }
    } catch {
      showToast('Error creating reservation')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Edit Reservation ───────────────────────────────────── */
  const openEditModal = (r: Reservation) => {
    setSelectedRes(r)
    setGuestName(r.guestName)
    setGuestPhone(r.guestPhone)
    setGuestEmail(r.guestEmail || '')
    setPartySize(r.partySize)
    const d = new Date(r.scheduledAt)
    setScheduledDate(d.toISOString().substring(0, 10))
    setScheduledTime(d.toTimeString().substring(0, 5))
    setSelectedTableId(r.tableId || '')
    setNotes(r.notes || '')
    setEditStatus(r.status)
    setIsEditOpen(true)
  }

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRes) return
    setIsSubmitting(true)
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

      const res = await fetch(`/api/reservations/${selectedRes.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestPhone,
          guestEmail: guestEmail || null,
          partySize: Number(partySize),
          scheduledAt,
          tableId: selectedTableId || null,
          status: editStatus,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        showToast(`Reservation updated for ${guestName}`)
        setIsEditOpen(false)
        fetchReservations()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`Update failed: ${err.error || res.statusText}`)
      }
    } catch {
      showToast('Error updating reservation')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Delete / Cancel Reservation ────────────────────────── */
  const handleDeleteReservation = async (r: Reservation) => {
    if (!confirm(`Are you sure you want to cancel the reservation for ${r.guestName}?`)) return
    try {
      const res = await fetch(`/api/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (res.ok) {
        showToast(`Reservation cancelled for ${r.guestName}`)
        fetchReservations()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(`Error: ${err.error || res.statusText}`)
      }
    } catch {
      showToast('Error cancelling reservation')
    }
  }

  const resetForm = () => {
    setGuestName('')
    setGuestPhone('')
    setGuestEmail('')
    setPartySize(4)
    setNotes('')
  }

  // Filtered List
  const filteredReservations = reservations.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = r.guestName.toLowerCase()
      const phone = r.guestPhone.toLowerCase()
      const table = (r.table?.name || '').toLowerCase()
      const notesStr = (r.notes || '').toLowerCase()
      if (!name.includes(q) && !phone.includes(q) && !table.includes(q) && !notesStr.includes(q)) {
        return false
      }
    }
    return true
  })

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      {/* ── Toast Notification ─────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── HEADER ROW ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        {/* Title with refresh button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Reservations</h1>
          <button
            onClick={fetchReservations}
            title="Refresh reservations"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        {/* Right side: Search Box & + Add New */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '8px 34px 8px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: 13,
                outline: 'none',
                width: 220,
                color: '#1e293b',
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* + Add New Blue Button */}
          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add New
          </button>
        </div>
      </div>

      {/* ── RESERVATION CARDS GRID (3 COLUMNS) ─────────────── */}
      {filteredReservations.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic' }}>No reservations found. Click &quot;+ Add New&quot; to book a table.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {filteredReservations.map((res) => {
            const { month, day, year, time } = parseDateParts(res.scheduledAt)
            const createdDate = formatCreatedOn(res.createdAt)
            const tableName = res.table?.name?.replace(/[^0-9]/g, '') || '5'

            // Status tag colors
            let statusLabel = 'Booked'
            let statusBg = '#dcfce7'
            let statusColor = '#15803d'

            if (res.status === 'CANCELLED') {
              statusLabel = 'Cancelled'
              statusBg = '#fee2e2'
              statusColor = '#ef4444'
            } else if (res.status === 'SEATED') {
              statusLabel = 'Seated'
              statusBg = '#cffafe'
              statusColor = '#0891b2'
            } else if (res.status === 'NO_SHOW') {
              statusLabel = 'No-Show'
              statusBg = '#fef3c7'
              statusColor = '#b45309'
            } else if (res.status === 'PENDING') {
              statusLabel = 'Pending'
              statusBg = '#eff6ff'
              statusColor = '#2563eb'
            }

            return (
              <div
                key={res.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* ── TOP SECTION: DATE BLOCK + GUEST DETAILS ─ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Dark Date Badge Block */}
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 10,
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>
                      {month} {day}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>{year}</span>
                  </div>

                  {/* Guest Name & Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {res.guestName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {time}
                      </span>
                      <span>|</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="8" width="18" height="4" rx="1" />
                          <path d="M6 12v6M18 12v6" />
                        </svg>
                        Table : {tableName}
                      </span>
                      <span>|</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        Guests : {res.partySize}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── MIDDLE ROW: CREATED ON + STATUS ──────── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#64748b',
                    paddingTop: 4,
                  }}
                >
                  <span>Created on</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{createdDate}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  <span>Status</span>
                  <span
                    style={{
                      backgroundColor: statusBg,
                      color: statusColor,
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* ── FOOTER: VIEW NOTE + EDIT & DELETE ICONS ─ */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 12,
                    marginTop: 'auto',
                  }}
                >
                  {/* View Note Button */}
                  <button
                    onClick={() => {
                      setSelectedRes(res)
                      setIsNoteOpen(true)
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    View Note
                  </button>

                  {/* Action Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Edit Pencil Icon Button */}
                    <button
                      onClick={() => openEditModal(res)}
                      title="Edit Reservation"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>

                    {/* Delete / Cancel Trash Icon Button */}
                    <button
                      onClick={() => handleDeleteReservation(res)}
                      title="Cancel Reservation"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: '1px solid #fee2e2',
                        backgroundColor: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ef4444',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── VIEW NOTE MODAL ────────────────────────────────── */}
      {isNoteOpen && selectedRes && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: 440,
              maxWidth: '90%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Note for {selectedRes.guestName}
              </h3>
              <button
                onClick={() => setIsNoteOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                {selectedRes.notes || 'No special notes entered for this reservation.'}
              </p>
            </div>

            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <div><strong>Phone:</strong> {selectedRes.guestPhone}</div>
              {selectedRes.guestEmail && <div><strong>Email:</strong> {selectedRes.guestEmail}</div>}
              <div><strong>Table:</strong> {selectedRes.table?.name || 'Unassigned'} (Party of {selectedRes.partySize})</div>
            </div>

            <button
              onClick={() => setIsNoteOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── ADD NEW RESERVATION MODAL ──────────────────────── */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: 480,
              maxWidth: '90%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Book a Reservation</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. John Doe"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Guest Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Party Size *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Table Assignment
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Auto-assign</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Seats {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Special Notes & Requests
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Anniversary celebration, prefers quiet booth"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#2563eb', fontWeight: 700, fontSize: 13, cursor: isSubmitting ? 'not-allowed' : 'pointer', color: '#ffffff' }}
                >
                  {isSubmitting ? 'Booking...' : 'Book Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT RESERVATION MODAL ─────────────────────────── */}
      {isEditOpen && selectedRes && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: 480,
              maxWidth: '90%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Edit Reservation</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Guest Name
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="CONFIRMED">Booked</option>
                    <option value="SEATED">Seated</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No-Show</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Party Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Table
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Unassigned</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Seats {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Special Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#2563eb', fontWeight: 700, fontSize: 13, cursor: isSubmitting ? 'not-allowed' : 'pointer', color: '#ffffff' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
