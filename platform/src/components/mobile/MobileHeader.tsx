'use client'

import React from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ProminentzLogo } from '@/components/ui/ProminentzLogo'

export function MobileHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(18, 18, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Link href="/m" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ProminentzLogo variant="icon" size="sm" />
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
          PROMINENTZ
        </span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(91, 69, 245, 0.15)',
            color: '#7b68f7',
            border: '1px solid rgba(91, 69, 245, 0.3)',
          }}
        >
          Manager
        </span>
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: '/login?portal=manager' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          color: '#ef4444',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Sign Out of Mobile Manager"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Sign Out</span>
      </button>
    </header>
  )
}
