/**
 * Meta WhatsApp Cloud API Client
 * 
 * Direct integration with Meta Graph API v20.0 for WhatsApp Business.
 * Provides transactional notifications for restaurants:
 * - Table / Waitlist ready notifications (with action prompts)
 * - Reservation confirmations & cancellations
 * - Low-stock alerts for managers
 * - Digital receipt links
 * 
 * Required Env Vars:
 * - WHATSAPP_ACCESS_TOKEN (Permanent System User Token or dev token)
 * - WHATSAPP_PHONE_NUMBER_ID (From WhatsApp App Dashboard)
 * 
 * All functions are non-blocking and safe in development without credentials.
 */

interface WhatsAppCredentials {
  token: string
  phoneNumberId: string
}

function getWhatsAppCredentials(): WhatsAppCredentials | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return null
  }

  return { token, phoneNumberId }
}

/**
 * Normalizes phone numbers to standard E.164 format (without leading '+' for WhatsApp Meta API)
 * e.g. "+44 7911 123456" -> "447911123456", "09876543210" (with default country)
 */
export function normalizeWhatsAppNumber(phone: string, defaultCountryCode: string = '1'): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`
  }
  return digits
}

export interface SendWhatsAppTextParams {
  to: string
  body: string
  previewUrl?: boolean
}

/**
 * Sends a standard text message via WhatsApp Cloud API
 */
export async function sendWhatsAppText(params: SendWhatsAppTextParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = getWhatsAppCredentials()
  const recipient = normalizeWhatsAppNumber(params.to)

  if (!creds) {
    console.info(`[WhatsApp Mock] Message to ${recipient}:\n${params.body}`)
    return { success: true, messageId: 'mock-msg-id' }
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: params.previewUrl ?? false,
        body: params.body,
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[WhatsApp Cloud API] Error:', JSON.stringify(data, null, 2))
      return { success: false, error: data?.error?.message || 'Failed to send WhatsApp message' }
    }

    const messageId = data?.messages?.[0]?.id
    console.info(`[WhatsApp Cloud API] Sent message ${messageId} to ${recipient}`)
    return { success: true, messageId }
  } catch (err: any) {
    console.error('[WhatsApp Cloud API] Network error:', err?.message || err)
    return { success: false, error: err?.message || 'Network failure' }
  }
}

/**
 * Sends an interactive button message (e.g., Table Ready with [On My Way] button)
 */
export async function sendWhatsAppInteractiveButtons(params: {
  to: string
  body: string
  header?: string
  footer?: string
  buttons: Array<{ id: string; title: string }>
}): Promise<{ success: boolean; messageId?: string }> {
  const creds = getWhatsAppCredentials()
  const recipient = normalizeWhatsAppNumber(params.to)

  if (!creds) {
    console.info(`[WhatsApp Mock Interactive] to ${recipient}: ${params.body} [Buttons: ${params.buttons.map(b => b.title).join(', ')}]`)
    return { success: true, messageId: 'mock-interactive-id' }
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${creds.phoneNumberId}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(params.header ? { header: { type: 'text', text: params.header } } : {}),
        body: { text: params.body },
        ...(params.footer ? { footer: { text: params.footer } } : { footer: { text: 'Prominentz Hospitality' } }),
        action: {
          buttons: params.buttons.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title.slice(0, 20), // WhatsApp limits button title to 20 chars
            },
          })),
        },
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      // If interactive fails (e.g. 24h service window restriction), fallback to standard text message
      console.warn('[WhatsApp Interactive] Falling back to standard text message due to:', data?.error?.message)
      return await sendWhatsAppText({ to: params.to, body: params.body })
    }

    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    console.error('[WhatsApp Interactive] Error:', err)
    return await sendWhatsAppText({ to: params.to, body: params.body })
  }
}

// ─── DOMAIN NOTIFICATION HELPERS ─────────────────────────────────────────────

export interface WaitlistReadyNotification {
  to: string
  guestName: string
  restaurantName: string
  tableName?: string
}

/**
 * Sends a table-ready notification to a waitlist guest
 */
export async function sendWhatsAppWaitlistReady(params: WaitlistReadyNotification): Promise<void> {
  const tableText = params.tableName ? ` (${params.tableName})` : ''
  const message = `🎉 *Table Ready at ${params.restaurantName}!*\n\nHi ${params.guestName}, your table${tableText} is now prepared for you. Please make your way to the host stand.`

  await sendWhatsAppInteractiveButtons({
    to: params.to,
    header: `🍽️ Table Ready!`,
    body: message,
    footer: params.restaurantName,
    buttons: [
      { id: 'arriving_now', title: "I'm on my way" },
      { id: 'need_5_mins', title: 'Need 5 mins' },
    ],
  })
}

export interface ReservationConfirmationNotification {
  to: string
  guestName: string
  restaurantName: string
  dateTime: string
  partySize: number
  tableNumber?: string
  address?: string
}

/**
 * Sends a reservation confirmation message to a guest
 */
export async function sendWhatsAppReservationConfirmed(params: ReservationConfirmationNotification): Promise<void> {
  const formattedDate = new Date(params.dateTime).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const body = `✨ *Reservation Confirmed!*\n\n` +
    `Hello *${params.guestName}*,\n` +
    `We are delighted to confirm your reservation at *${params.restaurantName}*.\n\n` +
    `📅 *Date & Time:* ${formattedDate}\n` +
    `👥 *Guests:* ${params.partySize} person(s)\n` +
    (params.tableNumber ? `🪑 *Assigned Table:* ${params.tableNumber}\n` : '') +
    (params.address ? `📍 *Location:* ${params.address}\n\n` : '\n') +
    `We look forward to hosting you!`

  await sendWhatsAppText({
    to: params.to,
    body,
  })
}

export interface ReservationCancellationNotification {
  to: string
  guestName: string
  restaurantName: string
  dateTime: string
}

/**
 * Sends a reservation cancellation alert
 */
export async function sendWhatsAppReservationCancelled(params: ReservationCancellationNotification): Promise<void> {
  const formattedDate = new Date(params.dateTime).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const body = `❌ *Reservation Cancelled*\n\n` +
    `Hi ${params.guestName}, your reservation at *${params.restaurantName}* scheduled for *${formattedDate}* has been cancelled.\n\n` +
    `If you did not request this or would like to rebook, please contact us.`

  await sendWhatsAppText({
    to: params.to,
    body,
  })
}

export interface LowStockAlertNotification {
  to: string
  managerName: string
  restaurantName: string
  locationName: string
  items: Array<{ name: string; currentStock: number; unit: string; minStock: number }>
}

/**
 * Sends low-stock alerts to kitchen/store managers via WhatsApp
 */
export async function sendWhatsAppLowStockAlert(params: LowStockAlertNotification): Promise<void> {
  const itemLines = params.items
    .map((i) => `• *${i.name}*: ${i.currentStock} ${i.unit} (Min threshold: ${i.minStock} ${i.unit})`)
    .join('\n')

  const body = `⚠️ *Prominentz Low Stock Warning*\n\n` +
    `Attention *${params.managerName}* (${params.locationName}):\n` +
    `The following items are running below reorder levels:\n\n` +
    `${itemLines}\n\n` +
    `Please place a purchase order soon to avoid 86ing menu items.`

  await sendWhatsAppText({
    to: params.to,
    body,
  })
}

export interface ReceiptWhatsAppNotification {
  to: string
  guestName: string
  restaurantName: string
  orderId: string
  total: number
  receiptUrl: string
}

/**
 * Sends a digital e-receipt link via WhatsApp
 */
export async function sendWhatsAppReceipt(params: ReceiptWhatsAppNotification): Promise<void> {
  const body = `🧾 *Your Receipt from ${params.restaurantName}*\n\n` +
    `Hi ${params.guestName}, thank you for dining with us today!\n\n` +
    `💳 *Order Total:* $${params.total.toFixed(2)}\n` +
    `🆔 *Receipt ID:* #${params.orderId.substring(0, 8)}\n\n` +
    `View or download your digital receipt here:\n${params.receiptUrl}`

  await sendWhatsAppText({
    to: params.to,
    body,
    previewUrl: true,
  })
}
