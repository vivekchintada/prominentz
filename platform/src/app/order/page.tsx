import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function OrderIndexPage() {
  const location = await prisma.location.findFirst({
    orderBy: [{ isHeadquarters: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })

  if (!location) {
    notFound()
  }

  redirect(`/order/${location.id}`)
}
