'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

/* ── Types ────────────────────────────────────────────────── */
export interface TableData {
  id: string
  name: string
  capacity: number
  status: 'EMPTY' | 'ACTIVE' | 'RESERVED' | 'PAYING'
  floor: string
  shape: 'square' | 'rectangle' | 'round'
  note?: string | null
  posX?: number | null
  posY?: number | null
  activeBooking?: {
    guestName: string
    bookingTime: string
    partySize: number
  } | null
  activeOrder?: {
    id: string
    total: number
    subtotal?: number
    tax?: number
    guestCount: number
    createdAt?: string
    items?: Array<{
      id: string
      name: string
      quantity: number
      price: number
      status: string
    }>
  } | null
}

/* ── SVG Table & Chair Visualizer ────────────────────────── */
interface TableIllustrationProps {
  capacity: number
  shape: 'square' | 'rectangle' | 'round'
  status: 'EMPTY' | 'ACTIVE' | 'RESERVED' | 'PAYING'
}

function TableIllustration({ capacity, shape, status }: TableIllustrationProps) {
  // Palette according to status matching DreamPOS screenshot
  let chairColor = '#93c5fd' // soft blue for available
  let tableFill = '#eff6ff'
  let tableBorder = '#bfdbfe'

  if (status === 'RESERVED') {
    chairColor = '#c4b5fd' // soft purple for booked
    tableFill = '#f5f3ff'
    tableBorder = '#ddd6fe'
  } else if (status === 'ACTIVE') {
    chairColor = '#f472b6' // soft pink/purple for occupied
    tableFill = '#fdf2f8'
    tableBorder = '#fbcfe8'
  } else if (status === 'PAYING') {
    chairColor = '#fcd34d'
    tableFill = '#fffbeb'
    tableBorder = '#fef08a'
  }

  // 10+ seats: Long rectangular / capsule table
  if (capacity >= 8 || shape === 'rectangle') {
    return (
      <svg width="140" height="90" viewBox="0 0 140 90" fill="none" style={{ margin: '0 auto', display: 'block', pointerEvents: 'none' }}>
        {/* Top 4 chairs */}
        <rect x="24" y="8" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="48" y="8" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="74" y="8" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="98" y="8" width="16" height="7" rx="3.5" fill={chairColor} />

        {/* Center table */}
        <rect x="18" y="22" width="104" height="42" rx="14" fill={tableFill} stroke={tableBorder} strokeWidth="1.5" />

        {/* Left chair */}
        <rect x="6" y="35" width="7" height="16" rx="3.5" fill={chairColor} />

        {/* Right chair */}
        <rect x="127" y="35" width="7" height="16" rx="3.5" fill={chairColor} />

        {/* Bottom 4 chairs */}
        <rect x="24" y="71" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="48" y="71" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="74" y="71" width="16" height="7" rx="3.5" fill={chairColor} />
        <rect x="98" y="71" width="16" height="7" rx="3.5" fill={chairColor} />
      </svg>
    )
  }

  // 6 seats: Square with 2 top, 2 bottom, 1 left, 1 right
  if (capacity >= 5) {
    return (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" style={{ margin: '0 auto', display: 'block', pointerEvents: 'none' }}>
        {/* Top 2 chairs */}
        <rect x="36" y="8" width="18" height="7" rx="3.5" fill={chairColor} />
        <rect x="64" y="8" width="18" height="7" rx="3.5" fill={chairColor} />

        {/* Center table */}
        <rect x="28" y="22" width="64" height="46" rx="12" fill={tableFill} stroke={tableBorder} strokeWidth="1.5" />

        {/* Left chair */}
        <rect x="14" y="37" width="7" height="16" rx="3.5" fill={chairColor} />

        {/* Right chair */}
        <rect x="99" y="37" width="7" height="16" rx="3.5" fill={chairColor} />

        {/* Bottom 2 chairs */}
        <rect x="36" y="75" width="18" height="7" rx="3.5" fill={chairColor} />
        <rect x="64" y="75" width="18" height="7" rx="3.5" fill={chairColor} />
      </svg>
    )
  }

  // 4 seats: 1 chair on each side
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" style={{ margin: '0 auto', display: 'block', pointerEvents: 'none' }}>
      {/* Top chair */}
      <rect x="49" y="8" width="22" height="7" rx="3.5" fill={chairColor} />

      {/* Center table */}
      <rect x="34" y="22" width="52" height="46" rx="10" fill={tableFill} stroke={tableBorder} strokeWidth="1.5" />

      {/* Left chair */}
      <rect x="19" y="37" width="7" height="16" rx="3.5" fill={chairColor} />

      {/* Right chair */}
      <rect x="94" y="37" width="7" height="16" rx="3.5" fill={chairColor} />

      {/* Bottom chair */}
      <rect x="49" y="75" width="22" height="7" rx="3.5" fill={chairColor} />
    </svg>
  )
}

