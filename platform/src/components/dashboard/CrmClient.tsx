'use client'

import React, { useState, useEffect } from 'react'
import CustomerProfileModal from './CustomerProfileModal'


interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  pointsBalance: number
  lifetimeSpend: number
  totalVisits: number
  allergyTags: string[]
  notes?: string
  createdAt: string
  _count?: { orders: number }
}

export function CrmClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [allergies, setAllergies] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCustomers = async (searchQuery = '') => {
    setLoading(true)
    try {
      const url = searchQuery ? `/api/customers?q=${encodeURIComponent(searchQuery)}` : '/api/customers'
      const res = await fetch(url)
      const data = await res.json()
      if (data.customers) {
        setCustomers(data.customers)
      }
    } catch (err) {
      console.error('Failed to fetch customers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers(query)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSubmitting(true)
    try {
      const tagArray = allergies.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, allergyTags: tagArray, notes }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setName('')
        setPhone('')
        setEmail('')
        setAllergies('')
        setNotes('')
        fetchCustomers(query)
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to save customer')
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving customer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>👥 Customer CRM & Guest Directory</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Guest spend profiles, loyalty balances, visit frequencies, and allergy notes
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ➕ Register New Guest
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone (+1...), or email..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#111827',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {/* Customer Directory Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>Loading guest directory...</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            No customer profiles found. Click <strong>"Register New Guest"</strong> to create one!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                  <th style={{ padding: '12px 16px' }}>Guest Name</th>
                  <th style={{ padding: '12px 16px' }}>Phone / Email</th>
                  <th style={{ padding: '12px 16px' }}>Points Balance</th>
                  <th style={{ padding: '12px 16px' }}>Lifetime Spend</th>
                  <th style={{ padding: '12px 16px' }}>Total Visits</th>
                  <th style={{ padding: '12px 16px' }}>Allergies / Tags</th>
                  <th style={{ padding: '12px 16px' }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f9fafb')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {c.name}
                      {c.notes && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>Note: {c.notes}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{c.phone}</div>
                      {c.email && <div style={{ fontSize: '11px', color: '#6b7280' }}>{c.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '12px', fontWeight: 700 }}>
                        ⭐ {c.pointsBalance} pts
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>
                      ${Number(c.lifetimeSpend).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{c.totalVisits} visits</td>
                    <td style={{ padding: '12px 16px' }}>
                      {Array.isArray(c.allergyTags) && c.allergyTags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {c.allergyTags.map((tag, tIdx) => (
                            <span key={tIdx} style={{ padding: '2px 6px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                              🚫 {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>➕ Register New Customer Profile</h3>
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Dairy, Gluten-Free"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Internal Notes</label>
                <input
                  type="text"
                  placeholder="VIP guest, prefers patio table 4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedCustomerId && (
        <CustomerProfileModal
          customerId={selectedCustomerId}
          onClose={() => {
            setSelectedCustomerId(null)
            fetchCustomers(query) // refresh list in case edits were made
          }}
        />
      )}
    </div>
  )
}
