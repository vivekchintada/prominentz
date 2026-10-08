'use client'

import React from 'react'
import { Button } from '../ui/Button'

export interface TableOrder {
  id:         string
  total:      number
  guestCount: number
  server: {
    name: string
  }
}

export interface TableData {
  id:         string
  name:       string
  capacity:   number
  status:     'EMPTY' | 'ACTIVE' | 'PAYING' | 'RESERVED'
  note?:      string | null
  posX:       number | null
  posY:       number | null
  orders:     TableOrder[]
}

interface TableGridProps {
  tables:          TableData[]
  onSelectTable:   (table: TableData) => void
  onOpenNoteModal?: (table: TableData) => void
}

export default function TableGrid({ tables, onSelectTable, onOpenNoteModal }: TableGridProps) {
  // Sort tables: positioned tables go to the grid map, unpositioned tables go to the flex list
  const mappedTables = tables.filter((t) => t.posX !== null && t.posY !== null)
  const flexTables = tables.filter((t) => t.posX === null || t.posY === null)

  const STATUS_COLORS = {
    EMPTY:    { bg: 'var(--color-bg-card)', border: 'var(--color-border)', text: 'var(--color-text-secondary)', dot: 'var(--color-table-empty)' },
    ACTIVE:   { bg: 'rgba(249,115,22,0.08)', border: 'var(--color-brand-500)', text: 'var(--color-text-primary)', dot: 'var(--color-table-active)' },
    PAYING:   { bg: 'var(--brand-tint)', border: 'var(--color-table-paying)', text: 'var(--color-text-primary)', dot: 'var(--color-table-paying)' },
    RESERVED: { bg: 'rgba(255, 255, 255, 0.08)', border: 'var(--color-table-reserved)', text: 'var(--color-text-primary)', dot: 'var(--color-table-reserved)' },
  }

  // Render a single table card
  const renderTableCard = (table: TableData) => {
    const colors = STATUS_COLORS[table.status]
    const activeOrder = table.orders.find((o) => o.id) // find the active open order

    return (
      <div
        key={table.id}
        onClick={() => onSelectTable(table)}
        style={{
          background:     colors.bg,
          border:         `1px solid ${colors.border}`,
          borderRadius:    'var(--radius-lg)',
          padding:        'var(--space-3) var(--space-4)',
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'space-between',
          cursor:          'pointer',
          transition:     'all var(--transition-fast)',
          userSelect:      'none',
          height:         '100%',
          boxSizing:      'border-box',
          boxShadow:      table.status !== 'EMPTY' ? 'var(--shadow-md)' : 'none',
          position:       'relative',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-2px)'
          el.style.borderColor = table.status === 'EMPTY' ? 'var(--color-text-secondary)' : colors.border
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.transform = 'none'
          el.style.borderColor = colors.border
        }}
      >
        <div>
          {/* Header row */}
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-lg flex items-center gap-1.5" style={{ color: colors.text }}>
              {table.name}
              {table.note && (
                <span title={`Table Note: ${table.note}`} style={{ fontSize: '14px' }}>
                  📝
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {onOpenNoteModal && (
                <Button
                  type="button"
                  title={table.note ? `Edit note: ${table.note}` : 'Add table note'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenNoteModal(table)
                  }}
                  style={{
                    height: '24px',
                    padding: '0 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: table.note ? 'rgba(234,179,8,0.5)' : 'var(--color-border)',
                    background: table.note ? 'rgba(234,179,8,0.15)' : 'var(--color-bg-card)',
                    color: table.note ? '#ca8a04' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontWeight: 600,
                  }}
                >
                  📝 {table.note ? 'Note' : '+ Note'}
                </Button>
              )}
              <span
                className="status-dot"
                style={{
                  width:      '10px',
                  height:     '10px',
                  background: colors.dot,
                  boxShadow:  table.status !== 'EMPTY' ? `0 0 10px ${colors.dot}` : 'none',
                }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex justify-between items-center text-xs text-secondary mb-2">
            <span>Cap: {table.capacity} guests</span>
            {table.status === 'PAYING' && (
              <span className="badge badge--warning" style={{ fontSize: '10px' }}>💵 Check Printed</span>
            )}
            {table.status === 'ACTIVE' && (
              <span className="badge badge--brand" style={{ fontSize: '10px' }}>⏱️ Active Order</span>
            )}
          </div>

          {/* Render table note pill if present */}
          {table.note && (
            <div
              className="text-xs truncate font-medium mb-2"
              style={{
                background: 'rgba(234,179,8,0.1)',
                border: '1px solid rgba(234,179,8,0.3)',
                color: '#ca8a04',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
              title={table.note}
            >
              📌 {table.note}
            </div>
          )}
        </div>

        {/* Dynamic content if active */}
        {activeOrder ? (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="truncate" style={{ maxWidth: '100px' }}>👤 {activeOrder.server.name}</span>
              <span>👥 {activeOrder.guestCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-brand" style={{ fontFamily: 'var(--font-mono)' }}>
                ${Number(activeOrder.total).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-secondary italic">Empty Table</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', height: '100%' }}>
      {/* Legend toolbar */}
      <div className="card flex items-center justify-between" style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-bg-raised)' }}>
        <span className="font-semibold text-sm">Table Status Floorplan</span>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span className="status-dot status-dot--empty" style={{ width: 8, height: 8 }} />
            <span className="text-xs text-secondary">Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="status-dot status-dot--active" style={{ width: 8, height: 8 }} />
            <span className="text-xs text-secondary">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="status-dot status-dot--paying" style={{ width: 8, height: 8 }} />
            <span className="text-xs text-secondary">Paying</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="status-dot status-dot--reserved" style={{ width: 8, height: 8 }} />
            <span className="text-xs text-secondary">Reserved</span>
          </div>
        </div>
      </div>

      {/* Main Floor Grid Layout */}
      {mappedTables.length > 0 && (
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows:        '120px',
            gap:                 'var(--space-4)',
            background:          'var(--color-bg-raised)',
            border:              '1px solid var(--color-border)',
            borderRadius:        'var(--radius-xl)',
            padding:             'var(--space-6)',
            minHeight:           '380px',
          }}
        >
          {mappedTables.map((table) => {
            // posY maps to grid-row, posX maps to grid-column
            const gridRow = table.posY ?? 1
            const gridCol = table.posX ?? 1
            
            return (
              <div
                key={table.id}
                style={{
                  gridRowStart:    gridRow,
                  gridColumnStart: gridCol,
                }}
              >
                {renderTableCard(table)}
              </div>
            )
          })}
        </div>
      )}

      {/* Overflow Flex Tables List */}
      {flexTables.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-secondary mb-3">Flex & Bar Counter Area</h4>
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap:                 'var(--space-4)',
            }}
          >
            {flexTables.map((t) => renderTableCard(t))}
          </div>
        </div>
      )}

      {tables.length === 0 && (
        <div className="card flex justify-center py-20">
          <p className="text-secondary text-center text-sm">No tables loaded. Register tables in settings.</p>
        </div>
      )}
    </div>
  )
}
