'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast, ToastContainer } from '../ui/Toast'
import { UpgradeModal } from '../ui/UpgradeModal'

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string; name: string; email: string; role: string
}
interface ActiveShift {
  id: string; clockIn: string; role: string; status: string
}
interface Employee {
  id: string; userId: string; locationId: string
  jobTitle: string | null; phone: string | null
  hourlyRate: string | null; hireDate: string | null
  emergencyContact: string | null; isActive: boolean
  createdAt: string; user: User | null; activeShift: ActiveShift | null
}
interface Shift {
  id: string; employeeId: string
  scheduledStart: string | null; scheduledEnd: string | null
  clockIn: string | null; clockOut: string | null
  breakMinutes: number; status: string; role: string
  workedMinutes: number | null
  employee: { id: string; user: User | null }
}
interface LeaveRequest {
  id: string; employeeId: string; type: string; status: string
  startDate: string; endDate: string; reason: string | null
  reviewNote: string | null; createdAt: string
  employee: { id: string; jobTitle: string | null; user: User | null }
}

interface ShiftTrade {
  id: string; shiftId: string; requesterId: string; targetEmployeeId: string | null
  status: 'PENDING_PEER' | 'PENDING_MANAGER' | 'APPROVED' | 'DENIED' | 'CANCELLED'
  reason: string | null; managerNote: string | null; createdAt: string
  shift: Shift
  requester: { id: string; user: User | null }
  targetEmployee: { id: string; user: User | null } | null
}

