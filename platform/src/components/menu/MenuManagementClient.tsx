'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CategoriesTableView from './CategoriesTableView'
import ItemsGridView from './ItemsGridView'
import AddonsTableView from './AddonsTableView'
import CouponsTableView from './CouponsTableView'

type MenuTab = 'categories' | 'items' | 'addons' | 'coupons'

export default function MenuManagementClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab = (searchParams.get('tab') as MenuTab) || 'categories'
  const [activeTab, setActiveTab] = useState<MenuTab>(
    ['categories', 'items', 'addons', 'coupons'].includes(initialTab) ? initialTab : 'categories'
  )

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/menu/categories?all=true')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.map((c: any) => ({ id: c.id, name: c.name })))
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleTabChange = (tab: MenuTab) => {
    setActiveTab(tab)
    router.replace(`/dashboard/menu?tab=${tab}`)
  }

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 120px)' }}>
      {/* ── LEFT SUB-SIDEBAR (MENU MANAGEMENT) ─────────────────── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ padding: '0 8px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Menu Management
          </h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Categories Tab */}
          <button
            onClick={() => handleTabChange('categories')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              border: activeTab === 'categories' ? '1px solid #bfdbfe' : '1px solid transparent',
              background: activeTab === 'categories' ? '#eff6ff' : 'transparent',
              color: activeTab === 'categories' ? '#5b45f5' : '#475569',
              fontSize: 14,
              fontWeight: activeTab === 'categories' ? 700 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Layers icon */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            Categories
          </button>

          {/* Items Tab */}
          <button
            onClick={() => handleTabChange('items')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              border: activeTab === 'items' ? '1px solid #bfdbfe' : '1px solid transparent',
              background: activeTab === 'items' ? '#eff6ff' : 'transparent',
              color: activeTab === 'items' ? '#5b45f5' : '#475569',
              fontSize: 14,
              fontWeight: activeTab === 'items' ? 700 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Grid / dishes icon */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            Items
          </button>

          {/* Addons Tab */}
          <button
            onClick={() => handleTabChange('addons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              border: activeTab === 'addons' ? '1px solid #bfdbfe' : '1px solid transparent',
              background: activeTab === 'addons' ? '#eff6ff' : 'transparent',
              color: activeTab === 'addons' ? '#5b45f5' : '#475569',
              fontSize: 14,
              fontWeight: activeTab === 'addons' ? 700 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Addons / plus-list icon */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Addons
          </button>

          {/* Coupons Tab */}
          <button
            onClick={() => handleTabChange('coupons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              border: activeTab === 'coupons' ? '1px solid #bfdbfe' : '1px solid transparent',
              background: activeTab === 'coupons' ? '#eff6ff' : 'transparent',
              color: activeTab === 'coupons' ? '#5b45f5' : '#475569',
              fontSize: 14,
              fontWeight: activeTab === 'coupons' ? 700 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Ticket / Coupon icon */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
              <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2"/>
            </svg>
            Coupons
          </button>
        </nav>
      </aside>

      {/* ── RIGHT MAIN PANEL ──────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'categories' && (
          <CategoriesTableView onRefresh={fetchCategories} />
        )}
        {activeTab === 'items' && (
          <ItemsGridView categories={categories} onRefreshCategories={fetchCategories} />
        )}
        {activeTab === 'addons' && (
          <AddonsTableView />
        )}
        {activeTab === 'coupons' && (
          <CouponsTableView />
        )}
      </main>
    </div>
  )
}
