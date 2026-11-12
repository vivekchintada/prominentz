'use client'

import { BentoErrorState } from '@/components/bento/BentoErrorState'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BentoErrorState
      area="Dashboard"
      title="This page could not load"
      detail="Something went wrong while loading this section. Your orders, payments and settings are unchanged."
      error={error}
      onRetry={reset}
      homeHref="/dashboard"
      homeLabel="Back to overview"
    />
  )
}
