'use client'

import React, { useState } from 'react'
import DashboardLivePanel from './DashboardLivePanel'
import ServersTab from './ServersTab'

type Tab = 'overview' | 'servers'

interface DashboardTabsProps {
  statsSection: React.ReactNode
  eventsSection: React.ReactNode
}

export default function DashboardTabs({ statsSection, eventsSection }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'servers', label: 'Servers & Analytics', icon: '📊' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-1)',
          padding: '4px',
          background: 'var(--color-bg-raised)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          alignSelf: 'flex-start',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              background: activeTab === tab.id ? 'var(--color-brand-500)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {statsSection}
          <DashboardLivePanel />
          {eventsSection}
        </div>
      )}

      {activeTab === 'servers' && <ServersTab />}
    </div>
  )
}
