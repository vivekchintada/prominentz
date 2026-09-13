import React from 'react'

interface ActionButtonsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  /** Hide the view (eye) button */
  hideView?: boolean
  /** Hide the edit (pencil) button */
  hideEdit?: boolean
  /** Hide the delete (trash) button */
  hideDelete?: boolean
}

/**
 * ActionButtons — standardised row-action icons used in all data tables.
 * Renders view 👁, edit ✏, delete 🗑 icon buttons in a consistent style.
 */
export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  hideView = false,
  hideEdit = false,
  hideDelete = false,
}: ActionButtonsProps) {
  return (
    <div className="action-btn-group">
      {!hideView && onView && (
        <button
          className="action-btn action-btn--view"
          onClick={onView}
          aria-label="View"
          title="View"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
      {!hideEdit && onEdit && (
        <button
          className="action-btn action-btn--edit"
          onClick={onEdit}
          aria-label="Edit"
          title="Edit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {!hideDelete && onDelete && (
        <button
          className="action-btn action-btn--delete"
          onClick={onDelete}
          aria-label="Delete"
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  )
}
