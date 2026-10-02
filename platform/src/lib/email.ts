import { Resend } from 'resend'

// ─── Resend Client Singleton ──────────────────────────────────────────────────
const globalForResend = globalThis as unknown as { resend: Resend | undefined }

export const resend =
  globalForResend.resend ??
  new Resend(process.env.RESEND_API_KEY ?? '')

if (process.env.NODE_ENV !== 'production') globalForResend.resend = resend

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Prominentz <onboarding@resend.dev>'

// Guard: skip silently if API key is not yet configured (safe for dev)
function isConfigured(): boolean {
  const key = process.env.RESEND_API_KEY ?? ''
  return key.length > 0 && key !== 're_REPLACE_ME'
}

// ─── Receipt Email ────────────────────────────────────────────────────────────
export interface SendReceiptEmailParams {
  to: string
  restaurantName: string
  total: number
  receiptUrl: string  // relative path, e.g. /receipts/receipt-xxx.html
  tableName: string
  paymentId: string
}

export async function sendReceiptEmail(params: SendReceiptEmailParams): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping receipt email to', params.to)
    return false
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const receiptLink = appUrl + params.receiptUrl
  const totalStr = '$' + params.total.toFixed(2)

  const html = [
    '<!DOCTYPE html><html lang="en"><head>',
    '<meta charset="UTF-8"/><title>Your Receipt</title>',
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d0d0f;color:#f5f5f7;margin:0;padding:24px;}',
    '.card{background:#1a1a1d;border:1px solid #2a2a2e;border-radius:12px;max-width:480px;margin:0 auto;padding:32px;}',
    '.logo{font-size:22px;font-weight:800;color:#5b45f5;letter-spacing:-.02em;margin-bottom:4px;}',
    '.sub{font-size:13px;color:#a1a1aa;margin-bottom:24px;}',
    'hr{border:none;border-top:1px dashed #2a2a2e;margin:20px 0;}',
    '.meta{font-size:13px;color:#a1a1aa;margin:0 0 8px;}',
    '.meta strong{color:#f5f5f7;}',
    '.total{display:flex;justify-content:space-between;font-size:18px;font-weight:700;margin:16px 0;}',
    '.amount{color:#5b45f5;}',
    '.btn{display:inline-block;background:#5b45f5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;margin-top:20px;}',
    '.footer{margin-top:24px;font-size:11px;color:#52525b;text-align:center;line-height:1.5;}',
    '</style></head><body><div class="card">',
    '<div class="logo">' + params.restaurantName + '</div>',
    '<div class="sub">Thank you for dining with us!</div>',
    '<hr/>',
    '<p class="meta">Table: <strong>' + params.tableName + '</strong></p>',
    '<p class="meta">Receipt: <code style="color:#71717a;font-size:11px">' + params.paymentId + '</code></p>',
    '<hr/>',
    '<div class="total"><span>Total Charged</span><span class="amount">' + totalStr + '</span></div>',
    '<a href="' + receiptLink + '" class="btn">View Full Receipt &rarr;</a>',
    '<div class="footer">Sent by ' + params.restaurantName + ' via Prominentz.</div>',
    '</div></body></html>',
  ].join('')

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to:   [params.to],
      subject: params.restaurantName + ' — Your receipt (' + totalStr + ')',
      html,
    })
    if (error) {
      console.error('[Email] sendReceiptEmail failed:', error)
      return false
    }
    console.log('[Email] Receipt sent to', params.to)
    return true
  } catch (err) {
    console.error('[Email] sendReceiptEmail exception:', err)
    return false
  }
}

// ─── Reservation Confirmation Email ──────────────────────────────────────────
export interface SendReservationConfirmationParams {
  to: string
  guestName: string
  restaurantName: string
  scheduledAt: Date
  partySize: number
  tableName?: string
  notes?: string | null
}

