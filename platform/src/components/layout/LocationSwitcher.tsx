'use client'

import React, { useState, useEffect } from 'react'
import { PlanTier } from '@/lib/plans'

interface LocationItem {
  id: string
  name: string
  region?: string
  isHeadquarters: boolean
}

interface LocationSwitcherProps {
  planTier?: PlanTier
  onUpgradeClick?: () => void
}

export function LocationSwitcher({ planTier = 'STARTER', onUpgradeClick }: LocationSwitcherProps) {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [activeLocationId, setActiveLocationId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch('/api/locations')
        const data = await res.json()
        if (data.locations && Array.isArray(data.locations)) {
          setLocations(data.locations)
          const savedLoc = localStorage.getItem('resto_active_location_id')
          const initialLoc = savedLoc && data.locations.some((l: LocationItem) => l.id === savedLoc)
            ? savedLoc
            : data.locations[0]?.id || ''
          setActiveLocationId(initialLoc)
        }
      } catch (err) {
        console.error('Failed to load locations', err)
      } finally {
        setLoading(false)
      }
    }
    loadLocations()
  }, [])

  const handleSelectLocation = (locId: string) => {
    setActiveLocationId(locId)
    localStorage.setItem('resto_active_location_id', locId)
    window.dispatchEvent(new CustomEvent('resto_location_changed', { detail: { locationId: locId } }))
  }

  if (loading || locations.length === 0) return null

  const activeLoc = locations.find((l) => l.id === activeLocationId) || locations[0]
  const isPro = planTier === 'PRO' || planTier === 'ENTERPRISE'

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '0.5px solid var(--color-border)',
      marginBottom: '6px',
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-secondary)',
        }}>
          Active Outlet
        </span>
      </div>

      {/* PRO / ENTERPRISE: Full dropdown switcher */}
      {isPro ? (
        <select
          value={activeLocationId}
          onChange={(e) => handleSelectLocation(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-strong)',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id} style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
              {loc.isHeadquarters ? '🏢 ' : '📍 '}{loc.name}{loc.region ? ` (${loc.region})` : ''}
            </option>
          ))}
        </select>
      ) : (
        /* STARTER: Clean active outlet display */
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {activeLoc.name}
          </span>
        </div>
      )}
    </div>
  )
}