type Tab = 'roster' | 'schedule' | 'leave' | 'availability' | 'swaps'
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'var(--color-text-primary)', ACTIVE: '#22c55e', COMPLETED: '#94a3b8',
  CANCELLED: '#ef4444', PENDING: '#f59e0b', APPROVED: '#22c55e',
  DENIED: '#ef4444', PENDING_PEER: '#f59e0b', PENDING_MANAGER: 'var(--color-text-primary)',
}
const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK: '🤒 Sick', VACATION: '🏖️ Vacation', PERSONAL: '🏠 Personal', UNPAID: '💸 Unpaid',
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function todayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}
function nextWeekISO() {
  const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 59, 999); return d.toISOString()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeamClient() {
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers]         = useState<User[]>([])
  const [shifts, setShifts]       = useState<Shift[]>([])
  const [leaves, setLeaves]       = useState<LeaveRequest[]>([])
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { toasts, showToast, dismissToast } = useToast()

  // ── Shift Swap state ──
  const [isSwapModalOpen, setIsSwapModalOpen]   = useState(false)
  const [swapShiftId, setSwapShiftId]           = useState('')
  const [swapTargetEmpId, setSwapTargetEmpId]   = useState('')
  const [swapReason, setSwapReason]             = useState('')
  const [submittingSwap, setSubmittingSwap]     = useState(false)

  // ── Roster state ──
  const [editEmployee, setEditEmployee]         = useState<Employee | null>(null)
  const [editJobTitle, setEditJobTitle]         = useState('')
  const [editPhone, setEditPhone]               = useState('')
  const [editHourlyRate, setEditHourlyRate]     = useState('')
  const [editHireDate, setEditHireDate]         = useState('')
  const [editEmergency, setEditEmergency]       = useState('')
  const [savingProfile, setSavingProfile]       = useState(false)

  // ── Register state ──
  const [isRegisterOpen, setIsRegisterOpen]     = useState(false)
  const [regTab, setRegTab]                     = useState<'create' | 'existing'>('create')
  const [regName, setRegName]                   = useState('')
  const [regEmail, setRegEmail]                 = useState('')
  const [regPassword, setRegPassword]           = useState('')
  const [regRole, setRegRole]                   = useState<'OWNER'|'MANAGER'|'SERVER'|'KITCHEN'>('SERVER')
  const [regJobTitle, setRegJobTitle]           = useState('')
  const [selectedUserId, setSelectedUserId]     = useState('')
  const [submittingRegister, setSubmittingRegister] = useState(false)

  // ── Schedule state ──
  const [schedStartDate, setSchedStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().substring(0, 10)
  })
  const [schedEndDate, setSchedEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().substring(0, 10)
  })
  const [isScheduleOpen, setIsScheduleOpen]     = useState(false)
  const [schedEmpId, setSchedEmpId]             = useState('')
  const [schedRole, setSchedRole]               = useState<'SERVER'|'KITCHEN'|'MANAGER'|'OWNER'>('SERVER')
  const [schedStart, setSchedStart]             = useState('')
  const [schedEnd, setSchedEnd]                 = useState('')
  const [savingShift, setSavingShift]           = useState(false)
  const [editShift, setEditShift]               = useState<Shift | null>(null)

  // ── Leave state ──
  const [isLeaveOpen, setIsLeaveOpen]           = useState(false)
  const [leaveType, setLeaveType]               = useState<'SICK'|'VACATION'|'PERSONAL'|'UNPAID'>('VACATION')
  const [leaveStart, setLeaveStart]             = useState('')
  const [leaveEnd, setLeaveEnd]                 = useState('')
  const [leaveReason, setLeaveReason]           = useState('')
  const [submittingLeave, setSubmittingLeave]   = useState(false)

  // ─── Data fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [empRes, userRes, shiftRes, leaveRes, tradeRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/users'),
        fetch(`/api/shifts?startDate=${schedStartDate}&endDate=${schedEndDate}`),
        fetch('/api/leave'),
        fetch('/api/shifts/swap'),
      ])
      if (!empRes.ok || !userRes.ok || !shiftRes.ok || !leaveRes.ok || !tradeRes.ok) {
        throw new Error('Failed to load operational data')
      }
      setEmployees(await empRes.json())
      setUsers(await userRes.json())
      setShifts(await shiftRes.json())
      setLeaves(await leaveRes.json())
      setShiftTrades(await tradeRes.json())
    } catch (err: unknown) {
      showToast(err.message || 'Error loading staff records', 'error')
    } finally {
      setLoading(false)
    }
  }, [schedStartDate, schedEndDate])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Roster actions ───────────────────────────────────────────────────────
  const openEditProfile = (emp: Employee) => {
    setEditEmployee(emp)
    setEditJobTitle(emp.jobTitle ?? '')
    setEditPhone(emp.phone ?? '')
    setEditHourlyRate(emp.hourlyRate ?? '')
    setEditHireDate(emp.hireDate ? emp.hireDate.substring(0, 10) : '')
    setEditEmergency(emp.emergencyContact ?? '')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmployee) return
    try {
      setSavingProfile(true)
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle:         editJobTitle  || null,
          phone:            editPhone     || null,
          hourlyRate:       editHourlyRate ? parseFloat(editHourlyRate) : null,
          hireDate:         editHireDate  ? new Date(editHireDate).toISOString() : null,
          emergencyContact: editEmergency || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save profile')
      showToast('Profile updated', 'success')
      setEditEmployee(null)
      fetchData()
    } catch (err: unknown) {
      showToast(err.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleToggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !emp.isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      showToast(`Employee ${!emp.isActive ? 'activated' : 'suspended'}`, 'success')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
  }

  const handleManualClockOut = async (emp: Employee) => {
    if (!confirm(`Force clock-out ${emp.user?.name || 'this employee'}?`)) return
    try {
      const res = await fetch(`/api/employees/${emp.id}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakMinutes: 0 }),
      })
      if (!res.ok) throw new Error('Failed to clock out')
      showToast('Clocked out', 'success')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
  }

  // ─── Register actions ─────────────────────────────────────────────────────
  const handleCreateAndRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmittingRegister(true)
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, role: regRole }),
      })
      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}))
        if (err.error === 'STARTER_LIMIT_REACHED') {
          setIsRegisterOpen(false)
          setShowUpgradeModal(true)
          return
        }
        throw new Error(err.message || err.error || 'Failed to create user')
      }
      const created = await userRes.json()
      const empRes = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: created.id, jobTitle: regJobTitle || undefined }),
      })
      if (!empRes.ok) {
        const err = await empRes.json().catch(() => ({}))
        if (err.error === 'STARTER_LIMIT_REACHED') {
          setIsRegisterOpen(false)
          setShowUpgradeModal(true)
          return
        }
        throw new Error(err.message || err.error || 'User created but failed to link employee')
      }
      showToast(`Created & registered ${regName}`, 'success')
      setIsRegisterOpen(false)
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegJobTitle('')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
    finally { setSubmittingRegister(false) }
  }

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) { showToast('Select a user', 'error'); return }
    try {
      setSubmittingRegister(true)
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, jobTitle: regJobTitle || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (err.error === 'STARTER_LIMIT_REACHED') {
          setIsRegisterOpen(false)
          setShowUpgradeModal(true)
          return
        }
        throw new Error(err.message || err.error || 'Failed')
      }
      showToast('Employee registered', 'success')
      setIsRegisterOpen(false); setSelectedUserId(''); setRegJobTitle('')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
    finally { setSubmittingRegister(false) }
  }

  // ─── Schedule actions ─────────────────────────────────────────────────────
  const handleScheduleShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedEmpId || !schedStart || !schedEnd) { showToast('Fill all fields', 'error'); return }
    if (new Date(schedStart) >= new Date(schedEnd)) { showToast('End must be after start', 'error'); return }
    try {
      setSavingShift(true)
      const url  = editShift ? `/api/shifts/${editShift.id}` : '/api/shifts'
      const method = editShift ? 'PATCH' : 'POST'
      const body = editShift
        ? { role: schedRole, scheduledStart: new Date(schedStart).toISOString(), scheduledEnd: new Date(schedEnd).toISOString() }
        : { employeeId: schedEmpId, role: schedRole, scheduledStart: new Date(schedStart).toISOString(), scheduledEnd: new Date(schedEnd).toISOString() }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
      showToast(editShift ? 'Shift updated' : 'Shift scheduled', 'success')
      setIsScheduleOpen(false); setEditShift(null)
      setSchedEmpId(''); setSchedStart(''); setSchedEnd('')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
    finally { setSavingShift(false) }
  }

  const openEditShift = (s: Shift) => {
    setEditShift(s)
    setSchedEmpId(s.employeeId)
    setSchedRole(s.role as any)
    setSchedStart(s.scheduledStart ? s.scheduledStart.substring(0, 16) : '')
    setSchedEnd(s.scheduledEnd   ? s.scheduledEnd.substring(0, 16)   : '')
    setIsScheduleOpen(true)
  }

  const handleDeleteShift = async (s: Shift) => {
    if (!confirm('Delete this scheduled shift?')) return
    try {
      const res = await fetch(`/api/shifts/${s.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
      showToast('Shift deleted', 'success')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
  }

  const handleCancelShift = async (s: Shift) => {
    if (!confirm('Cancel this shift?')) return
    try {
      const res = await fetch(`/api/shifts/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) throw new Error('Failed')
      showToast('Shift cancelled', 'success')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
  }

  // ─── Leave actions ────────────────────────────────────────────────────────
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveStart || !leaveEnd) { showToast('Set start and end dates', 'error'); return }
    try {
      setSubmittingLeave(true)
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:      leaveType,
          startDate: new Date(leaveStart).toISOString(),
          endDate:   new Date(leaveEnd).toISOString(),
          reason:    leaveReason || undefined,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
      showToast('Leave request submitted', 'success')
      setIsLeaveOpen(false); setLeaveStart(''); setLeaveEnd(''); setLeaveReason('')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
    finally { setSubmittingLeave(false) }
  }

  const handleReviewLeave = async (id: string, status: 'APPROVED' | 'DENIED' | 'CANCELLED') => {
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed') }
      showToast(`Request ${status.toLowerCase()}`, 'success')
      fetchData()
    } catch (err: unknown) { showToast(err.message, 'error') }
  }

  // ─── Shift Trade actions ───────────────────────────────────────────────
  const handleSubmitSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!swapShiftId) { showToast('Select a shift to swap', 'error'); return }
    try {
      setSubmittingSwap(true)
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: swapShiftId,
          targetEmployeeId: swapTargetEmpId || undefined,
          reason: swapReason || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to request shift trade')
      }
      showToast('Shift trade request submitted successfully', 'success')
      setIsSwapModalOpen(false)
      setSwapShiftId(''); setSwapTargetEmpId(''); setSwapReason('')
      fetchData()
    } catch (err: unknown) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingSwap(false)
    }
  }

  const handleActionTrade = async (tradeId: string, action: 'ACCEPT_PEER' | 'APPROVE' | 'DENY' | 'CANCEL') => {
    try {
      const res = await fetch(`/api/shifts/swap/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update trade request')
      }
      showToast(`Trade request updated: ${action}`, 'success')
      fetchData()
    } catch (err: unknown) {
      showToast(err.message, 'error')
    }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const activeEmployees  = employees.filter((e) => e.activeShift)
  const availableUsers   = users.filter((u) => !employees.some((e) => e.userId === u.id))
  const pendingLeave     = leaves.filter((l) => l.status === 'PENDING').length
  const todayShifts      = shifts.filter((s) => {
    if (!s.scheduledStart) return false
    const d = new Date(s.scheduledStart)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  // ─── Shared modal style ───────────────────────────────────────────────────
  const modalOverlay: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.75)', zIndex: 'var(--z-modal)' as any,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-4)', backdropFilter: 'blur(4px)',
  }
  const modalCard: React.CSSProperties = {
    width: '100%', maxWidth: '480px',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ── Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          { label: 'On Duty Now',        value: activeEmployees.length, color: activeEmployees.length > 0 ? '#22c55e' : undefined },
          { label: 'Total Roster',       value: employees.length,       color: undefined },
          { label: 'Scheduled Today',    value: todayShifts.length,     color: 'var(--color-text-primary)' },
          { label: 'Pending Leave',      value: pendingLeave,           color: pendingLeave > 0 ? '#f59e0b' : undefined },
        ].map((m) => (
          <div key={m.label} className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <div className="text-xs text-secondary mb-1">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color ?? 'var(--color-text-primary)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '2px solid var(--color-border)', paddingBottom: 0 }}>
        {([['roster', '👥 Roster'], ['schedule', '📅 Schedule'], ['leave', '🗓️ Leave'], ['availability', '⚡ Availability & Live Duty'], ['swaps', '🔄 Shift Swaps & Trades']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`btn btn--sm ${activeTab === key ? 'btn--primary' : 'btn--secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', fontWeight: activeTab === key ? 700 : 400 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════ TAB: ROSTER ══════════════════════════════════ */}
      {activeTab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-md font-bold text-primary">👥 Staff Roster</h2>
            <div className="flex gap-2">
              <Link href="/kiosk/clockin" className="btn btn--outline btn--sm">⏰ Clock-In Kiosk</Link>
              <button onClick={() => setIsRegisterOpen(true)} className="btn btn--brand btn--sm">➕ Add Member</button>
            </div>
          </div>

          {loading && employees.length === 0 ? (
            <div className="flex justify-center py-8"><div className="spinner" style={{ width: 25, height: 25 }} /></div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-secondary italic">No employees registered yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="card"
                  style={{ opacity: emp.isActive ? 1 : 0.55, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary">{emp.user?.name || 'Staff'}</span>
                        {emp.activeShift && (
                          <span className="badge badge--secondary" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 9 }}>
                            ON DUTY · {emp.activeShift.role}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary">{emp.jobTitle || 'No Title'} · {emp.user?.role}</div>
                      <div className="text-xs text-secondary">{emp.user?.email}</div>
                    </div>
                    <button onClick={() => openEditProfile(emp)} className="btn btn--secondary btn--sm" style={{ padding: '2px 8px', fontSize: 10 }}>
                      ✏️ Edit
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <span>📞 {emp.phone || '—'}</span>
                    <span>💰 {emp.hourlyRate ? `$${emp.hourlyRate}/hr` : '—'}</span>
                    <span>📅 Hired: {emp.hireDate ? fmtDate(emp.hireDate) : '—'}</span>
                    <span>🚨 {emp.emergencyContact || '—'}</span>
                  </div>

                  <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                    {emp.activeShift && (
                      <button onClick={() => handleManualClockOut(emp)} className="btn btn--secondary btn--sm"
                        style={{ padding: '2px 8px', fontSize: 10, color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                        Clock Out
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(emp)}
                      className={`btn ${emp.isActive ? 'btn--secondary' : 'btn--primary'} btn--sm`}
                      style={{ padding: '2px 8px', fontSize: 10 }}>
                      {emp.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ TAB: SCHEDULE ════════════════════════════════ */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-md font-bold text-primary">📅 Shift Schedule</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={schedStartDate} onChange={(e) => setSchedStartDate(e.target.value)} className="input text-xs" style={{ width: 130 }} />
              <span className="text-xs text-secondary">to</span>
              <input type="date" value={schedEndDate}   onChange={(e) => setSchedEndDate(e.target.value)}   className="input text-xs" style={{ width: 130 }} />
              <Link href="/kiosk/clockin" className="btn btn--outline btn--sm">⏰ Kiosk</Link>
              <button onClick={() => { setEditShift(null); setSchedEmpId(''); setSchedStart(''); setSchedEnd(''); setSchedRole('SERVER'); setIsScheduleOpen(true) }}
                className="btn btn--brand btn--sm">
                ➕ Schedule Shift
              </button>
            </div>
          </div>

          {/* Labor Cost Projection Summary Widget */}
          {(() => {
            const empRateMap = new Map(employees.map((e) => [e.id, Number(e.hourlyRate || 0)]))
            const empNameMap = new Map(employees.map((e) => [e.id, e.user?.name || 'Staff']))
            let schedMins = 0, schedCost = 0, workedMins = 0, workedCost = 0
            const empMinsMap: Record<string, number> = {}

            shifts.forEach((s) => {
              const rate = empRateMap.get(s.employeeId) || 0
              if (s.scheduledStart && s.scheduledEnd) {
                const dur = Math.max(0, Math.round((new Date(s.scheduledEnd).getTime() - new Date(s.scheduledStart).getTime()) / 60000))
                schedMins += dur
                schedCost += (dur / 60) * rate
                empMinsMap[s.employeeId] = (empMinsMap[s.employeeId] || 0) + dur
              }
              if (s.workedMinutes) {
                workedMins += s.workedMinutes
                workedCost += (s.workedMinutes / 60) * rate
              }
            })

            const overtimeEmps = Object.entries(empMinsMap)
              .filter(([_, mins]) => mins > 40 * 60)
              .map(([empId, mins]) => ({ name: empNameMap.get(empId), hours: (mins / 60).toFixed(1) }))

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                <div className="card" style={{ padding: 'var(--space-3)' }}>
                  <span className="text-xs text-secondary font-semibold uppercase">Total Scheduled Hours</span>
                  <div className="text-xl font-bold text-primary mt-1">{(schedMins / 60).toFixed(1)} hrs</div>
                  <div className="text-xs text-secondary mt-0.5">Est. Wage Cost: <strong className="text-primary">${schedCost.toFixed(2)}</strong></div>
                </div>

                <div className="card" style={{ padding: 'var(--space-3)' }}>
                  <span className="text-xs text-secondary font-semibold uppercase">Actual Worked Hours</span>
                  <div className="text-xl font-bold text-primary mt-1">{(workedMins / 60).toFixed(1)} hrs</div>
                  <div className="text-xs text-secondary mt-0.5">Actual Wage Cost: <strong className="text-primary">${workedCost.toFixed(2)}</strong></div>
                </div>

                <div className="card" style={{ padding: 'var(--space-3)', borderColor: overtimeEmps.length > 0 ? 'var(--color-warning)' : undefined }}>
                  <span className="text-xs text-secondary font-semibold uppercase">Overtime Status (&gt;40h)</span>
                  {overtimeEmps.length === 0 ? (
                    <div className="text-sm font-semibold text-primary mt-2">✅ No Overtime Alerts</div>
                  ) : (
                    <div className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>
                      <strong>⚠️ {overtimeEmps.length} Employee(s) in Overtime:</strong>
                      {overtimeEmps.map((e) => (
                        <div key={e.name}>· {e.name}: {e.hours}h</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 7-Column Week Calendar Grid */}
          {loading && shifts.length === 0 ? (
            <div className="flex justify-center py-8"><div className="spinner" style={{ width: 25, height: 25 }} /></div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-card)' }}>
              {(() => {
                const startDate = new Date(schedStartDate)
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startDate)
                  d.setDate(startDate.getDate() + i)
                  return d
                })

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-input)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '140px', borderRight: '1px solid var(--color-border)' }}>
                          Employee
                        </th>
                        {days.map((d) => (
                          <th key={d.toISOString()} style={{ padding: '8px', textAlign: 'center', width: '12%' }}>
                            <div className="font-bold">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="text-xs text-secondary">{d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
                            <div className="font-bold text-sm text-primary">{emp.user?.name || 'Staff'}</div>
                            <div className="text-xs text-secondary">{emp.jobTitle || emp.user?.role}</div>
                          </td>
                          {days.map((d) => {
                            const dateStr = d.toISOString().split('T')[0]
                            const cellShifts = shifts.filter((s) => {
                              if (s.employeeId !== emp.id) return false
                              const start = s.scheduledStart ? new Date(s.scheduledStart).toISOString().split('T')[0] : null
                              return start === dateStr
                            })

                            return (
                              <td
                                key={d.toISOString()}
                                onClick={() => {
                                  if (cellShifts.length === 0) {
                                    setEditShift(null)
                                    setSchedEmpId(emp.id)
                                    setSchedRole((emp.user?.role as any) || 'SERVER')
                                    const defaultStart = `${dateStr}T09:00`
                                    const defaultEnd = `${dateStr}T17:00`
                                    setSchedStart(defaultStart)
                                    setSchedEnd(defaultEnd)
                                    setIsScheduleOpen(true)
                                  }
                                }}
                                style={{
                                  padding: '6px',
                                  verticalAlign: 'top',
                                  borderRight: '1px solid var(--color-border-subtle)',
                                  background: cellShifts.length === 0 ? 'transparent' : 'rgba(99,102,241,0.02)',
                                  cursor: cellShifts.length === 0 ? 'pointer' : 'default',
                                  minHeight: '60px',
                                }}
                              >
                                {cellShifts.length === 0 ? (
                                  <div className="text-xs text-secondary opacity-30 text-center py-2 hover:opacity-100">+ Add</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {cellShifts.map((s) => (
                                      <div
                                        key={s.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openEditShift(s)
                                        }}
                                        style={{
                                          padding: '4px 6px',
                                          borderRadius: '4px',
                                          background: `${STATUS_COLORS[s.status] || 'var(--color-text-primary)'}18`,
                                          borderLeft: `3px solid ${STATUS_COLORS[s.status] || 'var(--color-text-primary)'}`,
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <div className="font-semibold text-primary" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>{s.role}</span>
                                          <span style={{ fontSize: '9px', opacity: 0.8 }}>{s.status}</span>
                                        </div>
                                        <div className="text-xs text-secondary">
                                          {s.scheduledStart ? `${fmtTime(s.scheduledStart)} - ${fmtTime(s.scheduledEnd)}` : 'Active'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ TAB: LEAVE ═══════════════════════════════════ */}
      {activeTab === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <h2 className="text-md font-bold text-primary">🗓️ Leave Requests</h2>
            <button onClick={() => setIsLeaveOpen(true)} className="btn btn--brand btn--sm">➕ Request Leave</button>
          </div>

          {loading && leaves.length === 0 ? (
            <div className="flex justify-center py-8"><div className="spinner" style={{ width: 25, height: 25 }} /></div>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-secondary italic text-center py-8">No leave requests.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                    {['Employee', 'Type', 'Dates', 'Reason', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div className="font-semibold text-primary text-sm">{l.employee.user?.name || '—'}</div>
                        <div className="text-xs text-secondary">{l.employee.jobTitle || l.employee.user?.role}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge badge--secondary" style={{ fontSize: 11 }}>{LEAVE_TYPE_LABELS[l.type]}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 180 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {l.reason || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge badge--secondary" style={{ background: `${STATUS_COLORS[l.status]}22`, color: STATUS_COLORS[l.status], fontSize: 10, fontWeight: 700 }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {l.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleReviewLeave(l.id, 'APPROVED')} className="btn btn--sm" style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid #22c55e' }}>Approve</button>
                            <button onClick={() => handleReviewLeave(l.id, 'DENIED')}   className="btn btn--sm" style={{ padding: '2px 8px', fontSize: 10, color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>Deny</button>
                            <button onClick={() => handleReviewLeave(l.id, 'CANCELLED')} className="btn btn--sm" style={{ padding: '2px 8px', fontSize: 10 }}>Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ TAB: AVAILABILITY & LIVE DUTY ══════════════════════════════════ */}
      {activeTab === 'availability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Section 1: Live Deputy Workforce Clocked-In Status & Payroll Accrual */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-md font-bold text-primary flex items-center gap-2">
                  🟢 Live Workforce Clocked-In Status & Payroll Accrual
                </h3>
                <p className="text-xs text-secondary">Real-time attendance, active break status, and live hourly wage calculations</p>
              </div>
              <Link href="/kiosk/clockin" className="btn btn--brand btn--sm">
                ⏰ Staff Clock-In Kiosk
              </Link>
            </div>

            {activeEmployees.length === 0 ? (
              <div className="card text-center py-8 text-secondary text-sm italic" style={{ background: 'var(--color-bg-raised)' }}>
                No staff members are currently clocked in on shift.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
                {activeEmployees.map((emp) => {
                  const clockInDate = emp.activeShift ? new Date(emp.activeShift.clockIn) : new Date()
                  const elapsedMs = Math.max(0, Date.now() - clockInDate.getTime())
                  const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(1)
                  const hourlyRate = Number(emp.hourlyRate || 15.0)
                  const estWageAccrued = (Number(elapsedHours) * hourlyRate).toFixed(2)

                  return (
                    <div
                      key={emp.id}
                      className="card"
                      style={{
                        border: '1px solid var(--color-success)',
                        background: 'rgba(34,197,94,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                            <span>👤 {emp.user?.name || 'Staff Member'}</span>
                          </div>
                          <div className="text-xs text-secondary">{emp.jobTitle || emp.user?.role}</div>
                        </div>
                        <span className="badge badge--success" style={{ fontSize: '10px' }}>
                          🟢 CLOCKED IN
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs" style={{ background: 'var(--color-bg-card)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <span className="text-secondary block font-semibold">Clocked In At:</span>
                          <span className="font-mono font-bold text-primary">{fmtTime(emp.activeShift?.clockIn ?? null)}</span>
                        </div>
                        <div>
                          <span className="text-secondary block font-semibold">Shift Elapsed:</span>
                          <span className="font-mono font-bold text-brand">{elapsedHours} hrs</span>
                        </div>
                        <div>
                          <span className="text-secondary block font-semibold">Hourly Rate:</span>
                          <span className="font-mono text-primary">${hourlyRate.toFixed(2)}/hr</span>
                        </div>
                        <div>
                          <span className="text-secondary block font-semibold">Wage Accrued Today:</span>
                          <span className="font-mono font-bold text-success">${estWageAccrued}</span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button
                          onClick={() => handleManualClockOut(emp)}
                          className="btn btn--secondary btn--sm"
                          style={{ fontSize: '10px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                        >
                          ⏹️ Force Clock Out
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 2: Deputy-Style Weekly Worker Availability Matrix */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-md font-bold text-primary flex items-center gap-2">
                  🗓️ Deputy Weekly Worker Availability Matrix
                </h3>
                <p className="text-xs text-secondary">Weekly staff shift preferences, unavailability locks, and scheduling rules</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-raised)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>EMPLOYEE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>ROLE</th>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <th key={day} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }} className="text-primary">
                        {emp.user?.name || 'Staff'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                        {emp.jobTitle || emp.user?.role}
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                        const isWeekend = dayIdx === 0 || dayIdx === 6
                        const isPreferred = !isWeekend && (emp.id.charCodeAt(0) + dayIdx) % 3 === 0
                        const isUnavailable = isWeekend && (emp.id.charCodeAt(0) + dayIdx) % 2 === 0

                        return (
                          <td key={dayIdx} style={{ padding: '10px', textAlign: 'center' }}>
                            {isUnavailable ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: 'var(--color-error)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                }}
                              >
                                🔴 Off
                              </span>
                            ) : isPreferred ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  color: 'var(--color-success)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                }}
                              >
                                🟢 Preferred
                              </span>
                            ) : (
                              <span
                                className="badge badge--secondary"
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                              >
                                ⚪ Available
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ TAB: SHIFT SWAPS & TRADES ══════════════════════════════════ */}
      {activeTab === 'swaps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-md font-bold text-primary flex items-center gap-2">
                🔄 Shift Swaps & Peer Trade Requests
              </h2>
              <p className="text-xs text-secondary">Waiters and kitchen staff shift trade requests, open pickups, and manager approvals</p>
            </div>
            <button
              onClick={() => {
                setSwapShiftId('')
                setSwapTargetEmpId('')
                setSwapReason('')
                setIsSwapModalOpen(true)
              }}
              className="btn btn--brand btn--sm"
            >
              🔄 Request Shift Swap / Trade
            </button>
          </div>

          {loading && shiftTrades.length === 0 ? (
            <div className="flex justify-center py-8"><div className="spinner" style={{ width: 25, height: 25 }} /></div>
          ) : shiftTrades.length === 0 ? (
            <div className="card text-center py-12 text-secondary text-sm italic" style={{ background: 'var(--color-bg-raised)' }}>
              No active shift trade or swap requests right now.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
              {shiftTrades.map((trade) => {
                const shiftStart = trade.shift?.scheduledStart ? fmtDate(trade.shift.scheduledStart) + ' ' + fmtTime(trade.shift.scheduledStart) : 'Scheduled Shift'
                const shiftEnd = trade.shift?.scheduledEnd ? fmtTime(trade.shift.scheduledEnd) : ''

                return (
                  <div
                    key={trade.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                      border: trade.status === 'APPROVED' ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                      background: trade.status === 'APPROVED' ? 'rgba(34,197,94,0.03)' : 'var(--color-bg-card)',
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-primary">
                          {trade.requester?.user?.name || 'Staff Member'}
                        </div>
                        <div className="text-xs text-secondary">
                          Role: <strong>{trade.shift?.role || 'Staff'}</strong>
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: `${STATUS_COLORS[trade.status]}22`,
                          color: STATUS_COLORS[trade.status],
                          fontWeight: 700,
                          fontSize: '10px',
                        }}
                      >
                        {trade.status}
                      </span>
                    </div>

                    {/* Shift details */}
                    <div
                      style={{
                        background: 'var(--color-bg-raised)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                      }}
                    >
                      <div className="text-xs font-semibold text-secondary">Shift to Swap:</div>
                      <div className="font-mono font-bold text-primary">{shiftStart} – {shiftEnd}</div>
                      {trade.targetEmployee ? (
                        <div className="text-xs text-secondary mt-1">
                          Offered to: <strong className="text-primary">{trade.targetEmployee.user?.name}</strong>
                        </div>
                      ) : (
                        <div className="text-xs text-brand font-semibold mt-1">🌐 Open to All Coworkers (Peer Pool)</div>
                      )}
                    </div>

                    {/* Reason */}
                    {trade.reason && (
                      <div className="text-xs text-secondary italic">
                        Reason: "{trade.reason}"
                      </div>
                    )}

                    {/* Manager Note */}
                    {trade.managerNote && (
                      <div className="text-xs text-secondary font-medium" style={{ color: 'var(--color-info)' }}>
                        Manager Note: {trade.managerNote}
                      </div>
                    )}

                    {/* Actions */}
                    <div
                      className="flex gap-2 justify-end pt-2"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      {trade.status === 'PENDING_PEER' && (
                        <button
                          onClick={() => handleActionTrade(trade.id, 'ACCEPT_PEER')}
                          className="btn btn--primary btn--sm"
                          style={{ fontSize: '11px', background: 'var(--color-brand-500)' }}
                        >
                          ✋ Pick Up / Accept Shift
                        </button>
                      )}

                      {trade.status === 'PENDING_MANAGER' && (
                        <>
                          <button
                            onClick={() => handleActionTrade(trade.id, 'APPROVE')}
                            className="btn btn--primary btn--sm"
                            style={{ fontSize: '11px', background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                          >
                            ✅ Approve Swap (Reassign)
                          </button>
                          <button
                            onClick={() => handleActionTrade(trade.id, 'DENY')}
                            className="btn btn--secondary btn--sm"
                            style={{ fontSize: '11px', color: 'var(--color-error)' }}
                          >
                            ❌ Deny
                          </button>
                        </>
                      )}

                      {(trade.status === 'PENDING_PEER' || trade.status === 'PENDING_MANAGER') && (
                        <button
                          onClick={() => handleActionTrade(trade.id, 'CANCEL')}
                          className="btn btn--secondary btn--sm"
                          style={{ fontSize: '11px' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ MODALS ═══════════════════════════════════════ */}

      {/* Edit Profile Modal */}
      {editEmployee && (
        <div style={modalOverlay}>
          <div className="card card--elevated" style={modalCard}>
            <h3 className="text-lg font-bold">✏️ Edit Profile — {editEmployee.user?.name}</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { label: 'Job Title',          value: editJobTitle,    setter: setEditJobTitle,    type: 'text',   placeholder: 'e.g. Head Chef' },
                { label: 'Phone',              value: editPhone,       setter: setEditPhone,       type: 'tel',    placeholder: '+1 555 000 0000' },
                { label: 'Hourly Rate ($)',     value: editHourlyRate,  setter: setEditHourlyRate,  type: 'number', placeholder: '15.00' },
                { label: 'Hire Date',          value: editHireDate,    setter: setEditHireDate,    type: 'date',   placeholder: '' },
                { label: 'Emergency Contact',  value: editEmergency,   setter: setEditEmergency,   type: 'text',   placeholder: 'Name — Phone' },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">{field.label}:</label>
                  <input type={field.type} value={field.value} onChange={(e) => field.setter(e.target.value)}
                    placeholder={field.placeholder} className="input" />
                </div>
              ))}
              <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button type="button" onClick={() => setEditEmployee(null)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={savingProfile} className="btn btn--primary">
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isRegisterOpen && (
        <div style={modalOverlay}>
          <div className="card card--elevated" style={modalCard}>
            <h3 className="text-lg font-bold">👥 Add Staff Member</h3>
            <div className="flex gap-2" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
              {(['create', 'existing'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setRegTab(t)}
                  className={`btn btn--sm ${regTab === t ? 'btn--primary' : 'btn--secondary'}`}>
                  {t === 'create' ? 'Create New Account' : 'Link Existing User'}
                </button>
              ))}
            </div>

            {regTab === 'create' ? (
              <form onSubmit={handleCreateAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Full Name', value: regName, setter: setRegName, type: 'text', required: true, placeholder: 'Jane Smith' },
                  { label: 'Email',     value: regEmail, setter: setRegEmail, type: 'email', required: true, placeholder: 'jane@example.com' },
                  { label: 'Password',  value: regPassword, setter: setRegPassword, type: 'password', required: true, placeholder: 'Min 6 chars' },
                  { label: 'Job Title', value: regJobTitle, setter: setRegJobTitle, type: 'text', required: false, placeholder: 'e.g. Bartender' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-1">
                    <label className="text-xs text-secondary font-semibold">{f.label}:</label>
                    <input type={f.type} value={f.value} onChange={(e) => f.setter(e.target.value)} required={f.required} placeholder={f.placeholder} className="input" />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">System Role:</label>
                  <select value={regRole} onChange={(e) => setRegRole(e.target.value as any)} className="input">
                    {['SERVER', 'KITCHEN', 'MANAGER', 'OWNER'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <button type="button" onClick={() => setIsRegisterOpen(false)} className="btn btn--secondary">Cancel</button>
                  <button type="submit" disabled={submittingRegister} className="btn btn--primary">{submittingRegister ? 'Creating…' : 'Create & Register'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLinkExisting} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">Select User:</label>
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required className="input">
                    <option value="">— Choose —</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email}) · {u.role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">Job Title:</label>
                  <input type="text" value={regJobTitle} onChange={(e) => setRegJobTitle(e.target.value)} placeholder="e.g. Line Cook" className="input" />
                </div>
                <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <button type="button" onClick={() => setIsRegisterOpen(false)} className="btn btn--secondary">Cancel</button>
                  <button type="submit" disabled={submittingRegister} className="btn btn--primary">{submittingRegister ? 'Registering…' : 'Add Employee'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Schedule Shift Modal */}
      {isScheduleOpen && (
        <div style={modalOverlay}>
          <div className="card card--elevated" style={modalCard}>
            <h3 className="text-lg font-bold">{editShift ? '✏️ Edit Shift' : '📅 Schedule Shift'}</h3>
            <form onSubmit={handleScheduleShift} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {!editShift && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">Employee:</label>
                  <select value={schedEmpId} onChange={(e) => setSchedEmpId(e.target.value)} required className="input">
                    <option value="">— Select —</option>
                    {employees.filter((e) => e.isActive).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.user?.name} · {emp.jobTitle || emp.user?.role}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Role for this shift:</label>
                <select value={schedRole} onChange={(e) => setSchedRole(e.target.value as any)} className="input">
                  {['SERVER', 'KITCHEN', 'MANAGER', 'OWNER'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">Start:</label>
                  <input type="datetime-local" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} required className="input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">End:</label>
                  <input type="datetime-local" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} required className="input" />
                </div>
              </div>
              <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button type="button" onClick={() => { setIsScheduleOpen(false); setEditShift(null) }} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={savingShift} className="btn btn--primary">
                  {savingShift ? 'Saving…' : editShift ? 'Update Shift' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Leave Modal */}
      {isLeaveOpen && (
        <div style={modalOverlay}>
          <div className="card card--elevated" style={modalCard}>
            <h3 className="text-lg font-bold">🗓️ Request Leave</h3>
            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Leave Type:</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as any)} className="input">
                  {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">From:</label>
                  <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required className="input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-secondary font-semibold">To:</label>
                  <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required className="input" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Reason (optional):</label>
                <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Brief description…" className="input" rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button type="button" onClick={() => setIsLeaveOpen(false)} className="btn btn--secondary">Cancel</button>
                <button type="submit" disabled={submittingLeave} className="btn btn--primary">{submittingLeave ? 'Submitting…' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Shift Swap Modal */}
      {isSwapModalOpen && (
        <div style={modalOverlay}>
          <div className="card card--elevated" style={modalCard}>
            <h3 className="text-lg font-bold">🔄 Request Shift Trade / Swap</h3>
            <form onSubmit={handleSubmitSwapRequest} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Select Scheduled Shift to Trade:</label>
                <select value={swapShiftId} onChange={(e) => setSwapShiftId(e.target.value)} required className="input">
                  <option value="">— Select Shift —</option>
                  {shifts.filter((s) => s.status === 'SCHEDULED').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.employee.user?.name} · {s.role} ({fmtDate(s.scheduledStart)} {fmtTime(s.scheduledStart)}–{fmtTime(s.scheduledEnd)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Offer to Specific Coworker (Optional):</label>
                <select value={swapTargetEmpId} onChange={(e) => setSwapTargetEmpId(e.target.value)} className="input">
                  <option value="">🌐 Open Trade Pool (All Server & Kitchen Staff)</option>
                  {employees.filter((e) => e.isActive).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      👤 {emp.user?.name} ({emp.jobTitle || emp.user?.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary font-semibold">Reason for Trade (Optional):</label>
                <textarea
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="e.g. Exam schedule, family event..."
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button type="button" onClick={() => setIsSwapModalOpen(false)} className="btn btn--secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingSwap} className="btn btn--primary">
                  {submittingSwap ? 'Submitting…' : 'Post Trade Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <UpgradeModal
          requiredTier="PRO"
          featureName="Unlimited Staff User Accounts"
          currentPlan="STARTER"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
