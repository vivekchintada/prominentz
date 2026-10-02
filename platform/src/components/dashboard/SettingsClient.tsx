'use client'

import React, { useState, useEffect } from 'react'
import { UrbanPiperIntegration } from './Integrations/UrbanPiperIntegration'

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type SettingsTab =
  | 'store'
  | 'tax'
  | 'print'
  | 'payment_types'
  | 'delivery'
  | 'notifications'
  | 'integrations'

interface TaxItem {
  id: string
  name: string
  rate: string
  type: string
  isActive?: boolean
}

interface StoreSettingsData {
  logoUrl: string
  name: string
  address1: string
  address2: string
  country: string
  state: string
  city: string
  pincode: string
  email: string
  phone: string
  currency: string
  enableQrMenu: boolean
  enableOrderViaQr: boolean
  enableTakeAway: boolean
  enableDelivery: boolean
  enableDineIn: boolean
  enableTable: boolean
  enableReservation: boolean
}

interface PrintSettingsData {
  enablePrint: boolean
  showStoreDetails: boolean
  showCustomerDetails: boolean
  pageSize: string
  header: string
  footer: string
  showNotes: boolean
  printTokens: boolean
}

interface PaymentTypesData {
  cash: boolean
  card: boolean
  wallet: boolean
  paypal: boolean
  qrReader: boolean
  cardReader: boolean
  bank: boolean
}

interface DeliverySettingsData {
  freeDelivery: {
    enabled: boolean
    overAmount: string
  }
  fixedDelivery: {
    enabled: boolean
    amount: string
  }
  kmDelivery: {
    enabled: boolean
    perKmCharge: string
    minDeliveryOver: string
    minDistanceForFreeDelivery: string
  }
}

interface NotificationsData {
  emailAlerts: boolean
  smsAlerts: boolean
  orderStatusUpdate: boolean
  dailySalesReport: boolean
  lowStockAlerts: boolean
  notificationEmail?: string
}

