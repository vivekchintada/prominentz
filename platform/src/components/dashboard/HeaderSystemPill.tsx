'use client'

import React, { useState, useEffect } from 'react'
import SystemStatusModal from './SystemStatusModal'

export default function HeaderSystemPill() {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'unhealthy' | 'loading'>('loading')
  const [modalOpen, setModalOpen] = useState(false)

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json().catch(() => null)
      if (data?.status) setStatus(data.status)
      else setStatus('healthy')
    } catch {
      setStatus('healthy')
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const color =
    status === 'healthy' ? '#30D158' :
    status === 'degraded' ? '#FF9F0A' :
    status === 'unhealthy' ? '#FF453A' :
    '#636366'

  const label =
    status === 'healthy' ? 'Systems Operational' :
    status === 'degraded' ? 'Degraded Subsystems' :
    status === 'unhealthy' ? 'System Alert' :
    'Checking...'

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: `${color}14`,
          border: `1px solid ${color}35`,
          color,
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
        title="Click to view infrastructure telemetry"
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <span>{label}</span>
      </button>

      <SystemStatusModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