export default function TablesClient() {
  const [tables, setTables] = useState<TableData[]>([])
  const [floors, setFloors] = useState<string[]>(['All Floors', '1st Floor', '2nd Floor', '3rd Floor'])
  const [selectedFloor, setSelectedFloor] = useState<string>('All Floors')
  const [loading, setLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [settingsTab, setSettingsTab] = useState<'tables' | 'floors'>('tables')

  // Booking Form State
  const [bookTableId, setBookTableId] = useState<string>('')
  const [bookGuestName, setBookGuestName] = useState('')
  const [bookGuestPhone, setBookGuestPhone] = useState('')
  const [bookGuestEmail, setBookGuestEmail] = useState('')
  const [bookPartySize, setBookPartySize] = useState<number>(4)
  const [bookDate, setBookDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [bookTime, setBookTime] = useState('19:00')
  const [bookNotes, setBookNotes] = useState('')
  const [submittingBook, setSubmittingBook] = useState(false)

  // Settings: Add Table Form State
  const [newTableName, setNewTableName] = useState('')
  const [newTableFloor, setNewTableFloor] = useState('3rd Floor')
  const [newTableCapacity, setNewTableCapacity] = useState<number>(6)
  const [newTableShape, setNewTableShape] = useState<'square' | 'rectangle' | 'round'>('square')
  const [submittingNewTable, setSubmittingNewTable] = useState(false)

  // Settings: Add Floor Form State
  const [newFloorName, setNewFloorName] = useState('')
  const [submittingNewFloor, setSubmittingNewFloor] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch Tables & Floors
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [tablesRes, floorsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/floors'),
      ])

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json()
        setTables(tablesData)
      }

      if (floorsRes.ok) {
        const floorsData = await floorsRes.json()
        const allList = Array.from(new Set(['All Floors', ...floorsData]))
        setFloors(allList)
      }
    } catch (err) {
      console.error('Error fetching tables data:', err)
      showToast('Error loading table data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter tables by selected floor
  const displayedTables = tables.filter((t) => {
    if (selectedFloor === 'All Floors') return true
    return t.floor === selectedFloor
  })

  // Handle Book Table Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookTableId || !bookGuestName || !bookGuestPhone) {
      showToast('Please select a table and provide guest name & phone')
      return
    }

    try {
      setSubmittingBook(true)
      const scheduledAt = new Date(`${bookDate}T${bookTime}:00`).toISOString()

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: bookGuestName,
          guestPhone: bookGuestPhone,
          guestEmail: bookGuestEmail || undefined,
          partySize: Number(bookPartySize),
          scheduledAt,
          tableId: bookTableId,
          notes: bookNotes || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to book table')
      }

      // Update table status to RESERVED
      await fetch(`/api/tables/${bookTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESERVED' }),
      })

      showToast(`✅ Table booked successfully for ${bookGuestName}!`)
      setIsBookModalOpen(false)
      setBookGuestName('')
      setBookGuestPhone('')
      setBookGuestEmail('')
      setBookNotes('')
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error booking table')
    } finally {
      setSubmittingBook(false)
    }
  }

  // Quick Table Status Change
  const handleTableStatusChange = async (tableId: string, status: 'EMPTY' | 'ACTIVE' | 'RESERVED') => {
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, force: true }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update table status')
      }

      showToast(`Status updated to ${status === 'EMPTY' ? 'Available' : status === 'ACTIVE' ? 'Occupied' : 'Booked'}`)
      setSelectedTable(null)
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error updating status')
    }
  }

  // Handle Add New Table
  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableName.trim()) {
      showToast('Please enter table name')
      return
    }

    try {
      setSubmittingNewTable(true)
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTableName.trim(),
          capacity: Number(newTableCapacity),
          floor: newTableFloor,
          shape: newTableShape,
          status: 'EMPTY',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create table')
      }

      showToast(`✅ Table "${newTableName}" created on ${newTableFloor}!`)
      setNewTableName('')
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error creating table')
    } finally {
      setSubmittingNewTable(false)
    }
  }

  // Handle Add New Floor
  const handleAddFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFloorName.trim()) {
      showToast('Please enter floor name')
      return
    }

    try {
      setSubmittingNewFloor(true)
      const res = await fetch('/api/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorName: newFloorName.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add floor')
      }

      showToast(`✅ Floor "${newFloorName.trim()}" added successfully!`)
      setSelectedFloor(newFloorName.trim())
      setNewFloorName('')
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error adding floor')
    } finally {
      setSubmittingNewFloor(false)
    }
  }

  // Handle Delete Table
  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (!confirm(`Are you sure you want to delete "${tableName}"?`)) return
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete table')
      }

      showToast(`Table "${tableName}" deleted`)
      setSelectedTable(null)
      fetchData()
    } catch (err: any) {
      showToast(err.message || 'Error deleting table')
    }
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px 32px', fontFamily: 'inherit' }}>
      {/* Toast Notification */}
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
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            zIndex: 99999,
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── Top Header Row ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Tables
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* + Book Table Button (Blue) */}
          <button
            onClick={() => {
              const firstFree = displayedTables.find((t) => t.status === 'EMPTY')
              setBookTableId(firstFree?.id || displayedTables[0]?.id || '')
              setIsBookModalOpen(true)
            }}
            style={{
              backgroundColor: '#5b45f5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a36d9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5b45f5')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Book Table
          </button>

          {/* QR Studio Button */}
          <Link
            href="/dashboard/tables/qr"
            title="Generate & Print Table QR Codes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 14px',
              height: 40,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              color: '#5b45f5',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dbeafe'
              e.currentTarget.style.borderColor = '#93c5fd'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff'
              e.currentTarget.style.borderColor = '#bfdbfe'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
              <rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3v3"/><path d="M21 21v.01"/>
              <path d="M12 7v3"/><path d="M12 3v.01"/><path d="M12 14v.01"/><path d="M12 17v3"/>
            </svg>
            QR Studio
          </Link>

          {/* Settings Button (Gear) */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="Manage Table & Floor Plan Settings"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Floor Filter Pills & Legend Row ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        {/* Floor Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {floors.map((floor) => {
            const isActive = selectedFloor === floor
            return (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #5b45f5' : '1px solid #f59e0b',
                  backgroundColor: isActive ? '#5b45f5' : '#ffffff',
                  color: isActive ? '#ffffff' : '#d97706',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                }}
              >
                {floor}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, fontWeight: 500, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ color: '#16a34a' }}>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316' }} />
            <span style={{ color: '#ea580c' }}>Booked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <span style={{ color: '#dc2626' }}>Occupied</span>
          </div>
        </div>
      </div>

      {/* ── Table Cards Grid ───────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px auto' }} />
          Loading floor tables...
        </div>
      ) : displayedTables.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', padding: '60px 24px', borderRadius: 16, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🪑</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>No tables found on {selectedFloor}</h3>
          <p style={{ margin: '6px 0 16px 0', fontSize: 13, color: '#64748b' }}>
            Click the settings gear icon to add tables to this floor or manage your floor plan.
          </p>
          <button
            onClick={() => {
              setNewTableFloor(selectedFloor === 'All Floors' ? '3rd Floor' : selectedFloor)
              setIsSettingsModalOpen(true)
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#5b45f5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Table to {selectedFloor}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {displayedTables.map((table) => {
            const isBooked = table.status === 'RESERVED'
            const isOccupied = table.status === 'ACTIVE'
            const isPaying = table.status === 'PAYING'

            return (
              <div
                key={table.id}
                onClick={() => setSelectedTable(table)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                  e.currentTarget.style.borderColor = '#f1f5f9'
                }}
              >
                {/* SVG Illustration */}
                <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, width: '100%' }}>
                  <TableIllustration capacity={table.capacity} shape={table.shape} status={table.status} />
                </div>

                {/* Table Name */}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
                  {table.name}
                </div>

                {/* Seats Count */}
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5b45f5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>👥</span> {table.capacity} seats
                </div>

                {/* Status Pill */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    backgroundColor: isBooked
                      ? '#ffedd5'
                      : isOccupied
                      ? '#ffe4e6'
                      : isPaying
                      ? '#fef9c3'
                      : '#dcfce7',
                    color: isBooked
                      ? '#ea580c'
                      : isOccupied
                      ? '#e11d48'
                      : isPaying
                      ? '#ca8a04'
                      : '#16a34a',
                    border: `1px solid ${
                      isBooked
                        ? '#fed7aa'
                        : isOccupied
                        ? '#fecdd3'
                        : isPaying
                        ? '#fef08a'
                        : '#bbf7d0'
                    }`,
                    marginBottom: (isBooked || isOccupied) && table.activeBooking ? 8 : 0,
                  }}
                >
                  {isBooked ? 'Booked' : isOccupied ? 'Occupied' : isPaying ? 'Paying' : 'Available'}
                </div>

                {/* Booking / Occupied Info (if Booked or Occupied) */}
                {(isBooked || isOccupied) && table.activeBooking && (
                  <div
                    style={{
                      width: '100%',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 8,
                      marginTop: 4,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {table.activeBooking.guestName}
                    </div>
                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {table.activeBooking.bookingTime}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal 1: Table Quick Actions / Details ─────────── */}
      {selectedTable && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedTable(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {selectedTable.name}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedTable.floor} · {selectedTable.capacity} Seats · {selectedTable.shape}
                </span>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Illustration & Status Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: 12,
                padding: '16px 12px',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              <TableIllustration
                capacity={selectedTable.capacity}
                shape={selectedTable.shape}
                status={selectedTable.status}
              />
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                Current Status:{' '}
                <span
                  style={{
                    color:
                      selectedTable.status === 'RESERVED'
                        ? '#ea580c'
                        : selectedTable.status === 'ACTIVE'
                        ? '#e11d48'
                        : '#16a34a',
                  }}
                >
                  {selectedTable.status === 'RESERVED'
                    ? 'Booked'
                    : selectedTable.status === 'ACTIVE'
                    ? 'Occupied'
                    : 'Available'}
                </span>
              </div>

              {selectedTable.activeBooking && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#475569', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <strong>Guest:</strong> {selectedTable.activeBooking.guestName} ({selectedTable.activeBooking.partySize} guests)<br />
                  <span style={{ color: '#d97706', fontSize: 11 }}>{selectedTable.activeBooking.bookingTime}</span>
                </div>
              )}

              {/* Active Order Details Check */}
              {selectedTable.activeOrder ? (
                <div
                  style={{
                    marginTop: 10,
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Active Order Check
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {selectedTable.activeOrder.guestCount} Guests
                    </span>
                  </div>

                  {selectedTable.activeOrder.items && selectedTable.activeOrder.items.length > 0 ? (
                    <div style={{ maxHeight: 110, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 6, padding: '4px 8px', backgroundColor: '#f8fafc', marginBottom: 6 }}>
                      {selectedTable.activeOrder.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                          <span style={{ color: '#334155' }}>{it.quantity}× {it.name}</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>${(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Total Bill:</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>
                      ${selectedTable.activeOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedTable.status === 'EMPTY' && (
                <>
                  <Link
                    href={`/dashboard/pos?tableId=${selectedTable.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px',
                      backgroundColor: '#5b45f5',
                      color: '#ffffff',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    🪑 Seat Walk-in & Open POS
                  </Link>
                  <button
                    onClick={() => {
                      setBookTableId(selectedTable.id)
                      setSelectedTable(null)
                      setIsBookModalOpen(true)
                    }}
                    style={{
                      padding: '10px',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    📅 Book This Table
                  </button>
                  <button
                    onClick={() => handleTableStatusChange(selectedTable.id, 'ACTIVE')}
                    style={{
                      padding: '9px',
                      backgroundColor: '#ffffff',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark Table Occupied
                  </button>
                </>
              )}

              {selectedTable.status === 'RESERVED' && (
                <>
                  <button
                    onClick={() => handleTableStatusChange(selectedTable.id, 'ACTIVE')}
                    style={{
                      padding: '10px',
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🪑 Seat Guest Now (Mark Occupied)
                  </button>
                  <button
                    onClick={() => handleTableStatusChange(selectedTable.id, 'EMPTY')}
                    style={{
                      padding: '10px',
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel Booking (Free Table)
                  </button>
                </>
              )}

              {selectedTable.status === 'ACTIVE' && (
                <>
                  <Link
                    href={`/dashboard/pos?tableId=${selectedTable.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px',
                      backgroundColor: '#5b45f5',
                      color: '#ffffff',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    🧾 Open Table in POS / Add Items
                  </Link>
                  <button
                    onClick={() => handleTableStatusChange(selectedTable.id, 'EMPTY')}
                    style={{
                      padding: '10px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🧹 Clear Table (Mark Available)
                  </button>
                </>
              )}

              <button
                onClick={() => handleDeleteTable(selectedTable.id, selectedTable.name)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                🗑️ Delete Table from Floor Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Book Table ────────────────────────────── */}
      {isBookModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setIsBookModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                📅 Book a Dining Table
              </h3>
              <button
                onClick={() => setIsBookModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Select Table */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Select Table *
                </label>
                <select
                  value={bookTableId}
                  onChange={(e) => setBookTableId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose a table --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.floor}) · {t.capacity} seats · [{t.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={bookGuestName}
                    onChange={(e) => setBookGuestName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 555-0199"
                    value={bookGuestPhone}
                    onChange={(e) => setBookGuestPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Party Size & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Guests (Pax) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookPartySize}
                    onChange={(e) => setBookPartySize(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={bookGuestEmail}
                    onChange={(e) => setBookGuestEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Special Requests / Seating Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Window seat, anniversary dinner, high chair"
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBook}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#5b45f5',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {submittingBook ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Settings - Floor & Table Plan Management ─ */}
      {isSettingsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 580,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  ⚙️ Table Plan &amp; Floor Settings
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Manage dining floors, add tables, and customize seating capacity
                </span>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 18 }}>
              <button
                onClick={() => setSettingsTab('tables')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: settingsTab === 'tables' ? '2px solid #5b45f5' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: 13,
                  color: settingsTab === 'tables' ? '#5b45f5' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                🪑 Manage Tables
              </button>
              <button
                onClick={() => setSettingsTab('floors')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: settingsTab === 'floors' ? '2px solid #5b45f5' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: 13,
                  color: settingsTab === 'floors' ? '#5b45f5' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                🏢 Floors &amp; Zones
              </button>
            </div>

            {settingsTab === 'tables' ? (
              <div>
                {/* Add Table Form */}
                <form
                  onSubmit={handleAddTableSubmit}
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    + Add New Table
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Table Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Table 13 or VIP 1"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Floor *
                      </label>
                      <select
                        value={newTableFloor}
                        onChange={(e) => setNewTableFloor(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                        }}
                      >
                        {floors.filter((f) => f !== 'All Floors').map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Capacity (Seats) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                        Table Shape
                      </label>
                      <select
                        value={newTableShape}
                        onChange={(e) => setNewTableShape(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                        }}
                      >
                        <option value="square">Square / Round (4-6)</option>
                        <option value="rectangle">Long Rectangle (8-12)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingNewTable}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#5b45f5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {submittingNewTable ? 'Adding...' : 'Add Table to Floor'}
                  </button>
                </form>

                {/* Existing Tables List */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#475569' }}>
                  Existing Tables ({tables.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <strong>{t.name}</strong> · <span style={{ color: '#64748b' }}>{t.floor}</span> ·{' '}
                        <span style={{ color: '#d97706' }}>{t.capacity} seats</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTable(t.id, t.name)}
                        title="Delete Table"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc2626',
                          fontSize: 13,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Add Floor Form */}
                <form
                  onSubmit={handleAddFloorSubmit}
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    + Add New Dining Floor or Zone
                  </h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rooftop Terrace, Outdoor Patio"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={submittingNewFloor}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#5b45f5',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {submittingNewFloor ? 'Adding...' : 'Add Floor'}
                    </button>
                  </div>
                </form>

                {/* Active Floors */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#475569' }}>
                  Configured Floors
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {floors.filter((f) => f !== 'All Floors').map((floor) => {
                    const count = tables.filter((t) => t.floor === floor).length
                    return (
                      <div
                        key={floor}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: '#ffffff',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          🏢 {floor}
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {count} table{count === 1 ? '' : 's'} assigned
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
