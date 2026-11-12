import { formatMoney, normalizeCurrency } from '@/lib/money'

export interface ReceiptItem {
  name:        string
  quantity:    number
  price:       number
  modifiers: unknown // json array
  specialNote: string | null
}

export interface ReceiptData {
  /** ISO code of the restaurant's currency. */
  currency?:      string
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
 * Compiles order + payment data into a premium HTML layout and returns it as a string.
 * Rendered on demand by the /receipts/[paymentId] route — never written to disk, so
 * there's nothing sitting in a public, unauthenticated static folder.
 */
/** Everything printed on a receipt came from staff or guests (notes!), so it is escaped. */
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

export function generateReceiptHtml(data: ReceiptData): string {
  const money = (n: number) => formatMoney(n, data.currency)
  const dateStr = new Date(data.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Format Items rows
  const itemsHtml = data.items
    .map((item) => {
      const mods = (item.modifiers as Array<{ modifierName: string; optionName: string; priceDelta: number }>) ?? []
      const modText = mods.map((m) => `+ ${esc(m.optionName)} (+${money(Number(m.priceDelta))})`).join(', ')
      const noteText = item.specialNote ? `<div class="receipt-item__note">Note: "${esc(item.specialNote)}"</div>` : ''

      return `
        <div class="receipt-item">
          <div class="receipt-item__main">
            <span class="receipt-item__qty">${esc(item.quantity)}x</span>
            <span class="receipt-item__name">${esc(item.name)}</span>
            <span class="receipt-item__price">${money((Number(item.price) * item.quantity))}</span>
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
            <span>${esc(sp.guestRef)} (${esc(sp.method)})</span>
            <span>${money(Number(sp.total))}</span>
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
        <span>${money(Number(data.cashReceived))}</span>
      </div>
      <div class="receipt-row">
        <span>Change Returned</span>
        <span class="text-brand">${money(Number(data.cashChange))}</span>
      </div>
    `
  } else if (data.stripeIntent) {
    methodDetailsHtml = `
      <div class="receipt-row text-xs text-tertiary">
        <span>Gateway Transaction</span>
        <span>${esc(data.stripeIntent)}</span>
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
      --color-text-tertiary: #9a9aa3;
      --color-border: #2a2a2e;
      --color-brand: #9d90ff;
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
      font-size: 12px;
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
      font-size: 12px;
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
      font-size: 12px;
      color: var(--color-text-secondary);
      padding-left: 24px;
      margin-top: 2px;
    }
    .receipt-item__note {
      font-size: 12px;
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
    .text-xs { font-size: 12px; }
    .footer-msg {
      text-align: center;
      font-size: 12px;
      color: var(--color-text-tertiary);
      margin-top: 25px;
      line-height: 1.4;
    }
    @media print {
      body { background-color: white; color: black; padding: 0; }
      /* The card must also go light in print — otherwise it keeps its dark
         background while text inherits body's black, making it unreadable. */
      .receipt-card { background-color: white; color: black; border: none; box-shadow: none; max-width: 100%; padding: 0; }
      .receipt-card * { color: black !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="receipt-header">
      <div class="receipt-logo">${esc(data.restaurantName)}</div>
      <div class="receipt-location">
        ${esc(data.locationName)}<br>
        ${data.address ? `${esc(data.address)}<br>` : ''}
        ${data.phone ? `Phone: ${esc(data.phone)}` : ''}
      </div>
    </div>

    <div class="receipt-meta">
      <div class="receipt-row"><span>Date/Time:</span><span>${dateStr}</span></div>
      <div class="receipt-row"><span>Receipt ID:</span><span>${esc(data.paymentId)}</span></div>
      <div class="receipt-row"><span>Order ID:</span><span>${esc(data.orderId)}</span></div>
      <div class="receipt-row"><span>Server:</span><span>${esc(data.serverName)}</span></div>
      <div class="receipt-row"><span>Table:</span><span>${esc(data.tableName)}</span></div>
      <div class="receipt-row"><span>Method:</span><span>${esc(data.method)}</span></div>
    </div>

    <div class="receipt-section">
      <h4 class="receipt-section__title">Items</h4>
      ${itemsHtml}
    </div>

    ${splitsHtml}

    <div class="receipt-section" style="border-bottom: none; margin-bottom: 0;">
      <div class="receipt-row text-secondary">
        <span>Items Subtotal</span>
        <span>${money((data.itemsSubtotal ?? data.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)))}</span>
      </div>
      ${data.couponDiscount && data.couponDiscount > 0 ? `
      <div class="receipt-row" style="color: #22c55e; font-weight: 600;">
        <span>Coupon Discount (${data.couponCode || 'PROMO'})</span>
        <span>-${money(Number(data.couponDiscount))}</span>
      </div>
      <div class="receipt-row text-secondary">
        <span>Net Subtotal</span>
        <span>${money(Number(data.subtotal))}</span>
      </div>` : ''}
      <div class="receipt-row text-secondary">
        <span>Tax (10%)</span>
        <span>${money(Number(data.tax))}</span>
      </div>
      ${Number(data.tip) > 0 ? `
      <div class="receipt-row text-secondary">
        <span>Gratuity / Tip</span>
        <span class="text-brand">+${money(Number(data.tip))}</span>
      </div>` : ''}
      <div class="receipt-row receipt-total">
        <span>Total Settled</span>
        <span class="text-brand">${money(Number(data.total))}</span>
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

  return html
}

/**
 * Fetches and shapes the data a receipt needs to render, straight from the
 * live database — never a frozen snapshot. When `restaurantId` is given, the
 * lookup is tenant-scoped (the staff-triggered "send receipt" flow); when
 * omitted, it's scoped only by the payment's own id, matching the public
 * receipt link a diner opens from their email (the cuid is the access
 * control — unguessable, but not behind a login, since the diner has none).
 */
export async function getReceiptData(
  paymentId: string,
  restaurantId?: string
): Promise<ReceiptData | null> {
  const { prisma } = await import('@/lib/prisma')

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ...(restaurantId ? { order: { table: { location: { restaurantId } } } } : {}),
    },
    include: {
      order: {
        include: {
          table: { include: { location: { include: { restaurant: true } } } },
          server: { select: { name: true } },
          items: { include: { menuItem: { select: { name: true } } } },
        },
      },
      splits: true,
    },
  })

  if (!payment) return null

  // Voided lines were never charged; option prices are stored apart from the base price.
  const optionTotal = (mods: unknown) =>
    Array.isArray(mods) ? mods.reduce((sum: number, m: { priceDelta?: number }) => sum + Number(m?.priceDelta ?? 0), 0) : 0
  const items: ReceiptItem[] = payment.order.items.filter((item) => item.status !== 'VOIDED').map((item) => ({
    name: item.menuItem.name,
    quantity: item.quantity,
    price: Number(item.priceAtOrder) + optionTotal(item.modifiers),
    modifiers: item.modifiers,
    specialNote: item.specialNote,
  }))

  const splits = payment.splits.map((s) => ({
    guestRef: s.guestRef,
    total: Number(s.total),
    method: s.method,
  }))

  // "Coupon: SAVE10 (-₹50.00)" in any currency
  const couponMatch = payment.order.notes?.match(/Coupon:\s*([A-Za-z0-9_-]+)(?:\s*\(-?[^\d(]*([\d,.]+)\))?/i)
  const couponCode = couponMatch ? couponMatch[1] : undefined
  let couponDiscount = couponMatch && couponMatch[2] ? parseFloat(couponMatch[2].replace(/,/g, '')) : undefined

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  if (!couponDiscount && itemsSubtotal > Number(payment.subtotal) + 0.01) {
    couponDiscount = Number((itemsSubtotal - Number(payment.subtotal)).toFixed(2))
  }

  const settings = (payment.order.table.location.restaurant.settings as { store?: { currency?: string } } | null) ?? {}
  return {
    currency: normalizeCurrency(settings.store?.currency),
    restaurantName: payment.order.table.location.restaurant.name,
    locationName: payment.order.table.location.name,
    address: payment.order.table.location.address || '',
    phone: payment.order.table.location.phone || '',
    paymentId: payment.id,
    orderId: payment.orderId,
    serverName: payment.order.server?.name || 'QR Self-Order',
    tableName: payment.order.table.name,
    createdAt: payment.createdAt,
    method: payment.method,
    items,
    itemsSubtotal,
    couponCode,
    couponDiscount,
    subtotal: Number(payment.subtotal),
    tax: Number(payment.tax),
    tip: Number(payment.tip),
    total: Number(payment.total),
    cashReceived: payment.cashReceived ? Number(payment.cashReceived) : undefined,
    cashChange: payment.cashChange ? Number(payment.cashChange) : undefined,
    stripeIntent: payment.stripePaymentIntentId || undefined,
    splits,
  }
}
