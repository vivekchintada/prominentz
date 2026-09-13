/**
 * Twilio SMS Helper — Phase D Module D2
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.
 * All functions are no-ops (log warnings) if env vars are missing so the app
 * continues to work without Twilio configured during development.
 */

function getClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null
  // Dynamic import to avoid bundler issues with optional dependency
  return { sid, token }
}

/**
 * Sends a raw SMS message via Twilio REST API.
 * Uses fetch directly to avoid requiring the twilio npm package on every edge.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const creds = getClient()
  const from  = process.env.TWILIO_PHONE_NUMBER

  if (!creds || !from) {
    console.warn('[Twilio] SMS not sent — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER not configured.')
    return
  }

  // Normalize to E.164 (best-effort)
  const normalizedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`
    const authHeader = 'Basic ' + Buffer.from(`${creds.sid}:${creds.token}`).toString('base64')

    const params = new URLSearchParams({ To: normalizedTo, From: from, Body: body })
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Twilio] SMS failed:', err)
    } else {
      console.log(`[Twilio] SMS sent to ${normalizedTo}`)
    }
  } catch (err) {
    console.error('[Twilio] Network error sending SMS:', err)
  }
}

/** Sends waitlist-ready notification to a guest */
export async function sendWaitlistReady(phone: string, guestName: string, restaurantName: string): Promise<void> {
  await sendSms(
    phone,
    `Hi ${guestName}! Your table at ${restaurantName} is ready. Please head to the host stand now. Reply STOP to opt out.`
  )
}

/** Sends reservation confirmation to a guest */
export async function sendReservationConfirmed(
  phone: string,
  guestName: string,
  restaurantName: string,
  dateTime: string,
  partySize: number
): Promise<void> {
  await sendSms(
    phone,
    `Hi ${guestName}, your reservation for ${partySize} at ${restaurantName} on ${dateTime} is confirmed! We look forward to seeing you. Reply STOP to opt out.`
  )
}

/** Sends low-stock alert to a manager */
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
    `⚠️ Resto AI Alert for ${managerName} @ ${locationName}: Low stock on: ${itemList}${more}. Please reorder. Reply STOP to opt out.`
  )
}
