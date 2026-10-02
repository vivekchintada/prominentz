import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey && !resendApiKey.includes('REPLACE_ME') ? new Resend(resendApiKey) : null

interface OrderNotificationPayload {
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  fulfilmentType: string
  items: { name: string; quantity: number; lineTotal: number }[]
  total: number
  trackingUrl: string
  restaurantName: string
}

export async function sendOrderConfirmationNotification(payload: OrderNotificationPayload) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    fulfilmentType,
    items,
    total,
    trackingUrl,
    restaurantName,
  } = payload

  // 1. Transactional Email via Resend if email is provided
  if (customerEmail && resend) {
    try {
      const itemsListHtml = items
        .map((i) => `<tr><td style="padding: 6px 0;">${i.quantity}x ${i.name}</td><td style="text-align: right; padding: 6px 0;">$${i.lineTotal.toFixed(2)}</td></tr>`)
        .join('')

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Prominentz <orders@prominentz.com>',
        to: customerEmail,
        subject: `Order Confirmed: ${orderNumber} - ${restaurantName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h1 style="color: #0f172a; font-size: 22px; margin-bottom: 8px;">Order Confirmed! 🍽️</h1>
            <p style="font-size: 15px; color: #475569;">Hi ${customerName}, your ${fulfilmentType.toLowerCase()} order has been received by ${restaurantName}.</p>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #334155;">Order #${orderNumber}</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${itemsListHtml}
                <tr style="border-top: 1px solid #cbd5e1; font-weight: 700;">
                  <td style="padding-top: 10px;">Total</td>
                  <td style="text-align: right; padding-top: 10px;">$${total.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 24px;">
              <a href="${trackingUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Track Your Order Live ➔
              </a>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">
              Thank you for ordering with ${restaurantName}. Powered by Prominentz.
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.warn('[Notifications] Failed to dispatch order email via Resend:', err)
    }
  } else if (customerEmail) {
    console.log(`[Mock Notification] Order confirmation email simulated for ${customerEmail} (Order: ${orderNumber})`)
  }

  // 2. Simulated SMS dispatch for phone updates
  if (payload.customerPhone) {
    console.log(`[SMS Notification] Simulated text to ${payload.customerPhone}: "${restaurantName}: Your order #${orderNumber} is confirmed! Track live at: ${trackingUrl}"`)
  }
}
