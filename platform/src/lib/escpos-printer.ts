import net from 'net'

export interface KotPrintData {
  restaurantName: string
  tableName: string
  orderNumber: string
  serverName: string
  station?: string
  notes?: string
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    seatNumber?: number
    modifiers?: string[]
    specialNote?: string
  }>
}

export interface ReceiptPrintData {
  restaurantName: string
  address?: string
  phone?: string
  tableName: string
  orderNumber: string
  serverName: string
  createdAt: string
  subtotal: number
  tax: number
  tip?: number
  total: number
  paymentMethod: string
  items: Array<{
    name: string
    quantity: number
    price: number
    modifiers?: string[]
  }>
}

// ─── ESC/POS Command Byte Constants ──────────────────────────────────────────
const ESC = '\x1B'
const GS = '\x1D'

export const ESCPOS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_ON: `${GS}!\x11`, // 2x height and 2x width
  DOUBLE_HEIGHT: `${GS}!\x01`,
  DOUBLE_OFF: `${GS}!\x00`,
  INVERT_ON: `${GS}B\x01`,
  INVERT_OFF: `${GS}B\x00`,
  CUT_FULL: `${GS}V\x41\x03`,
  CUT_PARTIAL: `${GS}V\x42\x03`,
  BEEP: `${ESC}B\x03\x02`, // Beep buzzer 3 times
  DRAWER_KICK: `${ESC}p\x00\x19\xFA`, // Open cash drawer
  FEED_3: '\n\n\n',
  LINE: '------------------------------------------------\n',
}

/**
 * Generate binary ESC/POS buffer for Kitchen KOT ticket
 */
export function buildKotEscposBuffer(data: KotPrintData): Buffer {
  let commands = ''

  // Initialize & Beep kitchen buzzer
  commands += ESCPOS.INIT + ESCPOS.BEEP
  
  // Header: Large station & table
  commands += ESCPOS.ALIGN_CENTER + ESCPOS.BOLD_ON + ESCPOS.DOUBLE_ON
  commands += `KITCHEN ORDER TICKET\n`
  commands += ESCPOS.DOUBLE_OFF + ESCPOS.BOLD_OFF
  
  if (data.station) {
    commands += ESCPOS.INVERT_ON + ` STATION: ${data.station.toUpperCase()} ` + ESCPOS.INVERT_OFF + '\n'
  }

  commands += ESCPOS.ALIGN_LEFT
  commands += ESCPOS.LINE
  commands += `${ESCPOS.BOLD_ON}Table: ${data.tableName}${ESCPOS.BOLD_OFF}  |  Check #${data.orderNumber}\n`
  commands += `Server: ${data.serverName}  |  Time: ${data.createdAt}\n`
  commands += ESCPOS.LINE

  // Item list: Large readable text for chefs
  commands += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT
  data.items.forEach((item) => {
    const seatTag = item.seatNumber && item.seatNumber > 0 ? ` [S${item.seatNumber}]` : ''
    commands += `${item.quantity}x ${item.name}${seatTag}\n`
    
    // Modifiers & notes in smaller text
    if (item.modifiers && item.modifiers.length > 0) {
      commands += `${ESCPOS.DOUBLE_OFF}${ESCPOS.BOLD_OFF}   ↳ + ${item.modifiers.join(', ')}\n${ESCPOS.BOLD_ON}${ESCPOS.DOUBLE_HEIGHT}`
    }
    if (item.specialNote) {
      commands += `${ESCPOS.DOUBLE_OFF}${ESCPOS.BOLD_OFF}   ⚠️ NOTE: ${item.specialNote}\n${ESCPOS.BOLD_ON}${ESCPOS.DOUBLE_HEIGHT}`
    }
  })
  commands += ESCPOS.DOUBLE_OFF + ESCPOS.BOLD_OFF

  if (data.notes) {
    commands += ESCPOS.LINE
    commands += `ORDER NOTE: ${data.notes}\n`
  }

  commands += ESCPOS.LINE
  commands += ESCPOS.ALIGN_CENTER + `Resto AI Automated Kitchen Dispatch\n`
  commands += ESCPOS.FEED_3
  commands += ESCPOS.CUT_PARTIAL

  return Buffer.from(commands, 'latin1')
}

/**
 * Generate binary ESC/POS buffer for Customer Receipt
 */
export function buildReceiptEscposBuffer(data: ReceiptPrintData): Buffer {
  let commands = ''

  // Init & align center
  commands += ESCPOS.INIT + ESCPOS.ALIGN_CENTER
  commands += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_ON + `${data.restaurantName}\n` + ESCPOS.DOUBLE_OFF + ESCPOS.BOLD_OFF
  if (data.address) commands += `${data.address}\n`
  if (data.phone) commands += `Tel: ${data.phone}\n`

  commands += ESCPOS.LINE
  commands += ESCPOS.ALIGN_LEFT
  commands += `Table: ${data.tableName}  |  Order #${data.orderNumber}\n`
  commands += `Server: ${data.serverName}  |  ${data.createdAt}\n`
  commands += ESCPOS.LINE

  // Items table: Qty | Name | Price
  data.items.forEach((item) => {
    const itemTotal = (item.price * item.quantity).toFixed(2)
    const namePart = `${item.quantity}x ${item.name}`.padEnd(36).substring(0, 36)
    const pricePart = `$${itemTotal}`.padStart(10)
    commands += `${namePart}${pricePart}\n`
    if (item.modifiers && item.modifiers.length > 0) {
      commands += `   + ${item.modifiers.join(', ')}\n`
    }
  })

  commands += ESCPOS.LINE
  commands += ESCPOS.ALIGN_RIGHT
  commands += `Subtotal:  $${data.subtotal.toFixed(2)}\n`
  commands += `Tax:  $${data.tax.toFixed(2)}\n`
  if (data.tip && data.tip > 0) {
    commands += `Tip:  $${data.tip.toFixed(2)}\n`
  }
  commands += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT
  commands += `TOTAL:  $${data.total.toFixed(2)}\n`
  commands += ESCPOS.DOUBLE_OFF + ESCPOS.BOLD_OFF
  commands += `Paid via: ${data.paymentMethod}\n`

  commands += ESCPOS.LINE
  commands += ESCPOS.ALIGN_CENTER
  commands += `Thank you for dining with us!\n`
  commands += `Powered by Resto AI\n`
  commands += ESCPOS.DRAWER_KICK // kick cash drawer open
  commands += ESCPOS.FEED_3
  commands += ESCPOS.CUT_FULL

  return Buffer.from(commands, 'latin1')
}

/**
 * Send raw binary ESC/POS commands directly over TCP socket to network thermal printer
 * Standard thermal printer port is 9100
 */
export async function sendToNetworkPrinter(
  host: string,
  buffer: Buffer,
  port = 9100,
  timeoutMs = 4000
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    socket.setTimeout(timeoutMs)

    socket.connect(port, host, () => {
      socket.write(buffer, () => {
        socket.end()
        resolve({ success: true })
      })
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, error: `Connection to printer at ${host}:${port} timed out.` })
    })

    socket.on('error', (err) => {
      socket.destroy()
      resolve({ success: false, error: `Printer socket error: ${err.message}` })
    })
  })
}
