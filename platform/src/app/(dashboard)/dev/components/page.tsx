'use client'

import React, { useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Textarea, Select, Switch } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Alert, EmptyState, Skeleton } from '@/components/ui/Card'
import { Dialog, ConfirmDialog, Drawer } from '@/components/ui/Dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function DevComponentsShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [switchState, setSwitchState] = useState(true)
  const [inputValue, setInputValue] = useState('Table 14 - Booth')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Resto Design System — Component Showcase
          </h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Phase 1 Foundation Primitives, Design Tokens, and Accessible States
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* ── 1. Color Tokens ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>1. Color Tokens</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--brand-emerald)', color: '#fff' }}>
            <div style={{ fontWeight: 600 }}>Brand Emerald</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Primary (#059669)</div>
          </div>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--brand-amber)', color: '#fff' }}>
            <div style={{ fontWeight: 600 }}>Brand Amber</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Attention (#D97706)</div>
          </div>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--semantic-success)', color: '#fff' }}>
            <div style={{ fontWeight: 600 }}>Semantic Success</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Active / Positive</div>
          </div>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--semantic-danger)', color: '#fff' }}>
            <div style={{ fontWeight: 600 }}>Semantic Danger</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Error / Void</div>
          </div>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--semantic-info)', color: '#fff' }}>
            <div style={{ fontWeight: 600 }}>Semantic Info</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>In-Progress / KDS</div>
          </div>
          <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--color-text-primary)' }}>
            <div style={{ fontWeight: 600 }}>Surface</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Card Surface</div>
          </div>
        </div>
      </section>

      {/* ── 2. Buttons ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>2. Buttons & IconButtons</h2>
        <Card>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Button variant="primary">Primary Emerald</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <Button size="sm">Small (32px)</Button>
              <Button size="md">Medium (40px)</Button>
              <Button size="lg">Large (48px)</Button>
              <IconButton icon={<span>🔍</span>} aria-label="Search" size="md" />
              <IconButton icon={<span>⚙️</span>} aria-label="Settings" size="md" variant="secondary" />
              <IconButton icon={<span>🗑️</span>} aria-label="Delete" size="md" variant="danger" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 3. Status Badges ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>3. Status Badges</h2>
        <Card>
          <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <StatusBadge status="active" dot />
            <StatusBadge status="processing" dot />
            <StatusBadge status="pending" dot />
            <StatusBadge status="occupied" dot />
            <StatusBadge status="delayed" dot />
            <StatusBadge status="expired" />
            <StatusBadge variant="success" label="Available" dot size="sm" />
            <StatusBadge variant="danger" label="86'd Out" dot size="sm" />
            <StatusBadge variant="warning" label="VIP Waitlist" dot size="sm" />
          </CardContent>
        </Card>
      </section>

      {/* ── 4. Form Controls ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>4. Form Controls</h2>
        <Card>
          <CardContent style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <Input
              label="Table Designation"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Assigned in dining room section"
            />
            <Input
              label="Guest Cover Count"
              type="number"
              defaultValue={4}
              error={inputValue.length < 3 ? 'Table designation is too short' : undefined}
            />
            <Select
              label="Floor Section"
              options={[
                { value: 'main', label: 'Main Dining Room' },
                { value: 'patio', label: 'Garden Patio' },
                { value: 'bar', label: 'Bar Lounge' },
                { value: 'private', label: 'Private Tasting Room' },
              ]}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea
                label="Kitchen Notes & Allergies"
                placeholder="Gluten sensitivity on seat 2; celebratory anniversary dessert..."
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Switch
                checked={switchState}
                onChange={setSwitchState}
                label="Course Auto-Fire Notification"
                description="Automatically alert expo station when Table reaches 20min seat time"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 5. Feedback & Alerts ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>5. Alerts & Empty States</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Alert variant="info" title="Station Sync Active">
            Real-time SSE event stream connected to POS and KDS stations.
          </Alert>
          <Alert variant="success" title="Payment Captured">
            Order #1042 successfully settled via Stripe Terminal ($148.50).
          </Alert>
          <Alert variant="warning" title="Ticket Delayed">
            Table 4 Main Course has exceeded the 15-minute kitchen threshold.
          </Alert>
          <Alert variant="danger" title="Item 86'd">
            Black Truffle Risotto was marked out of stock by Chef de Cuisine.
          </Alert>
        </div>
      </section>

      {/* ── 6. Modals, Dialogs & Drawers ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>6. Dialogs & Drawers</h2>
        <Card>
          <CardContent style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open Confirm Modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open Slide Drawer</Button>
            <Tooltip content="Tooltip helper text for button action">
              <Button variant="ghost">Hover for Tooltip</Button>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Live Modal Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Edit Table Configuration"
          description="Adjust dining room capacity, server section, and table shape"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Table Name" defaultValue="Table 12 (Window)" />
            <Select
              label="Shape"
              options={[
                { value: 'round', label: 'Round (4 Top)' },
                { value: 'rect', label: 'Rectangular (6 Top)' },
                { value: 'booth', label: 'Booth (4 Top)' },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setDialogOpen(false)}>Save Table</Button>
            </div>
          </div>
        </Dialog>

        {/* Live Confirm Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Void Order Item?"
          message="Are you sure you want to void 'Filet Mignon' from Order #1042? This action will be logged in the audit ledger."
          confirmText="Void Item"
          variant="danger"
        />

        {/* Live Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Quick Order Drawer"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Server quick item addition panel for handheld workflows.
            </p>
            <Input placeholder="Search menu items..." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: 12, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Handmade Truffle Pasta</span>
                <span style={{ fontWeight: 600 }}>$34.00</span>
              </div>
              <div style={{ padding: 12, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Wagyu Ribeye (12oz)</span>
                <span style={{ fontWeight: 600 }}>$68.00</span>
              </div>
            </div>
            <Button fullWidth onClick={() => setDrawerOpen(false)}>Send to Kitchen</Button>
          </div>
        </Drawer>
      </section>
    </div>
  )
}
