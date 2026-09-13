'use client'

import React from 'react'

interface PageHeaderProps {
  title: string
  /** Optional small icon/emoji before the title */
  icon?: React.ReactNode
  /** Whether to show the rotating refresh indicator after the title */
  showRefresh?: boolean
  /** Right-side action buttons (Add New, Export, etc.) */
  actions?: React.ReactNode
  /** Optional subtitle / breadcrumb below the title */
  subtitle?: string
}

/**
 * PageHeader — standardised sticky top bar for every dashboard page.
 * Matches the DreamsPOS pattern: title + refresh on the left, actions on the right.
 * Drop this at the top of any page component and let layout.tsx handle the main wrapper.
 */
export function PageHeader({ title, icon, showRefresh = false, actions, subtitle }: PageHeaderProps) {
  return (
    <header className="page-header">
      {/* Left: title group */}
      <div className="page-header__title-group">
        <div className="page-header__title-row">
          {icon && <span className="page-header__icon">{icon}</span>}
          <h1 className="page-header__title">{title}</h1>
          {showRefresh && (
            <button
              className="page-header__refresh"
              aria-label="Refresh"
              title="Refresh"
              onClick={() => window.location.reload()}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          )}
        </div>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      {/* Right: action buttons */}
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
