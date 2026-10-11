'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast, ToastContainer } from '../ui/Toast'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface ActiveShift {
  id: string
  clockIn: string
  role: string
  status: string
}

interface Employee {
  id: string
  userId: string
  locationId: string
  jobTitle: string | null
  phone: string | null
  hourlyRate: string | null
  emergencyContact: string | null
  isActive: boolean
  user: User | null
  activeShift: ActiveShift | null
}

function fmtTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ClockInKioskClient({ locationName }: { locationName: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState<string>('ALL')
  const [loading, setLoading]     = useState(true)
  const [actionId, setActionId]   = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const { toasts, showToast, dismissToast } = useToast()

  // Digital clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => clearInterval(timer)
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Failed to load employee list')
      const data = await res.json()
      setEmployees(data)
    } catch (err: any) {
      showToast(err.message || 'Error fetching staff roster', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const handleClockIn = async (emp: Employee) => {
    try {
      setActionId(emp.id)
      const res = await fetch(`/api/employees/${emp.id}/clock-in`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clock in')
      showToast(`✅ ${emp.user?.name || 'Employee'} successfully clocked in!`, 'success')
      await fetchEmployees()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleClockOut = async (emp: Employee) => {
    try {
      setActionId(emp.id)
      const res = await fetch(`/api/employees/${emp.id}/clock-out`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clock out')
      const mins = data.workedMinutes ?? 0
      const hrs = (mins / 60).toFixed(1)
      showToast(`👋 ${emp.user?.name || 'Employee'} clocked out (${hrs} hrs logged).`, 'info')
      await fetchEmployees()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  const filtered = employees.filter((emp) => {
    const nameMatches = emp.user?.name.toLowerCase().includes(search.toLowerCase()) ||
                        emp.jobTitle?.toLowerCase().includes(search.toLowerCase())
    const roleMatches = filterRole === 'ALL' || emp.user?.role === filterRole
    return nameMatches && roleMatches
  })

  const clockedInCount = employees.filter(e => !!e.activeShift).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Staff Clock-In Kiosk</h1>
            <span className="badge badge--brand">{locationName}</span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {clockedInCount} of {employees.length} staff members currently clocked in
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-brand">{currentTime}</div>
            <div className="text-xs text-zinc-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          </div>
          <Link
            href="/dashboard/team"
            className="btn btn--outline text-xs px-3 py-2"
          >
            ← Back to Team Mgmt
          </Link>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 my-6">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="🔍 Search employee name or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'SERVER', 'KITCHEN', 'MANAGER', 'OWNER'].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`btn text-xs px-3 py-1.5 ${
                filterRole === role ? 'btn--primary' : 'btn--outline'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <span>Loading staff roster...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 card text-center p-12">
          <p>No matching active employees found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => {
            const isClockedIn = !!emp.activeShift
            const isProcessing = actionId === emp.id

            return (
              <div
                key={emp.id}
                className={`card flex flex-col justify-between transition-all ${
                  isClockedIn
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-white">{emp.user?.name}</h3>
                      <p className="text-xs text-zinc-400">{emp.jobTitle || emp.user?.role}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        isClockedIn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {isClockedIn ? '● ON SHIFT' : 'OFF SHIFT'}
                    </span>
                  </div>

                  {isClockedIn ? (
                    <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-300 mb-4">
                      <div className="flex justify-between">
                        <span>Clocked In At:</span>
                        <span className="font-mono font-bold">{fmtTime(emp.activeShift!.clockIn)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 mb-4">
                      <span>Ready to start shift</span>
                    </div>
                  )}
                </div>

                <div>
                  {isClockedIn ? (
                    <button
                      onClick={() => handleClockOut(emp)}
                      disabled={isProcessing}
                      className="btn w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold py-2.5 rounded flex items-center justify-center gap-2"
                    >
                      {isProcessing ? 'Clocking Out...' : '🛑 Clock Out'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClockIn(emp)}
                      disabled={isProcessing}
                      className="btn w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded flex items-center justify-center gap-2"
                    >
                      {isProcessing ? 'Clocking In...' : '🚀 Clock In'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
