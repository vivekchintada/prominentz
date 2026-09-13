import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEmployeeSchema = z.object({
  jobTitle:          z.string().max(100).optional(),
  isActive:          z.boolean().optional(),
  phone:             z.string().max(30).optional().nullable(),
  hourlyRate:        z.number().positive().optional().nullable(),
  hireDate:          z.string().datetime().optional().nullable(),
  emergencyContact:  z.string().max(200).optional().nullable(),
})


// ─── PATCH /api/employees/[id] ────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.employee.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { jobTitle, isActive, phone, hourlyRate, hireDate, emergencyContact } = parsed.data

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(jobTitle          !== undefined ? { jobTitle }         : {}),
        ...(isActive          !== undefined ? { isActive }         : {}),
        ...(phone             !== undefined ? { phone }            : {}),
        ...(hourlyRate        !== undefined ? { hourlyRate }       : {}),
        ...(emergencyContact  !== undefined ? { emergencyContact } : {}),
        ...(hireDate          !== undefined ? { hireDate: hireDate ? new Date(hireDate) : null } : {}),
      },
    })


    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/employees/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
