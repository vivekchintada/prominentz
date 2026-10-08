'use client'

import React, { useState } from 'react'

interface PrintBridgeProps {
  orderId: string
  type?: 'RECEIPT' | 'CHECK'
  buttonText?: string
  onPrinted?: () => void
}

/**
 * WebUSB ESC/POS Direct Print Component
 * Connects directly to thermal receipt printers (Epson, Star, Xprinter) via WebUSB API.
 * Falls back to browser window.print() or downloading raw bytes if WebUSB is unavailable.
 */
export function PrintBridge({
  orderId,
  type = 'RECEIPT',
  buttonText = '🖨️ Print Receipt',
  onPrinted,
}: PrintBridgeProps) {
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handlePrint() {
    setPrinting(true)
    setError(null)
    setStatus('Generating receipt bytes…')

    try {
      // 1. Fetch ESC/POS base64 bytes from API
      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, type }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate print data')

      const { escPosBase64 } = json
      const binaryString = atob(escPosBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // 2. Check WebUSB capability
      if ('usb' in navigator) {
        try {
          setStatus('Connecting to USB Printer…')
          const device = await (navigator as any).usb.requestDevice({
            filters: [
              { vendorId: 0x04b8 }, // Epson
              { vendorId: 0x0519 }, // Star Micronics
              { vendorId: 0x1fc9 }, // NXP / Xprinter
              { vendorId: 0x0483 }, // STMicroelectronics / Custom
            ],
          })

          await device.open()
          if (device.configuration === null) await device.selectConfiguration(1)
          await device.claimInterface(0)

          setStatus('Sending ESC/POS commands…')
          // Endpoint 1 is standard bulk OUT for thermal printers
          await device.transferOut(1, bytes)
          await device.close()

          setStatus('Print job completed! ✅')
          if (onPrinted) onPrinted()
          return
        } catch (usbErr: unknown) {
          console.warn('[WebUSB Print] USB claim failed or cancelled:', usbErr.message)
          // Fall through to browser print fallback
        }
      }

      // 3. Fallback: Open formatted HTML print dialog in new window
      setStatus('Opening print window…')
      const printWin = window.open('', '_blank', 'width=400,height=600')
      if (printWin) {
        const { receiptData } = json
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receipt #${receiptData.orderId.slice(0, 8)}</title>
            <style>
              body { font-family: monospace; padding: 20px; font-size: 12px; width: 300px; margin: 0 auto; }
              h2 { text-align: center; margin-bottom: 4px; font-size: 16px; }
              p { text-align: center; margin: 2px 0 12px; color: #666; font-size: 11px; }
              .line { border-bottom: 1px dashed #ccc; margin: 8px 0; }
              .flex { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              .total { font-size: 14px; margin-top: 8px; }
            </style>
          </head>
          <body>
            <h2>${receiptData.restaurantName}</h2>
            <p>${receiptData.address || ''}<br/>Tel: ${receiptData.phone || ''}</p>
            <div class="line"></div>
            <div class="flex"><span>Table: ${receiptData.tableName}</span><span>Server: ${receiptData.serverName}</span></div>
            <div class="flex"><span>Order: #${receiptData.orderId.slice(0, 8)}</span><span>${new Date(receiptData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div class="line"></div>
            ${receiptData.items.map((i: unknown) => `
              <div class="flex">
                <span>${i.quantity}x ${i.name}</span>
                <span>$${(i.quantity * i.priceAtOrder).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="line"></div>
            <div class="flex"><span>Subtotal</span><span>$${receiptData.subtotal.toFixed(2)}</span></div>
            <div class="flex"><span>Tax</span><span>$${receiptData.tax.toFixed(2)}</span></div>
            ${receiptData.tip ? `<div class="flex"><span>Tip</span><span>$${receiptData.tip.toFixed(2)}</span></div>` : ''}
            <div class="line"></div>
            <div class="flex bold total"><span>TOTAL</span><span>$${receiptData.total.toFixed(2)}</span></div>
            <div style="text-align:center;margin-top:20px;font-size:10px;color:#888;">Powered by Prominentz</div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
          </html>
        `)
        printWin.document.close()
        setStatus(null)
        if (onPrinted) onPrinted()
      } else {
        throw new Error('Pop-up window blocked. Please allow pop-ups for browser printing.')
      }
    } catch (err: unknown) {
      console.error('[PrintBridge]', err)
      setError(err.message || 'Print error')
      setStatus(null)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        disabled={printing}
        onClick={handlePrint}
      >
        {printing ? '⏳ Printing…' : buttonText}
      </button>
      {status && <span style={{ fontSize: 11, color: 'var(--color-brand)' }}>{status}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--color-error)' }}>{error}</span>}
    </div>
  )
}
