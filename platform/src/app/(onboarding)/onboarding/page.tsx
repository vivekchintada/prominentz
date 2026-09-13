import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const metadata = {
  title: 'Setup Your Restaurant | Resto AI',
}

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Only OWNER/MANAGER can complete onboarding
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { onboardingStep: true },
  })

  const onboardingStep = restaurant?.onboardingStep ?? 0

  // Already complete — send to dashboard
  if (onboardingStep >= 6) redirect('/dashboard')

  return <OnboardingWizard initialStep={onboardingStep} />
}
