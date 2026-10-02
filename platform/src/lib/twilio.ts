/**
 * Twilio Messaging Helper — SMS + WhatsApp Sandbox
 *
 * Supports two channels via the same Twilio account:
 *   1. WhatsApp Sandbox (mock/dev) — set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
 *      Guests must have joined the sandbox first: text "join <your-keyword>" to that number.
 *   2. SMS fallback — set TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
 *
 * All env vars are optional — missing vars cause a console.warn, never a runtime crash.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID    — from twilio.com/console
 *   TWILIO_AUTH_TOKEN     — from twilio.com/console
 *   TWILIO_WHATSAPP_FROM  — "whatsapp:+14155238886" (sandbox) or your approved WA number
 *   TWILIO_PHONE_NUMBER   — "+1xxxxxxxxxx" (SMS fallback)
 */

const TWILIO_API = 'https://api.twilio.com/2010-04-01/Accounts'

function getTwilioCreds() {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token || sid.includes('REPLACE') || token.includes('REPLACE')) return null
  return { sid, token, auth: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') }
}

/** Normalize to E.164: "+919876543210" */
function toE164(phone: string, defaultCountryCode = '1'): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`
  return `+${digits}`
}

/**
 * Core send function. Sends via Twilio REST API.
 * `from` can be a phone number OR "whatsapp:+14155238886"
 * `to` will be prefixed with "whatsapp:" automatically when from is a WA number.
 */
async function twilioSend(to: string, from: string, body: string): Promise<void> {
  const creds = getTwilioCreds()
  if (!creds) {
    console.warn('[Twilio] Credentials not configured — message logged only.\nTO:', to, '\nMSG:', body)
    return
  }

  const isWhatsApp = from.startsWith('whatsapp:')
  const toFormatted = isWhatsApp
    ? `whatsapp:${toE164(to)}`
    : toE164(to)

  try {
    const endpoint = `${TWILIO_API}/${creds.sid}/Messages.json`
    const params = new URLSearchParams({ To: toFormatted, From: from, Body: body })
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: creds.auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[Twilio] Send failed:', JSON.stringify(data))
    } else {
      const channel = isWhatsApp ? 'WhatsApp' : 'SMS'
      console.log(`[Twilio] ${channel} sent → ${toFormatted} | SID: ${(data as any).sid}`)
    }
  } catch (err) {
    console.error('[Twilio] Network error:', err)
  }
}

/**
 * Sends a WhatsApp message via Twilio (sandbox or production WA number).
 * Falls back to SMS if TWILIO_WHATSAPP_FROM is not configured.
 */
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const waFrom  = process.env.TWILIO_WHATSAPP_FROM  // e.g. "whatsapp:+14155238886"
  const smsFrom = process.env.TWILIO_PHONE_NUMBER

  if (waFrom) {
    await twilioSend(to, waFrom, body)
  } else if (smsFrom) {
    console.info('[Twilio] TWILIO_WHATSAPP_FROM not set — falling back to SMS')
    await twilioSend(to, smsFrom, body)
  } else {
    console.warn('[Twilio] No sender configured (TWILIO_WHATSAPP_FROM / TWILIO_PHONE_NUMBER). Message not sent.\n', body)
  }
}

/**
 * Sends a raw SMS message via Twilio REST API.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!from) {
    console.warn('[Twilio] TWILIO_PHONE_NUMBER not configured — SMS skipped.\n', body)
    return
  }
  await twilioSend(to, from, body)
}

// ─── DOMAIN NOTIFICATION HELPERS ─────────────────────────────────────────────

/** Sends waitlist-ready notification to a guest (WhatsApp first, SMS fallback) */
export async function sendWaitlistReady(
  phone: string,
  guestName: string,
  restaurantName: string
): Promise<void> {
  const body =
    `🎉 *Table Ready — ${restaurantName}*\n\n` +
    `Hi *${guestName}*, your table is now ready!\n` +
    `Please head to the host stand. We're excited to have you with us.\n\n` +
    `_Reply STOP to opt out of SMS updates._`

  await sendWhatsApp(phone, body)
}

/**
 * Sends a warm reservation confirmation via WhatsApp (Twilio sandbox or production).
 * Message tone: "We took care of your evening."
 */
export async function sendReservationConfirmed(
  phone: string,
  guestName: string,
  restaurantName: string,
  dateTime: string,   // Human-readable, e.g. "Sep 22, 8:00 PM"
  partySize: number,
  tableNumber?: string,
  notes?: string | null
): Promise<void> {
  const tableInfo = tableNumber ? `\n🪑 *Table:* ${tableNumber}` : ''
  const noteInfo  = notes       ? `\n📝 *Note:* ${notes}` : ''

  const body =
    `✨ *Reservation Confirmed!*\n\n` +
    `Hello *${guestName}*,\n\n` +
    `We have taken care of your evening at *${restaurantName}*.\n` +
    `Here are your reservation details:\n\n` +
    `📅 *Date & Time:* ${dateTime}\n` +
    `👥 *Party Size:* ${partySize} guest${partySize > 1 ? 's' : ''}` +
    tableInfo +
    noteInfo + `\n\n` +
    `We look forward to hosting you for a wonderful dining experience. ` +
    `If you need to make changes, please contact us.\n\n` +
    `_Reply STOP to opt out._`

  await sendWhatsApp(phone, body)
}

/** Sends a reservation cancellation via WhatsApp */
export async function sendReservationCancelled(
  phone: string,
  guestName: string,
  restaurantName: string,
  dateTime: string
): Promise<void> {
  const body =
    `❌ *Reservation Cancelled — ${restaurantName}*\n\n` +
    `Hi *${guestName}*, your reservation on *${dateTime}* has been cancelled.\n\n` +
    `We hope to welcome you another time. To rebook, please visit us or contact the restaurant directly.\n\n` +
    `_Reply STOP to opt out._`

  await sendWhatsApp(phone, body)
}

/** Sends a day-before reminder via WhatsApp */
export async function sendReservationReminder(
  phone: string,
  guestName: string,
  restaurantName: string,
  dateTime: string,
  partySize: number
): Promise<void> {
  const body =
    `🍽️ *Reminder — Your Reservation Tomorrow*\n\n` +
    `Hi *${guestName}*, just a friendly reminder that your table for *${partySize}* ` +
    `at *${restaurantName}* is confirmed for *${dateTime}*.\n\n` +
    `We've prepared everything for a great evening. See you soon! 😊\n\n` +
    `_Reply STOP to opt out._`

  await sendWhatsApp(phone, body)
}

/** Sends low-stock alert to a manager via SMS (internal — not guest-facing) */
export async function sendLowStockAlert(
  phone: string,
  managerName: string,
  locationName: string,
  items: string[]
): Promise<void> {
  const itemList = items.slice(0, 5).join(', ')
  const more = items.length > 5 ? ` (+${items.length - 5} more)` : ''
  await sendSms(
    phone,
    `⚠️ Prominentz Alert for ${managerName} @ ${locationName}: Low stock on: ${itemList}${more}. Please reorder.`
  )
}