export function SettingsClient() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('store')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Settings State
  const [store, setStore] = useState<StoreSettingsData>({
    logoUrl: '',
    name: 'Streak House',
    address1: '',
    address2: '',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    pincode: '90001',
    email: 'contact@streakhouse.com',
    phone: '+1 (555) 234-5678',
    currency: 'USD',
    enableQrMenu: true,
    enableOrderViaQr: true,
    enableTakeAway: true,
    enableDelivery: true,
    enableDineIn: true,
    enableTable: true,
    enableReservation: false,
  })

  const [taxes, setTaxes] = useState<TaxItem[]>([
    { id: '1', name: 'CGST', rate: '9', type: 'Inclusive / Exclusive', isActive: true },
    { id: '2', name: 'SGST', rate: '9', type: 'Inclusive / Exclusive', isActive: true },
    { id: '3', name: 'IGST', rate: '18', type: 'Inclusive / Exclusive', isActive: true },
    { id: '4', name: 'VAT', rate: '10', type: 'Exclusive', isActive: true },
    { id: '5', name: 'Service Tax', rate: '15', type: 'Exclusive', isActive: true },
  ])

  const [print, setPrint] = useState<PrintSettingsData>({
    enablePrint: true,
    showStoreDetails: true,
    showCustomerDetails: true,
    pageSize: '80mm Thermal',
    header: '',
    footer: '',
    showNotes: true,
    printTokens: true,
  })

  const [paymentTypes, setPaymentTypes] = useState<PaymentTypesData>({
    cash: true,
    card: true,
    wallet: true,
    paypal: true,
    qrReader: true,
    cardReader: true,
    bank: true,
  })

  const [delivery, setDelivery] = useState<DeliverySettingsData>({
    freeDelivery: {
      enabled: true,
      overAmount: '50.00',
    },
    fixedDelivery: {
      enabled: true,
      amount: '5.00',
    },
    kmDelivery: {
      enabled: true,
      perKmCharge: '1.50',
      minDeliveryOver: '20.00',
      minDistanceForFreeDelivery: '10.00',
    },
  })

  const [notifications, setNotifications] = useState<NotificationsData>({
    emailAlerts: true,
    smsAlerts: false,
    orderStatusUpdate: true,
    dailySalesReport: true,
    lowStockAlerts: true,
    notificationEmail: 'manager@streakhouse.com',
  })

  // Tax Modal State
  const [taxModalOpen, setTaxModalOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxItem | null>(null)
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', type: 'Inclusive / Exclusive' })

  // Initial load
  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          if (data.settings.store) setStore((prev) => ({ ...prev, ...data.settings.store }))
          if (Array.isArray(data.settings.taxes)) setTaxes(data.settings.taxes)
          if (data.settings.print) setPrint((prev) => ({ ...prev, ...data.settings.print }))
          if (data.settings.paymentTypes) setPaymentTypes((prev) => ({ ...prev, ...data.settings.paymentTypes }))
          if (data.settings.delivery) setDelivery((prev) => ({ ...prev, ...data.settings.delivery }))
          if (data.settings.notifications) setNotifications((prev) => ({ ...prev, ...data.settings.notifications }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const showToast = (msg = 'Changes saved successfully!') => {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(''), 3000)
  }

  // Save current section or entire settings
  const handleSave = async (section?: string) => {
    setSaving(true)
    try {
      let payload: any = {}

      if (section === 'store') {
        payload = { section: 'store', sectionData: store }
      } else if (section === 'print') {
        payload = { section: 'print', sectionData: print }
      } else if (section === 'tax') {
        payload = { section: 'taxes', sectionData: taxes }
      } else if (section === 'payment_types') {
        payload = { section: 'paymentTypes', sectionData: paymentTypes }
      } else if (section === 'delivery') {
        payload = { section: 'delivery', sectionData: delivery }
      } else if (section === 'notifications') {
        payload = { section: 'notifications', sectionData: notifications }
      } else {
        payload = {
          settings: {
            store,
            taxes,
            print,
            paymentTypes,
            delivery,
            notifications,
          },
        }
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast('Settings saved successfully!')
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save settings')
      }
    } catch {
      alert('Error connecting to server to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Tax Management
  const openAddTaxModal = () => {
    setEditingTax(null)
    setTaxForm({ name: '', rate: '', type: 'Inclusive / Exclusive' })
    setTaxModalOpen(true)
  }

  const openEditTaxModal = (tax: TaxItem) => {
    setEditingTax(tax)
    setTaxForm({ name: tax.name, rate: tax.rate, type: tax.type })
    setTaxModalOpen(true)
  }

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taxForm.name || !taxForm.rate) return

    let updatedTaxes: TaxItem[] = []
    if (editingTax) {
      updatedTaxes = taxes.map((t) =>
        t.id === editingTax.id
          ? { ...t, name: taxForm.name, rate: taxForm.rate, type: taxForm.type }
          : t
      )
    } else {
      const newTax: TaxItem = {
        id: String(Date.now()),
        name: taxForm.name,
        rate: taxForm.rate,
        type: taxForm.type,
        isActive: true,
      }
      updatedTaxes = [...taxes, newTax]
    }

    setTaxes(updatedTaxes)
    setTaxModalOpen(false)

    // Persist immediately
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'taxes', sectionData: updatedTaxes }),
      })
      showToast(editingTax ? 'Tax updated successfully!' : 'Tax added successfully!')
    } catch (err) {
      console.error('Failed to update tax', err)
    }
  }

  const handleDeleteTax = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return
    const updated = taxes.filter((t) => t.id !== id)
    setTaxes(updated)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'taxes', sectionData: updated }),
      })
      showToast('Tax deleted')
    } catch (err) {
      console.error('Failed to delete tax', err)
    }
  }

  // Image Upload handler — posts to /api/settings/logo for persistence
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be under 2 MB')
      return
    }

    // Optimistic preview via FileReader
    const reader = new FileReader()
    reader.onload = () => {
      setStore((prev) => ({ ...prev, logoUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)

    // Persist to backend
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to upload logo')
      } else {
        const data = await res.json()
        setStore((prev) => ({ ...prev, logoUrl: data.logoUrl }))
        showToast('Logo uploaded successfully!')
      }
    } catch {
      alert('Failed to connect to server for logo upload')
    }
  }

  const navTabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'store',
      label: 'Store Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
        </svg>
      ),
    },
    {
      id: 'tax',
      label: 'Tax',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l8 8-8 8-8-8z" />
          <path d="m9 9 6 6" />
          <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="9.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'print',
      label: 'Print',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      ),
    },
    {
      id: 'payment_types',
      label: 'Payment Types',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="6" y1="15" x2="10" y2="15" />
        </svg>
      ),
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'integrations',
      label: 'Integrations / API',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(37,99,235,0.2)', borderTopColor: '#5b45f5', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
        Loading DreamPOS settings...
      </div>
    )
  }

  return (
    <div style={{ width: '100%', minHeight: '80vh' }}>
      {/* Toast Banner */}
      {savedMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>✓</span> {savedMsg}
        </div>
      )}

      {/* Main Flex Layout: Left Sidebar + Right Content Panel */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

        {/* ─── Left Sidebar Nav ─────────────────────────────────────────────── */}
        <aside style={{
          width: '230px',
          flexShrink: 0,
          backgroundColor: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            padding: '4px 12px 8px',
          }}>
            SETTINGS
          </div>

          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#5b45f5' : '#475569',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 650 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ color: isActive ? '#5b45f5' : '#64748b', display: 'flex', alignItems: 'center' }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            )
          })}

          <a
            href="/dashboard/settings/ordering"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 16px',
              borderRadius: '10px',
              border: '1px solid transparent',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 150ms ease',
              marginTop: '4px',
            }}
          >
            <span style={{ color: '#5b45f5', display: 'flex', alignItems: 'center', fontSize: '15px' }}>
              🛍️
            </span>
            Online Ordering ↗
          </a>
        </aside>

        {/* ─── Right Content Area ──────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          padding: '28px 32px',
          color: '#1e293b',
        }}>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: STORE SETTINGS
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'store' && (
            <div>
              {/* Top Logo Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="Store Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <label style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#5b45f5',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                    </label>

                    {store.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setStore((prev) => ({ ...prev, logoUrl: '' }))}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Image should be with in 5 MB</div>
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Store Name */}
                <DreamField label="Store Name" required>
                  <input
                    type="text"
                    value={store.name}
                    onChange={(e) => setStore((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Streak House"
                    style={inputStyle}
                  />
                </DreamField>

                {/* Address 1 & Address 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <DreamField label="Address 1" required>
                    <input
                      type="text"
                      value={store.address1}
                      onChange={(e) => setStore((prev) => ({ ...prev, address1: e.target.value }))}
                      placeholder="452 Ocean Drive, Suite 100"
                      style={inputStyle}
                    />
                  </DreamField>
                  <DreamField label="Address 2">
                    <input
                      type="text"
                      value={store.address2}
                      onChange={(e) => setStore((prev) => ({ ...prev, address2: e.target.value }))}
                      placeholder="Floor 2, Door 4"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>

                {/* Country, State, City, Pincode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <DreamField label="Country" required>
                    <select
                      value={store.country}
                      onChange={(e) => setStore((prev) => ({ ...prev, country: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="United States">United States</option>
                      <option value="India">India</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="United Arab Emirates">UAE</option>
                      <option value="Singapore">Singapore</option>
                    </select>
                  </DreamField>

                  <DreamField label="State" required>
                    <input
                      type="text"
                      value={store.state}
                      onChange={(e) => setStore((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="California"
                      style={inputStyle}
                    />
                  </DreamField>

                  <DreamField label="City" required>
                    <input
                      type="text"
                      value={store.city}
                      onChange={(e) => setStore((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Los Angeles"
                      style={inputStyle}
                    />
                  </DreamField>

                  <DreamField label="Pincode" required>
                    <input
                      type="text"
                      value={store.pincode}
                      onChange={(e) => setStore((prev) => ({ ...prev, pincode: e.target.value }))}
                      placeholder="90001"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>

                {/* Email & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <DreamField label="Email" required>
                    <input
                      type="email"
                      value={store.email}
                      onChange={(e) => setStore((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@streakhouse.com"
                      style={inputStyle}
                    />
                  </DreamField>
                  <DreamField label="Phone" required>
                    <input
                      type="tel"
                      value={store.phone}
                      onChange={(e) => setStore((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 234-5678"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>

                {/* Currency */}
                <DreamField label="Currency" required>
                  <select
                    value={store.currency}
                    onChange={(e) => setStore((prev) => ({ ...prev, currency: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="AUD">AUD (A$) — Australian Dollar</option>
                    <option value="CAD">CAD (C$) — Canadian Dollar</option>
                    <option value="AED">AED (د.إ) — UAE Dirham</option>
                  </select>
                </DreamField>

                {/* Store Feature Toggles (2 columns exactly as in screenshot 1) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px 48px',
                  marginTop: '16px',
                  paddingTop: '20px',
                  borderTop: '1px solid #f1f5f9',
                }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <DreamToggleRow
                      label="Enable QR Menu"
                      checked={store.enableQrMenu}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableQrMenu: checked }))}
                    />
                    <DreamToggleRow
                      label="Enable Take Away"
                      checked={store.enableTakeAway}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableTakeAway: checked }))}
                    />
                    <DreamToggleRow
                      label="Enable Dine In"
                      checked={store.enableDineIn}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableDineIn: checked }))}
                    />
                    <DreamToggleRow
                      label="Enable Reservation"
                      checked={store.enableReservation}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableReservation: checked }))}
                    />
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <DreamToggleRow
                      label="Enable Order Via QR Menu"
                      checked={store.enableOrderViaQr}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableOrderViaQr: checked }))}
                    />
                    <DreamToggleRow
                      label="Enable Delivery"
                      checked={store.enableDelivery}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableDelivery: checked }))}
                    />
                    <DreamToggleRow
                      label="Enable Table"
                      checked={store.enableTable}
                      onChange={(checked) => setStore((prev) => ({ ...prev, enableTable: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <DreamActionBar
                onCancel={loadSettings}
                onSave={() => handleSave('store')}
                saving={saving}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: TAX (Screenshot 2)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'tax' && (
            <div>
              {/* Section Header with reload and Add New button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Tax Settings</h2>
                  <button
                    type="button"
                    onClick={loadSettings}
                    title="Reload Taxes"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openAddTaxModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#5b45f5',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add New
                </button>
              </div>

              {/* Tax Table */}
              <div style={{
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontWeight: 700 }}>
                      <th style={{ padding: '16px 20px', width: '60px' }}>#</th>
                      <th style={{ padding: '16px 20px' }}>Tax Name</th>
                      <th style={{ padding: '16px 20px' }}>Rate</th>
                      <th style={{ padding: '16px 20px' }}>Type</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right', width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.map((tax, idx) => (
                      <tr key={tax.id} style={{ borderBottom: '1px solid #f8fafc', color: '#334155' }}>
                        <td style={{ padding: '16px 20px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1e293b' }}>{tax.name}</td>
                        <td style={{ padding: '16px 20px', color: '#475569' }}>{tax.rate}%</td>
                        <td style={{ padding: '16px 20px', color: '#64748b' }}>{tax.type}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            {/* Edit Pencil */}
                            <button
                              type="button"
                              onClick={() => openEditTaxModal(tax)}
                              title="Edit Tax"
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: 'auto' }}>
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>

                            {/* Delete Red Trash */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTax(tax.id)}
                              title="Delete Tax"
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fff5f5',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: 'auto' }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: PRINT (Screenshot 3)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'print' && (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Print Settings</h2>
                <button
                  type="button"
                  onClick={loadSettings}
                  title="Reload"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>

              {/* Card Container */}
              <div style={{
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Print Settings</h3>

                {/* Toggles */}
                <DreamToggleRow
                  label="Enable Print"
                  checked={print.enablePrint}
                  onChange={(checked) => setPrint((prev) => ({ ...prev, enablePrint: checked }))}
                />
                <DreamToggleRow
                  label="Show Store Details"
                  checked={print.showStoreDetails}
                  onChange={(checked) => setPrint((prev) => ({ ...prev, showStoreDetails: checked }))}
                />
                <DreamToggleRow
                  label="Show Customer Details"
                  checked={print.showCustomerDetails}
                  onChange={(checked) => setPrint((prev) => ({ ...prev, showCustomerDetails: checked }))}
                />

                {/* Format / Page Sizes */}
                <DreamField label="Format (Page Sizes)" required>
                  <select
                    value={print.pageSize}
                    onChange={(e) => setPrint((prev) => ({ ...prev, pageSize: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="80mm Thermal">80mm Thermal (Standard Receipt)</option>
                    <option value="58mm Thermal">58mm Thermal (Compact)</option>
                    <option value="A4">A4 Full Page</option>
                    <option value="A5">A5 Half Page</option>
                  </select>
                </DreamField>

                {/* Header Textarea */}
                <DreamField label="Header">
                  <textarea
                    rows={3}
                    value={print.header}
                    onChange={(e) => setPrint((prev) => ({ ...prev, header: e.target.value }))}
                    placeholder="Enter custom header text for receipt..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </DreamField>

                {/* Footer Textarea */}
                <DreamField label="Footer">
                  <textarea
                    rows={3}
                    value={print.footer}
                    onChange={(e) => setPrint((prev) => ({ ...prev, footer: e.target.value }))}
                    placeholder="Thank you for dining with us! Please visit again."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </DreamField>

                {/* Show Notes & Print Tokens */}
                <DreamToggleRow
                  label="Show Notes"
                  checked={print.showNotes}
                  onChange={(checked) => setPrint((prev) => ({ ...prev, showNotes: checked }))}
                />
                <DreamToggleRow
                  label="Print Tokens"
                  checked={print.printTokens}
                  onChange={(checked) => setPrint((prev) => ({ ...prev, printTokens: checked }))}
                />
              </div>

              {/* Action Buttons */}
              <DreamActionBar
                onCancel={loadSettings}
                onSave={() => handleSave('print')}
                saving={saving}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: PAYMENT TYPES (Screenshot 4)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'payment_types' && (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Payment Types</h2>
                <button
                  type="button"
                  onClick={loadSettings}
                  title="Reload"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>

              {/* Cards Grid (3 columns matching screenshot 4) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '18px',
              }}>
                {/* Cash */}
                <PaymentTypeCard
                  label="Cash"
                  checked={paymentTypes.cash}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, cash: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                      <path d="M6 12h.01M18 12h.01" />
                    </svg>
                  }
                />

                {/* Card */}
                <PaymentTypeCard
                  label="Card"
                  checked={paymentTypes.card}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, card: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  }
                />

                {/* Wallet */}
                <PaymentTypeCard
                  label="Wallet"
                  checked={paymentTypes.wallet}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, wallet: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                  }
                />

                {/* Paypal */}
                <PaymentTypeCard
                  label="Paypal"
                  checked={paymentTypes.paypal}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, paypal: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <path d="M7 3h7a5 5 0 0 1 5 5 5 5 0 0 1-5 5H9l-2 8H3l4-18z" />
                    </svg>
                  }
                />

                {/* QR Reader */}
                <PaymentTypeCard
                  label="QR Reader"
                  checked={paymentTypes.qrReader}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, qrReader: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <path d="M14 14h3v3h-3zM20 14v3M14 20h6" />
                    </svg>
                  }
                />

                {/* Card Reader */}
                <PaymentTypeCard
                  label="Card Reader"
                  checked={paymentTypes.cardReader}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, cardReader: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <line x1="8" y1="6" x2="16" y2="6" />
                      <line x1="8" y1="10" x2="16" y2="10" />
                      <circle cx="12" cy="16" r="1.5" />
                    </svg>
                  }
                />

                {/* Bank */}
                <PaymentTypeCard
                  label="Bank"
                  checked={paymentTypes.bank}
                  onChange={(checked) => setPaymentTypes((prev) => ({ ...prev, bank: checked }))}
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b45f5" strokeWidth="2">
                      <path d="m3 9 9-7 9 7v1H3V9z" />
                      <line x1="5" y1="10" x2="5" y2="18" />
                      <line x1="9" y1="10" x2="9" y2="18" />
                      <line x1="15" y1="10" x2="15" y2="18" />
                      <line x1="19" y1="10" x2="19" y2="18" />
                      <path d="M2 18h20v4H2z" />
                    </svg>
                  }
                />
              </div>

              {/* Action Buttons */}
              <DreamActionBar
                onCancel={loadSettings}
                onSave={() => handleSave('payment_types')}
                saving={saving}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: DELIVERY (Screenshot 5)
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'delivery' && (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Delivery</h2>
                <button
                  type="button"
                  onClick={loadSettings}
                  title="Reload"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Card 1: Free Delivery */}
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  padding: '22px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Free Delivery</h3>
                    <DreamSwitch
                      checked={delivery.freeDelivery.enabled}
                      onChange={(checked) =>
                        setDelivery((prev) => ({
                          ...prev,
                          freeDelivery: { ...prev.freeDelivery, enabled: checked },
                        }))
                      }
                    />
                  </div>
                  <DreamField label="Free Delivery Over ($)" required>
                    <input
                      type="number"
                      step="0.01"
                      value={delivery.freeDelivery.overAmount}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          freeDelivery: { ...prev.freeDelivery, overAmount: e.target.value },
                        }))
                      }
                      placeholder="50.00"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>

                {/* Card 2: Fixed Delivery Charges */}
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  padding: '22px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Fixed Delivery Charges</h3>
                    <DreamSwitch
                      checked={delivery.fixedDelivery.enabled}
                      onChange={(checked) =>
                        setDelivery((prev) => ({
                          ...prev,
                          fixedDelivery: { ...prev.fixedDelivery, enabled: checked },
                        }))
                      }
                    />
                  </div>
                  <DreamField label="Fixed Delivery Amount ($)" required>
                    <input
                      type="number"
                      step="0.01"
                      value={delivery.fixedDelivery.amount}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          fixedDelivery: { ...prev.fixedDelivery, amount: e.target.value },
                        }))
                      }
                      placeholder="5.00"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>

                {/* Card 3: Kilometer Based Delivery Charges */}
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Kilometer Based Delivery Charges</h3>
                    <DreamSwitch
                      checked={delivery.kmDelivery.enabled}
                      onChange={(checked) =>
                        setDelivery((prev) => ({
                          ...prev,
                          kmDelivery: { ...prev.kmDelivery, enabled: checked },
                        }))
                      }
                    />
                  </div>

                  <DreamField label="Per KM Delivery Charge ($)" required>
                    <input
                      type="number"
                      step="0.01"
                      value={delivery.kmDelivery.perKmCharge}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          kmDelivery: { ...prev.kmDelivery, perKmCharge: e.target.value },
                        }))
                      }
                      placeholder="1.50"
                      style={inputStyle}
                    />
                  </DreamField>

                  <DreamField label="Minimum Delivery Over ($)" required>
                    <input
                      type="number"
                      step="0.01"
                      value={delivery.kmDelivery.minDeliveryOver}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          kmDelivery: { ...prev.kmDelivery, minDeliveryOver: e.target.value },
                        }))
                      }
                      placeholder="20.00"
                      style={inputStyle}
                    />
                  </DreamField>

                  <DreamField label="Minimum Distance for Free Delivery (KM)" required>
                    <input
                      type="number"
                      step="0.1"
                      value={delivery.kmDelivery.minDistanceForFreeDelivery}
                      onChange={(e) =>
                        setDelivery((prev) => ({
                          ...prev,
                          kmDelivery: { ...prev.kmDelivery, minDistanceForFreeDelivery: e.target.value },
                        }))
                      }
                      placeholder="10.0"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>
              </div>

              {/* Action Buttons */}
              <DreamActionBar
                onCancel={loadSettings}
                onSave={() => handleSave('delivery')}
                saving={saving}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: NOTIFICATIONS
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Notifications</h2>
                <button
                  type="button"
                  onClick={loadSettings}
                  title="Reload"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>

              <div style={{
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}>
                <DreamToggleRow
                  label="Email Alerts for New Online Orders"
                  checked={notifications.emailAlerts}
                  onChange={(checked) => setNotifications((prev) => ({ ...prev, emailAlerts: checked }))}
                />
                <DreamToggleRow
                  label="SMS Alerts for Emergency & Manager Approvals"
                  checked={notifications.smsAlerts}
                  onChange={(checked) => setNotifications((prev) => ({ ...prev, smsAlerts: checked }))}
                />
                <DreamToggleRow
                  label="Real-time Order Status Updates to Kitchen"
                  checked={notifications.orderStatusUpdate}
                  onChange={(checked) => setNotifications((prev) => ({ ...prev, orderStatusUpdate: checked }))}
                />
                <DreamToggleRow
                  label="Daily Automated Z-Report / Sales Summary"
                  checked={notifications.dailySalesReport}
                  onChange={(checked) => setNotifications((prev) => ({ ...prev, dailySalesReport: checked }))}
                />
                <DreamToggleRow
                  label="Low Stock & Inventory Auto-86 Alerts"
                  checked={notifications.lowStockAlerts}
                  onChange={(checked) => setNotifications((prev) => ({ ...prev, lowStockAlerts: checked }))}
                />

                <div style={{ marginTop: '10px' }}>
                  <DreamField label="Primary Alert Notification Email">
                    <input
                      type="email"
                      value={notifications.notificationEmail || ''}
                      onChange={(e) => setNotifications((prev) => ({ ...prev, notificationEmail: e.target.value }))}
                      placeholder="manager@streakhouse.com"
                      style={inputStyle}
                    />
                  </DreamField>
                </div>
              </div>

              <DreamActionBar
                onCancel={loadSettings}
                onSave={() => handleSave('notifications')}
                saving={saving}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 7: INTEGRATIONS / API
              ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'integrations' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Integrations / API</h2>
                <button
                  type="button"
                  onClick={loadSettings}
                  title="Reload"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>

              {/* UrbanPiper Section */}
              <div style={{ marginBottom: '24px' }}>
                <UrbanPiperIntegration />
              </div>

              {/* Other Integrated Services */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  {
                    name: 'Stripe Terminal & Online Payments',
                    icon: '💳',
                    status: 'Connected',
                    desc: 'Credit/Debit card chip & tap processing, Stripe Reader M2, and web checkouts',
                  },
                  {
                    name: 'Groq AI — Llama 3.1 8B (Resto IQ)',
                    icon: '🤖',
                    status: 'Active (Free Tier)',
                    desc: 'Real-time sales predictions, demand forecasting, and conversational POS analytics',
                  },
                  {
                    name: 'Dynamic UPI QR Billing',
                    icon: '📲',
                    status: 'Active',
                    desc: 'Zero-commission direct table QR payments for Google Pay, PhonePe, and Paytm',
                  },
                  {
                    name: 'Twilio SMS & WhatsApp',
                    icon: '💬',
                    status: 'Available',
                    desc: 'Automated order status SMS notifications and table reservation reminders',
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '24px' }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 650, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── Add / Edit Tax Modal ───────────────────────────────────────────── */}
      {taxModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            color: '#1e293b',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {editingTax ? 'Edit Tax Rate' : 'Add New Tax Rate'}
              </h3>
              <button
                type="button"
                onClick={() => setTaxModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#64748b',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTax} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <DreamField label="Tax Name" required>
                <input
                  type="text"
                  required
                  value={taxForm.name}
                  onChange={(e) => setTaxForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. CGST, VAT, Sales Tax"
                  style={inputStyle}
                />
              </DreamField>

              <DreamField label="Tax Rate (%)" required>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxForm.rate}
                  onChange={(e) => setTaxForm((prev) => ({ ...prev, rate: e.target.value }))}
                  placeholder="e.g. 9 or 18"
                  style={inputStyle}
                />
              </DreamField>

              <DreamField label="Tax Type" required>
                <select
                  value={taxForm.type}
                  onChange={(e) => setTaxForm((prev) => ({ ...prev, type: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="Inclusive / Exclusive">Inclusive / Exclusive</option>
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </DreamField>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTaxModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#5b45f5',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {editingTax ? 'Update Tax' : 'Add Tax'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── UI Helper Components matching DreamPOS screenshots ───────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: '13.5px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease',
}

function DreamField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function DreamSwitch({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? '#5b45f5' : '#cbd5e1',
        position: 'relative',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        transition: 'background-color 200ms ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          transition: 'left 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function DreamToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#334155' }}>{label}</span>
      <DreamSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function PaymentTypeCard({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string
  checked: boolean
  onChange: (c: boolean) => void
  icon: React.ReactNode
}) {
  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      padding: '20px',
      backgroundColor: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a' }}>{label}</span>
      </div>
      <DreamSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function DreamActionBar({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '14px',
      marginTop: '32px',
      paddingTop: '20px',
      borderTop: '1px solid #f1f5f9',
    }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '9px 22px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          color: '#475569',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        style={{
          padding: '9px 24px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: '#5b45f5',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
