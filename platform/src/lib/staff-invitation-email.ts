import { Resend } from 'resend'

const globalForResend = globalThis as unknown as { resend: Resend | undefined }

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 're_REPLACE_ME') return null
  if (!globalForResend.resend) globalForResend.resend = new Resend(key)
  return globalForResend.resend
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Prominentz <onboarding@resend.dev>'

export interface SendStaffInvitationEmailParams {
  to: string
  inviterName?: string | null
  restaurantName?: string | null
  role: string
  locationName?: string | null
  inviteUrl: string
  expiresAt: Date
}

export async function sendStaffInvitationEmail(params: SendStaffInvitationEmailParams): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    console.warn('[StaffInvitationEmail] RESEND_API_KEY not configured — skipping email dispatch to', params.to)
    return false
  }

  const restaurantName = escapeHtml(params.restaurantName || 'Prominentz Restaurant')
  const inviterName = escapeHtml(params.inviterName || 'Your Management Team')
  const roleName = escapeHtml(params.role)
  const locationText = params.locationName ? escapeHtml(params.locationName) : 'All Locations (Organization-wide)'
  const expiresText = params.expiresAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + params.expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're invited to join ${restaurantName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0b; color: #f5f5f7; margin: 0; padding: 24px; }
    .card { background: #1c1c1e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 32px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5); }
    .badge { display: inline-block; background: rgba(91, 69, 245, 0.15); border: 1px solid rgba(91, 69, 245, 0.35); color: #7b68f7; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #ffffff; }
    p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 16px; }
    .info-box { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin: 20px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #5b45f5 0%, #7b68f7 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 16px rgba(91, 69, 245, 0.4); }
    .warning { font-size: 12px; color: #71717a; text-align: center; margin-top: 16px; line-height: 1.5; }
    .footer { border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 24px; padding-top: 16px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Team Invitation</div>
    <h1>Join ${restaurantName}</h1>
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to join the team at <strong>${restaurantName}</strong> as a <strong>${roleName}</strong>.</p>
    
    <div class="info-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #71717a; padding: 6px 0; font-size: 13px;">Organization:</td>
          <td style="color: #f4f4f5; font-weight: 600; text-align: right; padding: 6px 0; font-size: 13px;">${restaurantName}</td>
        </tr>
        <tr>
          <td style="color: #71717a; padding: 6px 0; font-size: 13px;">Role:</td>
          <td style="color: #7b68f7; font-weight: 700; text-align: right; padding: 6px 0; font-size: 13px;">${roleName}</td>
        </tr>
        <tr>
          <td style="color: #71717a; padding: 6px 0; font-size: 13px;">Location:</td>
          <td style="color: #f4f4f5; font-weight: 600; text-align: right; padding: 6px 0; font-size: 13px;">${locationText}</td>
        </tr>
        <tr>
          <td style="color: #71717a; padding: 6px 0; font-size: 13px;">Link Expires:</td>
          <td style="color: #f59e0b; font-weight: 600; text-align: right; padding: 6px 0; font-size: 13px;">${expiresText}</td>
        </tr>
      </table>
    </div>

    <div class="btn-container">
      <a href="${params.inviteUrl}" class="btn">Accept Invitation &amp; Join Team</a>
    </div>

    <div class="warning">
      This single-use cryptographic invitation link is uniquely generated for your email.<br/>
      If you did not expect this invitation, you can safely ignore this email.
    </div>

    <div class="footer">
      Powered by Prominentz Restaurant Operating System
    </div>
  </div>
</body>
</html>
`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [params.to],
      subject: `You're invited to join ${params.restaurantName || 'the team'} on Prominentz`,
      html,
    })

    if (error) {
      console.error('[StaffInvitationEmail] Failed to send email via Resend:', error)
      return false
    }

    console.log('[StaffInvitationEmail] Sent successfully to', params.to, 'id:', data?.id)
    return true
  } catch (err) {
    console.error('[StaffInvitationEmail] Exception during send:', err)
    return false
  }
}
