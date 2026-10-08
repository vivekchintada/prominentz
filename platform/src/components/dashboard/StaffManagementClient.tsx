'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export type OrganizationRole = 'OWNER' | 'MANAGER' | 'SERVER' | 'KITCHEN'
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED'

export interface StaffLocation {
  id: string
  name: string
  isHeadquarters?: boolean
}

export interface StaffMember {
  id: string
  userId: string
  role: OrganizationRole
  status: MembershipStatus
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
  } | null
  locations: StaffLocation[]
}

export interface StaffInvitation {
  id: string
  email: string
  role: OrganizationRole
  locationId: string | null
  locationName: string
  expiresAt: string
  createdAt: string
}

export interface ActorContext {
  userId: string
  role: OrganizationRole
  locationIds: string[]
}

const ROLE_COLORS: Record<OrganizationRole, { bg: string; text: string; border: string }> = {
  OWNER: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  MANAGER: { bg: 'rgba(255, 255, 255, 0.08)', text: '#60a5fa', border: 'rgba(255, 255, 255, 0.08)' },
  SERVER: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  KITCHEN: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
}

const STATUS_BADGES: Record<MembershipStatus, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: 'Active', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
  INVITED: { label: 'Invited', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
  SUSPENDED: { label: 'Suspended', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
}

export function StaffManagementClient() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [invitations, setInvitations] = useState<StaffInvitation[]>([])
  const [availableLocations, setAvailableLocations] = useState<StaffLocation[]>([])
  const [actor, setActor] = useState<ActorContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [locationFilter, setLocationFilter] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INVITED' | 'SUSPENDED'>('ALL')

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('SERVER')
  const [inviteLocationId, setInviteLocationId] = useState<string>('')
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Edit Role & Location Modal
  const [editMember, setEditMember] = useState<StaffMember | null>(null)
  const [editRole, setEditRole] = useState<OrganizationRole>('SERVER')
  const [editLocationIds, setEditLocationIds] = useState<string[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Confirm Action Modal (Suspend / Reactivate / Revoke)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'reactivate' | 'revoke'
    member?: StaffMember
    invitation?: StaffInvitation
  } | null>(null)
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch staff list & invitations
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [staffRes, invRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/staff/invitations'),
      ])

      if (!staffRes.ok) {
        const err = await staffRes.json().catch(() => ({}))
        throw new Error(err.error || `Failed to fetch staff (${staffRes.status})`)
      }

      const staffData = await staffRes.json()
      setMembers(staffData.members || [])
      setActor(staffData.actor || null)
      setAvailableLocations(staffData.availableLocations || [])

      if (invRes.ok) {
        const invData = await invRes.json()
        setInvitations(Array.isArray(invData) ? invData : [])
      }
    } catch (err: unknown) {
      console.error('[fetchData]', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set default invite location when locations load
  useEffect(() => {
    if (availableLocations.length > 0 && !inviteLocationId) {
      setInviteLocationId(availableLocations[0].id)
    }
  }, [availableLocations, inviteLocationId])

  // Filter calculations
  const filteredMembers = members.filter((m) => {
    if (activeTab === 'ACTIVE' && m.status !== 'ACTIVE') return false
    if (activeTab === 'SUSPENDED' && m.status !== 'SUSPENDED') return false
    if (activeTab === 'INVITED') return false // Handled in invitations section

    if (roleFilter !== 'ALL' && m.role !== roleFilter) return false
    if (locationFilter !== 'ALL') {
      const match = m.locations.some((loc) => loc.id === locationFilter)
      if (!match) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = m.user?.name?.toLowerCase() || ''
      const email = m.user?.email?.toLowerCase() || ''
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  const filteredInvitations = invitations.filter((inv) => {
    if (activeTab === 'ACTIVE' || activeTab === 'SUSPENDED') return false
    if (roleFilter !== 'ALL' && inv.role !== roleFilter) return false
    if (locationFilter !== 'ALL' && inv.locationId !== locationFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!inv.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Permission evaluation helpers for actor
  const isOwner = actor?.role === 'OWNER'
  const isManager = actor?.role === 'MANAGER'

  const canActorManageMember = (member: StaffMember) => {
    if (!actor) return false
    if (actor.userId === member.userId) return false // Cannot manage self

    if (isOwner) return true

    if (isManager) {
      // Manager cannot manage Owner or other Manager
      if (member.role === 'OWNER' || member.role === 'MANAGER') return false
      // Must share at least one assigned location
      const memberLocIds = member.locations.map((l) => l.id)
      return memberLocIds.some((id) => actor.locationIds.includes(id))
    }

    return false
  }

  // Open Edit Modal
  const handleOpenEdit = (member: StaffMember) => {
    setEditMember(member)
    setEditRole(member.role)
    setEditLocationIds(member.locations.map((l) => l.id))
    setEditError(null)
  }

  // Submit Edit Role & Location
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return

    try {
      setIsSavingEdit(true)
      setEditError(null)

      const res = await fetch(`/api/staff/${editMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          locationIds: editLocationIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update staff member')
      }

      setEditMember(null)
      fetchData()
    } catch (err: unknown) {
      setEditError(err.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Submit Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmittingInvite(true)
      setInviteError(null)
      setGeneratedInviteUrl(null)

      const res = await fetch('/api/staff/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          locationId: inviteLocationId || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      setGeneratedInviteUrl(data.invitation.inviteUrl)
      fetchData()
    } catch (err: unknown) {
      setInviteError(err.message)
    } finally {
      setIsSubmittingInvite(false)
    }
  }

  // Execute Suspend / Reactivate / Revoke
  const handleExecuteAction = async () => {
    if (!confirmAction) return

    try {
      setIsActionProcessing(true)
      setActionError(null)

      if (confirmAction.type === 'suspend' && confirmAction.member) {
        const res = await fetch(`/api/staff/${confirmAction.member.id}/suspend`, {
          method: 'POST',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to suspend staff member')
      } else if (confirmAction.type === 'reactivate' && confirmAction.member) {
        const res = await fetch(`/api/staff/${confirmAction.member.id}/reactivate`, {
          method: 'POST',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to reactivate staff member')
      } else if (confirmAction.type === 'revoke' && confirmAction.invitation) {
        const res = await fetch(`/api/staff/invitations/${confirmAction.invitation.id}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to revoke invitation')
      }

      setConfirmAction(null)
      fetchData()
    } catch (err: unknown) {
      setActionError(err.message)
    } finally {
      setIsActionProcessing(false)
    }
  }

  // Count summaries
  const totalActive = members.filter((m) => m.status === 'ACTIVE').length
  const totalSuspended = members.filter((m) => m.status === 'SUSPENDED').length
  const totalInvited = invitations.length

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── Top Role & Policy Banner ── */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px var(--brand-tint)',
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Delegated Staff Management (RBAC)
              </span>
              {actor && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: ROLE_COLORS[actor.role]?.bg || 'rgba(255,255,255,0.1)',
                    color: ROLE_COLORS[actor.role]?.text || '#fff',
                    border: `1px solid ${ROLE_COLORS[actor.role]?.border || 'transparent'}`,
                  }}
                >
                  {actor.role}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {isOwner ? (
                <span>Full organization authority • Can manage Managers, Servers, Kitchen, and all locations</span>
              ) : isManager ? (
                <span>
                  Delegated scope • Authorized to invite and manage Server & Kitchen staff across assigned locations
                </span>
              ) : (
                <span>Standard staff view</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/dashboard/audit"
            className="btn btn--secondary btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
          >
            <span>📜</span>
            <span>View Audit Log</span>
          </Link>

          {(isOwner || isManager) && (
            <button
              onClick={() => {
                setIsInviteModalOpen(true)
                setInviteEmail('')
                setInviteRole(isOwner ? 'MANAGER' : 'SERVER')
                setInviteError(null)
                setGeneratedInviteUrl(null)
                setCopiedLink(false)
              }}
              className="btn btn--primary btn--sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 14px var(--brand-tint)',
              }}
            >
              <span>+</span>
              <span>Invite Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            TOTAL TEAM MEMBERS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {members.length}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            ACTIVE EMPLOYEES
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
            {totalActive}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            PENDING INVITATIONS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
            {totalInvited}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            SUSPENDED USERS
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>
            {totalSuspended}
          </div>
        </div>
      </div>

      {/* ── Tabs & Filter Controls ── */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Staff', count: members.length + invitations.length },
              { id: 'ACTIVE', label: 'Active', count: totalActive },
              { id: 'INVITED', label: 'Pending Invitations', count: totalInvited },
              { id: 'SUSPENDED', label: 'Suspended', count: totalSuspended },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  background: activeTab === tab.id ? 'var(--brand)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {tab.label}{' '}
                <span
                  style={{
                    opacity: 0.75,
                    fontSize: '0.75rem',
                    marginLeft: '4px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            className="btn btn--secondary btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Refresh staff records"
          >
            <span>🔄</span> Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by staff name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-input)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                fontSize: '0.85rem',
              }}
            >
              🔍
            </span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-input)',
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="SERVER">Server</option>
            <option value="KITCHEN">Kitchen</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-input)',
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Locations</option>
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.isHeadquarters ? '(HQ)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '1rem',
            color: '#f87171',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Table Container ── */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <span>Loading staff records and permissions...</span>
          </div>
        ) : (
          <div>
            {/* 1. Pending Invitations Table Section (when showing tab ALL or INVITED) */}
            {(activeTab === 'ALL' || activeTab === 'INVITED') && filteredInvitations.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24' }}>
                    ✉️ PENDING INVITATIONS ({filteredInvitations.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    Tokens expire 48 hours from issuance
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Recipient</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Invited Role</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Assigned Location</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Expires</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvitations.map((inv) => (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom: '1px solid var(--color-separator)',
                            background: 'rgba(255,255,255,0.01)',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{inv.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                              Sent {new Date(inv.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: ROLE_COLORS[inv.role]?.bg,
                                color: ROLE_COLORS[inv.role]?.text,
                                border: `1px solid ${ROLE_COLORS[inv.role]?.border}`,
                              }}
                            >
                              {inv.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                            📍 {inv.locationName}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                            {new Date(inv.expiresAt).toLocaleDateString()}{' '}
                            {new Date(inv.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => setConfirmAction({ type: 'revoke', invitation: inv })}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Staff Members Table */}
            {activeTab !== 'INVITED' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Staff Member</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Location Assignments</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Authorization Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: 'var(--color-text-tertiary)',
                          }}
                        >
                          No staff members found matching the specified filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const canManage = canActorManageMember(member)
                        const isSelf = actor?.userId === member.userId

                        return (
                          <tr
                            key={member.id}
                            style={{
                              borderBottom: '1px solid var(--color-separator)',
                              transition: 'background 0.15s',
                            }}
                          >
                            {/* Member info */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    background: 'var(--brand-tint)',
                                    color: 'var(--brand-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--brand-tint)',
                                  }}
                                >
                                  {(member.user?.name || member.user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {member.user?.name || 'Staff User'}{' '}
                                    {isSelf && (
                                      <span
                                        style={{
                                          fontSize: '0.7rem',
                                          color: 'var(--brand-light)',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          background: 'var(--brand-tint)',
                                          marginLeft: '4px',
                                        }}
                                      >
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                    {member.user?.email || 'No email registered'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: ROLE_COLORS[member.role]?.bg,
                                  color: ROLE_COLORS[member.role]?.text,
                                  border: `1px solid ${ROLE_COLORS[member.role]?.border}`,
                                }}
                              >
                                {member.role}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: STATUS_BADGES[member.status]?.bg,
                                  color: STATUS_BADGES[member.status]?.text,
                                }}
                              >
                                {STATUS_BADGES[member.status]?.label}
                              </span>
                            </td>

                            {/* Location Assignments */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {member.locations.length === 0 ? (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                    All Locations (Unrestricted)
                                  </span>
                                ) : (
                                  member.locations.map((loc) => (
                                    <span
                                      key={loc.id}
                                      style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                      }}
                                    >
                                      📍 {loc.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>

                            {/* Created Date */}
                            <td style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                              {new Date(member.createdAt).toLocaleDateString()}
                            </td>

                            {/* Controls */}
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {canManage ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {/* Edit Role / Location */}
                                  <button
                                    onClick={() => handleOpenEdit(member)}
                                    style={{
                                      background: 'rgba(255,255,255,0.06)',
                                      border: '1px solid var(--color-border)',
                                      color: 'var(--color-text-secondary)',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Edit Role/Locations
                                  </button>

                                  {/* Suspend or Reactivate */}
                                  {member.status === 'ACTIVE' ? (
                                    <button
                                      onClick={() => setConfirmAction({ type: 'suspend', member })}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#f87171',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmAction({ type: 'reactivate', member })}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#34d399',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Reactivate
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    color: 'var(--color-text-quaternary)',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {isSelf
                                    ? 'Current session'
                                    : isManager
                                    ? member.role === 'OWNER' || member.role === 'MANAGER'
                                      ? 'Owner authority required'
                                      : 'Outside managed location'
                                    : 'Read-only'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
         MODAL 1: Invite Employee (Role-Aware)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {isInviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingInvite) {
              setIsInviteModalOpen(false)
            }
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
                Invite Staff Member
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {generatedInviteUrl ? (
              <div>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎉</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#34d399' }}>
                    Invitation Created Successfully!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    A single-use link has been generated for <strong>{inviteEmail}</strong>. Valid for 48 hours.
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    INVITATION ONBOARDING URL
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border-input)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteUrl)
                        setCopiedLink(true)
                        setTimeout(() => setCopiedLink(false), 2500)
                      }}
                      className="btn btn--primary btn--sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsInviteModalOpen(false)
                    setGeneratedInviteUrl(null)
                  }}
                  className="btn btn--secondary btn--sm"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite}>
                {inviteError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#f87171',
                      fontSize: '0.825rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {inviteError}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Employee Email Address <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="server@restaurant.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-input)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Role Assignment <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-input)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isOwner && <option value="MANAGER">Manager — Supervise staff & floor operations</option>}
                    <option value="SERVER">Server — Table orders, billing, and floor service</option>
                    <option value="KITCHEN">Kitchen — Kitchen Display System (KDS) & line orders</option>
                  </select>
                  {!isOwner && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                      ℹ️ Managers can invite Server & Kitchen staff. Only Owners can onboard Managers.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                    Location Scope {isManager && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <select
                    value={inviteLocationId}
                    onChange={(e) => setInviteLocationId(e.target.value)}
                    required={isManager}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-input)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isOwner && <option value="">All Locations (Global Access)</option>}
                    {availableLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.isHeadquarters ? '(HQ)' : ''}
                      </option>
                    ))}
                  </select>
                  {isManager && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                      Managers can only invite staff to their assigned locations.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="btn btn--secondary btn--sm"
                    disabled={isSubmittingInvite}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary btn--sm"
                    disabled={isSubmittingInvite}
                    style={{ minWidth: '120px' }}
                  >
                    {isSubmittingInvite ? 'Generating...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
         MODAL 2: Edit Role & Location Assignments
         ═══════════════════════════════════════════════════════════════════════════ */}
      {editMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingEdit) {
              setEditMember(null)
            }
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
                  Edit Staff Role & Access
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                  {editMember.user?.name || 'Staff User'} ({editMember.user?.email})
                </div>
              </div>
              <button
                onClick={() => setEditMember(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {editError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: '#f87171',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                  }}
                >
                  {editError}
                </div>
              )}

              {/* Role Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Assigned Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as OrganizationRole)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-input)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {isOwner && <option value="OWNER">Owner (Full administrative rights)</option>}
                  {isOwner && <option value="MANAGER">Manager</option>}
                  <option value="SERVER">Server</option>
                  <option value="KITCHEN">Kitchen</option>
                </select>
                {isManager && (
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Managers are permitted to toggle roles between Server ↔ Kitchen only.
                  </div>
                )}
              </div>

              {/* Location Checkboxes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  Assigned Restaurant Locations
                </label>
                <div
                  style={{
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-input)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  {availableLocations.map((loc) => {
                    const isChecked = editLocationIds.includes(loc.id)
                    return (
                      <label
                        key={loc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditLocationIds([...editLocationIds, loc.id])
                            } else {
                              setEditLocationIds(editLocationIds.filter((id) => id !== loc.id))
                            }
                          }}
                        />
                        <span>
                          {loc.name} {loc.isHeadquarters ? '(HQ)' : ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                  {isManager
                    ? 'Only locations within your delegated authority can be assigned.'
                    : 'If no specific location is selected, the user will have access across all organization venues.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="btn btn--secondary btn--sm"
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={isSavingEdit}
                  style={{ minWidth: '110px' }}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
         MODAL 3: Confirm Action (Suspend / Reactivate / Revoke)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isActionProcessing) {
              setConfirmAction(null)
            }
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {confirmAction.type === 'suspend' && '⚠️'}
              {confirmAction.type === 'reactivate' && '✅'}
              {confirmAction.type === 'revoke' && '🗑️'}
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
              {confirmAction.type === 'suspend' && 'Suspend Staff Access'}
              {confirmAction.type === 'reactivate' && 'Reactivate Staff Access'}
              {confirmAction.type === 'revoke' && 'Revoke Pending Invitation'}
            </h3>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {confirmAction.type === 'suspend' && (
                <>
                  Are you sure you want to suspend access for{' '}
                  <strong>{confirmAction.member?.user?.name || confirmAction.member?.user?.email}</strong>? They will be
                  immediately logged out and unable to access POS, KDS, or dashboard terminals.
                </>
              )}
              {confirmAction.type === 'reactivate' && (
                <>
                  Reactivate membership for{' '}
                  <strong>{confirmAction.member?.user?.name || confirmAction.member?.user?.email}</strong>? They will regain
                  system access with their current role and location assignments.
                </>
              )}
              {confirmAction.type === 'revoke' && (
                <>
                  Revoke invitation for <strong>{confirmAction.invitation?.email}</strong>? The single-use link will be
                  permanently invalidated immediately.
                </>
              )}
            </p>

            {actionError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#f87171',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="btn btn--secondary btn--sm"
                disabled={isActionProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={confirmAction.type === 'reactivate' ? 'btn btn--primary btn--sm' : 'btn btn--danger btn--sm'}
                disabled={isActionProcessing}
                style={{ minWidth: '110px' }}
              >
                {isActionProcessing
                  ? 'Processing...'
                  : confirmAction.type === 'suspend'
                  ? 'Suspend User'
                  : confirmAction.type === 'reactivate'
                  ? 'Reactivate'
                  : 'Revoke Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
