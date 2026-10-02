import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const holidaySchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(2).max(100),
  date: z.string().datetime(),
  isClosed: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get('locationId')
  if (!locationId) {
    return NextResponse.json({ error: 'Missing locationId' }, { status: 400 })
  }

  const holidays = await prisma.orderingHoliday.findMany({
    where: { locationId },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = holidaySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { locationId, name, date, isClosed } = parsed.data
  const dateObj = new Date(date)
  dateObj.setHours(0, 0, 0, 0)

  const holiday = await prisma.orderingHoliday.upsert({
    where: {
      locationId_date: {
        locationId,
        date: dateObj,
      },
    },
    update: {
      name,
      isClosed,
    },
    create: {
      locationId,
      name,
      date: dateObj,
      isClosed,
    },
  })

  return NextResponse.json(holiday)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.orderingHoliday.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
