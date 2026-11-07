import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  email: z.string().trim().email('Please enter a valid email').max(200),
  restaurantName: z.string().trim().min(2, 'Please enter your restaurant name').max(150),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  locations: z.number().int().min(1).max(10000).optional(),
  currentPos: z.string().trim().max(60).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
  source: z.string().trim().max(300).optional(),
  website: z.string().optional(), // honeypot
})

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// ─── POST /api/leads ──────────────────────────────────────────────────────────
// "Book a demo" form on the marketing site. Saves the lead and emails the founder.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limited = await rateLimit(`leads:${ip}`, 5, 600)
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterSec)

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message || 'Please check the form'
    return NextResponse.json({ error: first }, { status: 400 })
  }
  const d = parsed.data

  // Bots fill every field, including the hidden one. Pretend success so they move on.
  if (d.website) return NextResponse.json({ ok: true })

  let lead
  try {
    lead = await prisma.lead.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        restaurantName: d.restaurantName,
        phone: d.phone || null,
        locations: d.locations ?? null,
        currentPos: d.currentPos || null,
        message: d.message || null,
        source: d.source || null,
      },
    })
  } catch (err) {
    console.error('[POST /api/leads] could not save lead:', err)
    return NextResponse.json(
      { error: 'Sorry, we could not send that just now. Please email support@prominentz.com.' },
      { status: 503 },
    )
  }

  const notifyTo = process.env.SALES_NOTIFY_EMAIL
  if (process.env.RESEND_API_KEY && notifyTo) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Prominentz <onboarding@resend.dev>',
        to: notifyTo,
        replyTo: d.email,
        subject: `New demo request: ${d.restaurantName} (${d.locations ?? 1} location${(d.locations ?? 1) > 1 ? 's' : ''})`,
        html: `
          <h2>New demo request</h2>
          <p><strong>${escape(d.name)}</strong> — ${escape(d.email)}${d.phone ? ` — ${escape(d.phone)}` : ''}</p>
          <p><strong>Restaurant:</strong> ${escape(d.restaurantName)}<br/>
             <strong>Locations:</strong> ${d.locations ?? 1}<br/>
             <strong>Current POS:</strong> ${escape(d.currentPos || 'not specified')}<br/>
             <strong>Source:</strong> ${escape(d.source || 'direct')}</p>
          ${d.message ? `<p><strong>Message:</strong><br/>${escape(d.message)}</p>` : ''}
          <p>Reply to this email to reach them directly. Speed matters: leads contacted within an hour convert far better.</p>
        `,
      })
    } catch (err) {
      // The lead is saved; email is best-effort.
      console.error('[POST /api/leads] notification email failed:', err)
    }
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
}
