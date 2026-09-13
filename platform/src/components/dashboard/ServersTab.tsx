'use client'

import React from 'react'
import InventoryLowStock from './InventoryLowStock'
import EmployeeSchedule from './EmployeeSchedule'
import SalesAnalytics from './SalesAnalytics'

export default function ServersTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Sales Analytics — full width */}
      <SalesAnalytics />

      {/* Inventory + Schedule — side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        <InventoryLowStock />
        <EmployeeSchedule />
      </div>
    </div>
  )
}
