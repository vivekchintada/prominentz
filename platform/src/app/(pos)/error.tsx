'use client'

import { BentoErrorState } from '@/components/bento/BentoErrorState'

export default function PosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BentoErrorState
      area="POS"
      title="The till hit a problem"
      detail="No order was changed and nothing was charged. Try again to pick up where you were."
      error={error}
      onRetry={reset}
      retryLabel="Reload the till"
      homeHref="/dashboard"
    />
  )
}
