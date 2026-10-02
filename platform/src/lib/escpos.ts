/**
 * ESC/POS Command Generator for 80mm / 58mm Thermal Printers
 */

export const ESC_POS = {
  RESET: [0x1b, 0x40],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [0x1b, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [0x1b, 0x21, 0x20],
  DOUBLE_SIZE_ON: [0x1b, 0x21, 0x30],
  NORMAL_SIZE: [0x1b, 0x21, 0x00],
  CUT_PAPER: [0x1d, 0x56, 0x42, 0x00],
  KICK_DRAWER: [0x1b, 0x70, 0x00, 0x19, 0xfa],
}

interface KOTItem {
  name: string
  quantity: number
  modifiers?: Array<{ optionName: string }>
  specialNote?: string | null
}

interface KOTData {
  orderId: string
  tableName: string
  serverName: string
  station: string
  items: KOTItem[]
  createdAt: string
  reprint?: boolean
}

/**
 * Encodes a KOT ticket into raw ESC/POS Uint8Array commands
 */
export function generateEscPosKOT(data: KOTData, widthChars: number = 42): Uint8Array {
  const bytes: number[] = []

  const add = (arr: number[]) => bytes.push(...arr)
  const addStr = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i))
    }
  }
  const addLine = (str: string = '') => {
    addStr(str)
    bytes.push(0x0a)
  }

  add(ESC_POS.RESET)

  // Header
  add(ESC_POS.ALIGN_CENTER)
  add(ESC_POS.BOLD_ON)
  add(ESC_POS.DOUBLE_SIZE_ON)
  addLine(data.reprint ? '*** REPRINT KOT ***' : 'KITCHEN ORDER TICKET')
  add(ESC_POS.NORMAL_SIZE)
  addLine(`STATION: ${data.station.toUpperCase()}`)
  add(ESC_POS.BOLD_OFF)
  addLine('-'.repeat(widthChars))

  // Metadata
  add(ESC_POS.ALIGN_LEFT)
  addLine(`Table:  ${data.tableName}`)
  addLine(`Server: ${data.serverName}`)
  addLine(`Order:  #${data.orderId.substring(0, 8)}`)
  addLine(`Time:   ${new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  addLine('='.repeat(widthChars))

  // Items
  add(ESC_POS.BOLD_ON)
  for (const item of data.items) {
    add(ESC_POS.DOUBLE_HEIGHT_ON)
    addLine(`${item.quantity}x ${item.name}`)
    add(ESC_POS.NORMAL_SIZE)
    add(ESC_POS.BOLD_OFF)

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        addLine(`  + ${mod.optionName}`)
      }
    }
    if (item.specialNote) {
      add(ESC_POS.BOLD_ON)
      addLine(`  * NOTE: ${item.specialNote}`)
      add(ESC_POS.BOLD_OFF)
    }
    addLine('-'.repeat(widthChars))
    add(ESC_POS.BOLD_ON)
  }

  add(ESC_POS.BOLD_OFF)
  add(ESC_POS.ALIGN_CENTER)
  addLine('\n*** END OF TICKET ***\n\n\n')
  add(ESC_POS.CUT_PAPER)

  return new Uint8Array(bytes)
}

export interface ReceiptData {
  restaurantName: string
  address?: string | null
  phone?: string | null
  orderId: string
  tableName: string
  serverName: string
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    priceAtOrder: number
    modifiers?: Array<{ optionName?: string; name?: string }>
  }>
  subtotal: number
  tax: number
  tip?: number
  total: number
  paymentMethod: string
}

/**
 * Encodes a guest receipt into raw ESC/POS Uint8Array commands
 */
export function generateReceiptEscPos(data: ReceiptData, widthChars: number = 42): Uint8Array {
  const bytes: number[] = []

  const add = (arr: number[]) => bytes.push(...arr)
  const addStr = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i))
    }
  }
  const addLine = (str: string = '') => {
    addStr(str)
    bytes.push(0x0a)
  }

  add(ESC_POS.RESET)

  // Header
  add(ESC_POS.ALIGN_CENTER)
  add(ESC_POS.BOLD_ON)
  add(ESC_POS.DOUBLE_SIZE_ON)
  addLine(data.restaurantName.toUpperCase())
  add(ESC_POS.NORMAL_SIZE)
  add(ESC_POS.BOLD_OFF)

  if (data.address) addLine(data.address)
  if (data.phone) addLine(`Tel: ${data.phone}`)
  addLine('='.repeat(widthChars))

  // Details
  add(ESC_POS.ALIGN_LEFT)
  addLine(`Table: ${data.tableName}  |  Server: ${data.serverName}`)
  addLine(`Order: #${data.orderId.substring(0, 8)}`)
  addLine(`Date:  ${new Date(data.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`)
  addLine('-'.repeat(widthChars))

  // Items
  for (const item of data.items) {
    const itemTotal = (item.quantity * item.priceAtOrder).toFixed(2)
    const lineStr = `${item.quantity}x ${item.name}`
    const dotsCount = Math.max(1, widthChars - lineStr.length - itemTotal.length)
    addLine(`${lineStr}${' '.repeat(dotsCount)}$${itemTotal}`)

    if (item.modifiers && item.modifiers.length > 0) {
      for (const m of item.modifiers) {
        const modName = m.optionName || m.name || ''
        if (modName) addLine(`   + ${modName}`)
      }
    }
  }

  addLine('-'.repeat(widthChars))

  // Totals
  const padRight = (label: string, val: string) => {
    const space = Math.max(1, widthChars - label.length - val.length)
    return `${label}${' '.repeat(space)}${val}`
  }

  addLine(padRight('Subtotal:', `$${data.subtotal.toFixed(2)}`))
  addLine(padRight('Tax:', `$${data.tax.toFixed(2)}`))
  if (data.tip && data.tip > 0) {
    addLine(padRight('Tip:', `$${data.tip.toFixed(2)}`))
  }
  addLine('='.repeat(widthChars))

  add(ESC_POS.BOLD_ON)
  add(ESC_POS.DOUBLE_HEIGHT_ON)
  addLine(padRight('TOTAL:', `$${data.total.toFixed(2)}`))
  add(ESC_POS.NORMAL_SIZE)
  add(ESC_POS.BOLD_OFF)

  addLine(`Payment Method: ${data.paymentMethod}`)
  addLine('-'.repeat(widthChars))

  // Footer
  add(ESC_POS.ALIGN_CENTER)
  addLine('\nThank you for dining with us!')
  addLine('Powered by Prominentz\n\n\n')
  add(ESC_POS.CUT_PAPER)
  add(ESC_POS.KICK_DRAWER)


  return new Uint8Array(bytes)
}

