import { prisma } from '@/lib/prisma'

export async function resolveLocationContext(userId: string, restaurantId: string) {
  const employee = await prisma.employee.findFirst({
    where: { userId, isActive: true },
    select: { locationId: true },
  })

  const location = employee?.locationId
    ? await prisma.location.findFirst({
        where: { id: employee.locationId, restaurantId },
        select: { id: true, name: true, restaurantId: true },
      })
    : await prisma.location.findFirst({
        where: { restaurantId },
        orderBy: [{ isHeadquarters: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, restaurantId: true },
      })

  return location
}

export async function resolveActiveLocation(userId: string, restaurantId: string) {
  const employee = await prisma.employee.findFirst({
    where: { userId, isActive: true },
    select: { id: true, locationId: true },
  })
  if (employee) return { employeeId: employee.id, locationId: employee.locationId }
  const location = await prisma.location.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return { employeeId: null, locationId: location?.id ?? null }
}