export async function sendReservationConfirmation(params: SendReservationConfirmationParams): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping reservation email to', params.to)
    return false
  }

  const dateStr = new Date(params.scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const tableRow = params.tableName
    ? '<div class="row"><span class="lbl">Table</span><span class="val">' + params.tableName + '</span></div>'
    : ''
  const notesRow = params.notes
    ? '<div class="row"><span class="lbl">Notes</span><span class="val">' + params.notes + '</span></div>'
    : ''
  const guestsLabel = params.partySize + ' guest' + (params.partySize !== 1 ? 's' : '')

  const html = [
    '<!DOCTYPE html><html lang="en"><head>',
    '<meta charset="UTF-8"/><title>Reservation Confirmed</title>',
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d0d0f;color:#f5f5f7;margin:0;padding:24px;}',
    '.card{background:#1a1a1d;border:1px solid #2a2a2e;border-radius:12px;max-width:480px;margin:0 auto;padding:32px;}',
    '.logo{font-size:22px;font-weight:800;color:#5b45f5;letter-spacing:-.02em;margin-bottom:4px;}',
    'h2{font-size:20px;font-weight:700;margin:16px 0 4px;}',
    'hr{border:none;border-top:1px dashed #2a2a2e;margin:20px 0;}',
    '.badge{display:inline-block;background:#16a34a22;color:#4ade80;border:1px solid #16a34a44;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;margin-top:8px;}',
    '.row{display:flex;justify-content:space-between;font-size:14px;margin-bottom:10px;}',
    '.lbl{color:#a1a1aa;}',
    '.val{font-weight:600;}',
    '.note{font-size:13px;color:#a1a1aa;margin:0;}',
    '.footer{margin-top:24px;font-size:11px;color:#52525b;text-align:center;line-height:1.5;}',
    '</style></head><body><div class="card">',
    '<div class="logo">' + params.restaurantName + '</div>',
    '<h2>Your reservation is confirmed!</h2>',
    '<span class="badge">&#10003; CONFIRMED</span>',
    '<hr/>',
    '<div class="row"><span class="lbl">Guest</span><span class="val">' + params.guestName + '</span></div>',
    '<div class="row"><span class="lbl">Date &amp; Time</span><span class="val">' + dateStr + '</span></div>',
    '<div class="row"><span class="lbl">Party Size</span><span class="val">' + guestsLabel + '</span></div>',
    tableRow + notesRow,
    '<hr/>',
    '<p class="note">We look forward to welcoming you. To cancel or modify, please call us directly.</p>',
    '<div class="footer">Sent by ' + params.restaurantName + ' via Prominentz.</div>',
    '</div></body></html>',
  ].join('')

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to:   [params.to],
      subject: 'Reservation confirmed at ' + params.restaurantName + ' — ' + dateStr,
      html,
    })
    if (error) {
      console.error('[Email] sendReservationConfirmation failed:', error)
      return false
    }
    console.log('[Email] Reservation confirmation sent to', params.to)
    return true
  } catch (err) {
    console.error('[Email] sendReservationConfirmation exception:', err)
    return false
  }
}

// ─── Loyalty Reward Email ────────────────────────────────────────────────────
export interface SendLoyaltyRewardEmailParams {
  to: string
  guestName: string
  restaurantName: string
  rewardName: string
  discountText: string
  pointsRedeemed: number
  newPointsBalance: number
}

export async function sendLoyaltyRewardEmail(params: SendLoyaltyRewardEmailParams): Promise<boolean> {
  if (!isConfigured()) return false

  const html = `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d0d0f;color:#f5f5f7;margin:0;padding:24px;}
      .card{background:#1a1a1d;border:1px solid #2a2a2e;border-radius:12px;max-width:480px;margin:0 auto;padding:32px;}
      .logo{font-size:22px;font-weight:800;color:#5b45f5;letter-spacing:-.02em;margin-bottom:4px;}
      .sub{font-size:13px;color:#a1a1aa;margin-bottom:24px;}
      .reward{background:rgba(37,99,235,0.1);border:1px solid rgba(91,69,245,0.3);border-radius:8px;padding:16px;text-align:center;margin:16px 0;}
      .reward-title{font-size:18px;font-weight:700;color:#5b45f5;}
      .meta{font-size:13px;color:#a1a1aa;margin:8px 0;}
      .footer{margin-top:24px;font-size:11px;color:#52525b;text-align:center;}
    </style></head><body><div class="card">
      <div class="logo">${params.restaurantName}</div>
      <div class="sub">Loyalty Reward Redeemed</div>
      <p>Hi <strong>${params.guestName}</strong>,</p>
      <p>You have successfully redeemed your loyalty reward:</p>
      <div class="reward">
        <div class="reward-title">⭐ ${params.rewardName}</div>
        <div style="font-size:14px;color:#fff;margin-top:4px;">${params.discountText}</div>
      </div>
      <p class="meta">Points Used: <strong>${params.pointsRedeemed} pts</strong></p>
      <p class="meta">Remaining Balance: <strong>${params.newPointsBalance} pts</strong></p>
      <div class="footer">Sent by ${params.restaurantName} via Prominentz.</div>
    </div></body></html>
  `

  try {
    await resend.emails.send({
      from: FROM,
      to: [params.to],
      subject: `⭐ Reward Unlocked at ${params.restaurantName}!`,
      html,
    })
    return true
  } catch (err) {
    console.error('[Email] sendLoyaltyRewardEmail error:', err)
    return false
  }
}

