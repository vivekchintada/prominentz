'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This component handles first-login welcome routing client-side
// It reads planTier from a data attribute set by the server page
export function WelcomeRouter({
  planTier,
  onboardingStep = 6,
}: {
  planTier: string
  onboardingStep?: number
}) {
  const router = useRouter()

  useEffect(() => {
    // If onboarding is incomplete, redirect to wizard
    if (onboardingStep < 6) {
      router.push('/onboarding')
      return
    }

    // Otherwise handle first-login welcome routing
    const key = `resto_welcomed_${planTier}`
    const alreadyWelcomed = localStorage.getItem(key)

    if (!alreadyWelcomed) {
      localStorage.setItem(key, 'true')
      const tier = planTier.toLowerCase() as 'starter' | 'pro' | 'enterprise'
      router.push(`/pricing/${tier}`)
    }
  }, [planTier, onboardingStep, router])

  return null
}

