'use client'

/** Downloads the given rows as a CSV file, built in the browser. */
export function ExportCsvButton({ rows, filename, label = 'Export CSV' }: { rows: (string | number)[][]; filename: string; label?: string }) {
  const download = () => {
    const cell = (v: string | number) => {
      const s = String(v ?? '')
      // Quote everything; neutralise leading formula characters so spreadsheets don't execute them.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
      return `"${safe.replace(/"/g, '""')}"`
    }
    const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <button type="button" className="bz-btn bz-btn--lime bz-btn--sm" style={{ border: '1.5px solid #141416' }} onClick={download}>
      {label}
    </button>
  )
}
