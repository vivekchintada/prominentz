'use client'

import { toast } from 'sonner'

// Toasts are rendered by Sonner via <AppToaster /> in the root layout.
// This file keeps the old useToast() API so existing screens keep working.
// New code should import { toast } from 'sonner' directly.

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id:      number
  message: string
  variant: ToastVariant
}

// Module-level so the reference is stable across renders (callers list it in hook deps).
function showToast(message: string, variant: ToastVariant = 'success') {
  toast[variant](message)
}

function dismissToast(id?: number) {
  toast.dismiss(id)
}

const NO_TOASTS: ToastItem[] = []

/** @deprecated Use `toast` from 'sonner' directly. */
export function useToast(duration?: number) {
  void duration // per-toast duration now comes from <AppToaster />
  return { toasts: NO_TOASTS, showToast, dismissToast }
}

/** @deprecated No-op: <AppToaster /> in the root layout renders all toasts. */
export function ToastContainer(_props: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return null
}
