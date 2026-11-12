'use client'

import { BentoErrorState } from '@/components/bento/BentoErrorState'

export default function KdsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BentoErrorState
      area="Kitchen display"
      title="The kitchen screen hit a problem"
      detail="Tickets are safe on the server. Reload to see them again."
      error={error}
      onRetry={reset}
      retryLabel="Reload the kitchen screen"
      night
    />
  )
}
