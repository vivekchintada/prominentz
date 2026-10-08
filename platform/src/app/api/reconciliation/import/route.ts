import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { importStatement } from '@/lib/delivery-reconciliation'
import { resolveLocationContext } from '@/lib/location-context'

// POST /api/reconciliation/import
// Accepts multipart/form-data with fields: file (CSV), providerId, locationId, periodStart, periodEnd
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const providerId = formData.get('providerId') as string
    let locationId = formData.get('locationId') as string
    if (!locationId) {
      const loc = await resolveLocationContext(session.user.id, session.user.restaurantId)
      locationId = loc?.id || ''
    }
    const periodStart = formData.get('periodStart') as string
    const periodEnd = formData.get('periodEnd') as string

    if (!file || !providerId || !locationId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'file, providerId, locationId, periodStart, and periodEnd are required' },
        { status: 400 }
      )
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
  } catch (error: unknown) {
    console.error('POST /api/reconciliation/import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
