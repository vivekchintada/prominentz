import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { importStatement } from '@/lib/delivery-reconciliation'
import { resolveOwnedLocation } from '@/lib/location-context'
import { prisma } from '@/lib/prisma'

// POST /api/reconciliation/import
// Accepts multipart/form-data with fields: file (CSV), providerId, locationId, periodStart, periodEnd
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const providerId = formData.get('providerId') as string
    const locationId =
      (await resolveOwnedLocation(session.user.id, session.user.restaurantId, formData.get('locationId') as string | null))?.id || ''
    const periodStart = formData.get('periodStart') as string
    const periodEnd = formData.get('periodEnd') as string

    if (!file || !providerId || !locationId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'file, providerId, locationId, periodStart, and periodEnd are required' },
        { status: 400 }
      )
    }

    const provider = await prisma.deliveryProvider.findFirst({ where: { id: providerId, locationId }, select: { id: true } })
    if (!provider) {
      return NextResponse.json({ error: 'Delivery provider not found for this location' }, { status: 404 })
    }

    const csvText = await file.text()
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
    }

    const result = await importStatement({
      providerId,
      locationId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      csvText,
      importedBy: session.user.id,
    })

    const status = result.isDuplicate ? 200 : 201
    return NextResponse.json(result, { status })
  } catch (error: any) {
    console.error('POST /api/reconciliation/import error:', error)
    return NextResponse.json({ error: 'Reconciliation request failed' }, { status: 500 })
  }
}
