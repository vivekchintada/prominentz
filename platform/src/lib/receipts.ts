import fs from 'fs/promises'
import path from 'path'

interface ReceiptItem {
  name:        string
  quantity:    number
  price:       number
  modifiers:   any // json array
  specialNote: string | null
}

interface ReceiptData {
  restaurantName: string
  locationName:   string
  address:        string
  phone:          string
  paymentId:      string
  orderId:        string
  serverName:     string
  tableName:      string
  createdAt:      Date
  method:         string
  items:          ReceiptItem[]
  itemsSubtotal?: number
  couponCode?:    string
  couponDiscount?: number
  subtotal:       number
  tax:            number
  tip:            number
  total:          number
  cashReceived?:  number
  cashChange?:    number
  stripeIntent?:  string
  splits?:        Array<{ guestRef: string; total: number; method: string }>
}

/**
 * Receipt Builder Service
 * Compiles order + payment data into a premium HTML layout,
 * saves it to public/receipts/receipt-{paymentId}.html, and returns its public URL path.
 */
export async function generateReceiptHtml(data: ReceiptData): Promise<string> {
  const dateStr = new Date(data.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Format Items rows
  const itemsHtml = data.items
    .map((item) => {
      const mods = (item.modifiers as Array<{ modifierName: string; optionName: string; priceDelta: number }>) ?? []
      const modText = mods.map((m) => `+ ${m.optionName} (+$${Number(m.priceDelta).toFixed(2)})`).join(', ')
      const noteText = item.specialNote ? `<div class="receipt-item__note">Note: "${item.specialNote}"</div>` : ''

      return `
        <div class="receipt-item">
          <div class="receipt-item__main">
            <span class="receipt-item__qty">${item.quantity}x</span>
            <span class="receipt-item__name">${item.name}</span>
            <span class="receipt-item__price">$${(Number(item.price) * item.quantity).toFixed(2)}</span>
          </div>
          ${modText ? `<div class="receipt-item__mods">${modText}</div>` : ''}
          ${noteText}
        </div>
      `
    })
    .join('')

  // Format Splits rows (if any)
  const splitsHtml = data.splits && data.splits.length > 0
    ? `
      <div class="receipt-section">
        <h4 class="receipt-section__title">Split Breakdown</h4>
        ${data.splits
          .map(
            (sp) => `
          <div class="receipt-row text-secondary">
            <span>${sp.guestRef} (${sp.method})</span>
            <span>$${Number(sp.total).toFixed(2)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : ''

  // Payment method specific details
  let methodDetailsHtml = ''
  if (data.method === 'CASH' && data.cashReceived !== undefined && data.cashChange !== undefined) {
    methodDetailsHtml = `
      <div class="receipt-row">
        <span>Cash Tendered</span>
        <span>$${Number(data.cashReceived).toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span>Change Returned</span>
        <span class="text-brand">$${Number(data.cashChange).toFixed(2)}</span>
      </div>
    `
  } else if (data.stripeIntent) {
    methodDetailsHtml = `
      <div class="receipt-row text-xs text-tertiary">
        <span>Gateway Transaction</span>
        <span>${data.stripeIntent}</span>
      </div>
    `
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - Prominentz</title>
  <style>
    :root {
      --color-bg: #0d0d0f;
      --color-card: #1a1a1d;
      --color-text: #f5f5f7;
      --color-text-secondary: #a1a1aa;
      --color-text-tertiary: #52525b;
      --color-border: #2a2a2e;
      --color-brand: #5b45f5;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--color-bg);
      color: var(--color-text);
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .receipt-card {
      background-color: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 30px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
    }
    .receipt-header {
      text-align: center;
      margin-bottom: 25px;
    }
    .receipt-logo {
      font-size: 24px;
      font-weight: 800;
      color: var(--color-brand);
      letter-spacing: -0.02em;
      margin-bottom: 5px;
    }
    .receipt-location {
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }
    .receipt-meta {
      font-size: 11px;
      color: var(--color-text-tertiary);
      font-family: monospace;
      border-bottom: 1px dashed var(--color-border);
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .receipt-section {
      border-bottom: 1px dashed var(--color-border);
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .receipt-section__title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-tertiary);
      margin: 0 0 10px 0;
    }
    .receipt-item {
      margin-bottom: 12px;
      font-size: 13px;
    }
    .receipt-item__main {
      display: flex;
      justify-content: space-between;
    }
    .receipt-item__qty {
      font-weight: 600;
      color: var(--color-brand);
      margin-right: 6px;
    }
    .receipt-item__name {
      flex: 1;
    }
    .receipt-item__price {
      font-family: monospace;
      font-weight: 500;
    }
    .receipt-item__mods {
      font-size: 11px;
      color: var(--color-text-secondary);
      padding-left: 24px;
      margin-top: 2px;
    }
    .receipt-item__note {
      font-size: 11px;
      color: var(--color-text-secondary);
      font-style: italic;
      padding-left: 24px;
      margin-top: 2px;
    }
    .receipt-total {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text);
      margin-top: 12px;
      border-top: 1px solid var(--color-border);
      padding-top: 12px;
    }
    .text-secondary { color: var(--color-text-secondary); }
    .text-tertiary { color: var(--color-text-tertiary); }
    .text-brand { color: var(--color-brand); }
    .text-xs { font-size: 11px; }
    .footer-msg {
      text-align: center;
      font-size: 11px;
      color: var(--color-text-tertiary);
      margin-top: 25px;
      line-height: 1.4;
    }
    @media print {
      body { background-color: white; color: black; padding: 0; }
      .receipt-card { border: none; box-shadow: none; max-width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="receipt-header">
      <div class="receipt-logo">${data.restaurantName}</div>
      <div class="receipt-location">
        ${data.locationName}<br>
        ${data.address}<br>
        Phone: ${data.phone}
      </div>
    </div>

    <div class="receipt-meta">
      <div class="receipt-row"><span>Date/Time:</span><span>${dateStr}</span></div>
      <div class="receipt-row"><span>Receipt ID:</span><span>${data.paymentId}</span></div>
      <div class="receipt-row"><span>Order ID:</span><span>${data.orderId}</span></div>
      <div class="receipt-row"><span>Server:</span><span>${data.serverName}</span></div>
      <div class="receipt-row"><span>Table:</span><span>${data.tableName}</span></div>
      <div class="receipt-row"><span>Method:</span><span>${data.method}</span></div>
    </div>

    <div class="receipt-section">
      <h4 class="receipt-section__title">Items</h4>
      ${itemsHtml}
    </div>

    ${splitsHtml}

    <div class="receipt-section" style="border-bottom: none; margin-bottom: 0;">
      <div class="receipt-row text-secondary">
        <span>Items Subtotal</span>
        <span>$${(data.itemsSubtotal ?? data.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)).toFixed(2)}</span>
      </div>
      ${data.couponDiscount && data.couponDiscount > 0 ? `
      <div class="receipt-row" style="color: #22c55e; font-weight: 600;">
        <span>Coupon Discount (${data.couponCode || 'PROMO'})</span>
        <span>-$${Number(data.couponDiscount).toFixed(2)}</span>
      </div>
      <div class="receipt-row text-secondary">
        <span>Net Subtotal</span>
        <span>$${Number(data.subtotal).toFixed(2)}</span>
      </div>` : ''}
      <div class="receipt-row text-secondary">
        <span>Tax (10%)</span>
        <span>$${Number(data.tax).toFixed(2)}</span>
      </div>
      ${Number(data.tip) > 0 ? `
      <div class="receipt-row text-secondary">
        <span>Gratuity / Tip</span>
        <span class="text-brand">+$${Number(data.tip).toFixed(2)}</span>
      </div>` : ''}
      <div class="receipt-row receipt-total">
        <span>Total Settled</span>
        <span class="text-brand">$${Number(data.total).toFixed(2)}</span>
      </div>
      ${methodDetailsHtml}
    </div>

    <div class="footer-msg">
      Thank you for dining with us!<br>
      Prominentz — Refined Hospitality
    </div>
  </div>
</body>
</html>
  `

  // Directory path in public
  const publicDir = path.join(process.cwd(), 'public')
  const receiptsDir = path.join(publicDir, 'receipts')
  
  // Ensure public/receipts folder exists
  await fs.mkdir(receiptsDir, { recursive: true })

  const filename = `receipt-${data.paymentId}.html`
  const filepath = path.join(receiptsDir, filename)

  await fs.writeFile(filepath, html, 'utf8')

  // Return the relative URL path
  return `/receipts/${filename}`
}
