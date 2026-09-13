'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarCollapseContextValue {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
})

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  // Read persisted state; default = expanded (false)
  const [collapsed, setCollapsedState] = useState<boolean>(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('resto_sidebar_collapsed')
      if (saved !== null) setCollapsedState(saved === 'true')
    } catch {}
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try { localStorage.setItem('resto_sidebar_collapsed', String(v)) } catch {}
  }

  const toggle = () => setCollapsed(!collapsed)

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext)
}
