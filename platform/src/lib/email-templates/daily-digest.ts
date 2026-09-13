export interface DailyDigestData {
  restaurantName: string
  locationName: string
  date: string
  totalRevenue: number
  totalOrders: number
  avgCheck: number
  totalTips: number
  totalTax: number
  voidCount: number
  laborCost: number
  laborPct: number
  topItems: Array<{ name: string; qty: number; revenue: number }>
}

export function generateDailyDigestHtml(data: DailyDigestData): string {
  const fmt = (n: number) => `$${n.toFixed(2)}`
  const pct = (n: number) => `${n.toFixed(1)}%`

  const topItemsRows = data.topItems
    .map(
      (item, i) => `
      <tr style="border-bottom: 1px solid #2C2C2E;">
        <td style="padding: 10px 16px; color: #3b82f6; font-weight: 600;">#${i + 1}</td>
        <td style="padding: 10px 16px; color: #E5E5EA;">${item.name}</td>
        <td style="padding: 10px 16px; color: #8E8E93; text-align: center;">${item.qty}x</td>
        <td style="padding: 10px 16px; color: #30D158; text-align: right;">${fmt(item.revenue)}</td>
      </tr>`
    )
    .join('')

  // ASCII-style mini bar for labor %
  const laborBar = (() => {
    const pctClamped = Math.min(100, Math.max(0, data.laborPct))
    const filled = Math.round(pctClamped / 5)
    return '█'.repeat(filled) + '░'.repeat(20 - filled)
  })()

  const laborColor = data.laborPct > 35 ? '#FF453A' : data.laborPct > 25 ? '#FF9F0A' : '#30D158'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Report — ${data.restaurantName}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,'SF Pro Display','Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#3b82f6 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                Resto <span style="opacity:0.7;">AI</span>
              </div>
              <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">Daily Performance Digest</div>
              <div style="margin-top:16px;font-size:22px;font-weight:700;color:#fff;">
                ${data.restaurantName}
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">
                ${data.locationName} &middot; ${data.date}
              </div>
            </td>
          </tr>

          <!-- KPI Grid -->
          <tr>
            <td style="background:#1C1C1E;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:0 8px 16px 0;">
                    <div style="background:#2C2C2E;border-radius:12px;padding:20px;">
                      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;">Net Revenue</div>
                      <div style="font-size:28px;font-weight:800;color:#30D158;margin-top:6px;">${fmt(data.totalRevenue)}</div>
                    </div>
                  </td>
                  <td width="50%" style="padding:0 0 16px 8px;">
                    <div style="background:#2C2C2E;border-radius:12px;padding:20px;">
                      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;">Orders Closed</div>
                      <div style="font-size:28px;font-weight:800;color:#E5E5EA;margin-top:6px;">${data.totalOrders}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:0 8px 16px 0;">
                    <div style="background:#2C2C2E;border-radius:12px;padding:20px;">
                      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;">Avg Check</div>
                      <div style="font-size:28px;font-weight:800;color:#E5E5EA;margin-top:6px;">${fmt(data.avgCheck)}</div>
                    </div>
                  </td>
                  <td width="50%" style="padding:0 0 16px 8px;">
                    <div style="background:#2C2C2E;border-radius:12px;padding:20px;">
                      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;">Total Tips</div>
                      <div style="font-size:28px;font-weight:800;color:#FF9F0A;margin-top:6px;">${fmt(data.totalTips)}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Labor Bar -->
              <div style="background:#2C2C2E;border-radius:12px;padding:20px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:1px;">Labor Cost</span>
                  <span style="font-size:16px;font-weight:700;color:${laborColor};">${fmt(data.laborCost)} (${pct(data.laborPct)})</span>
                </div>
                <div style="font-family:'SF Mono','Courier New',monospace;font-size:13px;color:${laborColor};">${laborBar} ${pct(data.laborPct)}</div>
              </div>

              <!-- Voids -->
              ${data.voidCount > 0 ? `
              <div style="background:#2C2C2E;border:1px solid rgba(255,69,58,0.3);border-radius:12px;padding:16px;margin-bottom:16px;">
                <span style="font-size:13px;color:#FF453A;font-weight:600;">⚠️  ${data.voidCount} void(s) processed yesterday</span>
              </div>` : ''}

              <!-- Top Items -->
              <div style="margin-top:8px;">
                <div style="font-size:13px;font-weight:700;color:#E5E5EA;margin-bottom:12px;">🏆 Top Sellers</div>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#2C2C2E;border-radius:12px;overflow:hidden;">
                  ${topItemsRows || '<tr><td style="padding:16px;color:#8E8E93;font-size:13px;">No sales data yet</td></tr>'}
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111113;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#48484A;">
                Sent by Resto AI &middot; <a href="#" style="color:#2563eb;text-decoration:none;">View Dashboard</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
