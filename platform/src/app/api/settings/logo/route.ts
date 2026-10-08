import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── POST /api/settings/logo ──────────────────────────────────────────────────
// Accepts a base64-encoded image or a public URL and saves it to settings.store.logoUrl.
// For full file-upload support, replace with an object storage provider (S3/Cloudflare R2/Supabase Storage).
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to change logo' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const contentType = req.headers.get('content-type') || ''

    let logoUrl: string | null = null

    if (contentType.includes('application/json')) {
      // Accepts { logoUrl: "https://..." } — direct URL paste
      const body = await req.json()
      const rawUrl = body.logoUrl
      if (typeof rawUrl === 'string') {
        const clean = rawUrl.trim()
        if (clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('data:image/')) {
          logoUrl = clean
        } else {
          return NextResponse.json({ error: 'Invalid image URL protocol' }, { status: 400 })
        }
      }
    } else if (contentType.includes('multipart/form-data')) {
      // File upload: read binary and store as base64 data-URI
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'Logo file must be under 2 MB' }, { status: 413 })
      }

      // Restrict strictly to safe raster image formats (blocks SVG XSS)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, or WEBP.' }, { status: 415 })
      }

      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      logoUrl = `data:${file.type};base64,${base64}`
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type. Use application/json or multipart/form-data.' }, { status: 415 })
    }

    if (!logoUrl) {
      return NextResponse.json({ error: 'logoUrl is required' }, { status: 400 })
    }

    // Merge logoUrl into settings.store
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })

    const currentSettings = (restaurant?.settings as Record<string, any>) || {}
    const updatedSettings = {
      ...currentSettings,
      store: {
        ...(currentSettings.store || {}),
        logoUrl,
      },
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { settings: updatedSettings },
    })

    return NextResponse.json({ success: true, logoUrl })
  } catch (error: unknown) {
    console.error('[POST /api/settings/logo]', error)
    return NextResponse.json({ error: error.message || 'Failed to save logo' }, { status: 500 })
  }
}

// ─── DELETE /api/settings/logo ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete logo' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })

    const currentSettings = (restaurant?.settings as Record<string, any>) || {}
    const updatedSettings = {
      ...currentSettings,
      store: { ...(currentSettings.store || {}), logoUrl: '' },
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { settings: updatedSettings },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message || 'Failed to remove logo' }, { status: 500 })
  }
}
