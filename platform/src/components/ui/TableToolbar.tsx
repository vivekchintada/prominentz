'use client'

import React, { useState } from 'react'

interface TableToolbarProps {
  /** Placeholder text for the search input */
  searchPlaceholder?: string
  /** Called with the current search query on every keystroke */
  onSearch?: (query: string) => void
  /** Slot for custom filter buttons / dropdowns rendered after the search */
  filterNode?: React.ReactNode
  /** List of sort options shown in the sort dropdown */
  sortOptions?: string[]
  /** Called when a sort option is selected */
  onSortChange?: (sort: string) => void
  /** Slot for extra content on the right side (e.g. grid/list view toggle) */
  rightSlot?: React.ReactNode
  /** Current search value (controlled) */
  searchValue?: string
}

/**
 * TableToolbar — standardised search + filter + sort bar
 * that sits at the top of every data table, matching the DreamsPOS pattern.
 */
export function TableToolbar({
  searchPlaceholder = 'Search...',
  onSearch,
  filterNode,
  sortOptions,
  onSortChange,
  rightSlot,
  searchValue,
}: TableToolbarProps) {
  const [localQuery, setLocalQuery] = useState(searchValue ?? '')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  return (
    <div className="table-toolbar">
      {/* Search */}
      <div className="table-toolbar__search-wrap">
        <span className="table-toolbar__search-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          className="table-toolbar__search input"
          type="text"
          placeholder={searchPlaceholder}
          value={localQuery}
          onChange={handleSearch}
          aria-label="Search"
        />
      </div>

      {/* Right zone */}
      <div className="table-toolbar__right">
        {/* Custom filter node */}
        {filterNode}

        {/* Filter button */}
        <button className="table-toolbar__btn" aria-label="Filter">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter</span>
        </button>

        {/* Column toggle */}
        <button className="table-toolbar__btn table-toolbar__btn--icon" aria-label="Columns">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>

        {/* Sort dropdown */}
        {sortOptions && sortOptions.length > 0 && (
          <select
            className="table-toolbar__sort input"
            onChange={(e) => onSortChange?.(e.target.value)}
            aria-label="Sort by"
          >
            {sortOptions.map((opt) => (
              <option key={opt} value={opt}>
                Sort by: {opt}
              </option>
            ))}
          </select>
        )}

        {rightSlot}
      </div>
    </div>
  )
}
