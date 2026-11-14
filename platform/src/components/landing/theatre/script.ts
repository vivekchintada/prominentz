import { ss, clamp01, type Band, type RunFn, type Waypoint } from './engine'
import { watch, ALL_DAY, STOCK, TENDERS } from './panels'

/* The timeline: which band is on stage for how long (in viewport heights),
   and what every element does inside it. */

export const BANDS: Band[] = [
  { id: 'hero', len: 110, label: 'Hero' },
  { id: 'today', len: 220, label: 'Today' },
  { id: 'flip', len: 110, label: '' },
  { id: 'order', len: 230, label: 'Order' },
  { id: 'kitchen', len: 260, label: 'Kitchen' },
  { id: 'online', len: 200, label: 'Online' },
  { id: 'payment', len: 240, label: 'Payment' },
  { id: 'stock', len: 220, label: 'Stock' },
  { id: 'staff', len: 180, label: 'Staff' },
  { id: 'eod', len: 240, label: 'Close' },
  { id: 'bill', len: 200, label: 'The bill' },
  { id: 'close', len: 150, label: 'Close' },
]

export const SCENES = ['order', 'kitchen', 'online', 'payment', 'stock', 'staff', 'eod']
export const TRACKER_OF: Record<string, number> = { order: 0, kitchen: 1, online: 2, payment: 3, stock: 4, staff: 5, eod: 6 }

const GROSS = 6482.5

export const RUNS: Record<string, RunFn> = {
  today(T, x) {
    T.rv('tHead', x, 0.02, 0.1)
    for (let i = 1; i <= 8; i++) T.rv(`ta${i}`, x, 0.02 + 0.035 * i, 0.09 + 0.035 * i, 22)
    for (let i = 1; i <= 4; i++) T.stamp(`tc${i}`, x, 0.3 + (i - 1) * 0.09, 0.35 + (i - 1) * 0.09, 1.45)
    T.rv('tClose', x, 0.82, 0.92)
  },

  order(T, x) {
    T.win('oCapA', x, 0, 0.5)
    T.rv('oCapB', x, 0.46, 0.54)
    T.rv('oCard', x, 0.02, 0.1, 18)
    for (let i = 1; i <= 5; i++) T.rv(`oRow${i}`, x, 0.06 + 0.045 * i, 0.1 + 0.045 * i, 10)
    T.tp('oNote', x, 0.3, 0.4)
    T.o('oCaret', x > 0.28 && x < 0.44 ? 1 : 0)
    T.rv('oQr', x, 0.52, 0.58, 10)
    T.T('oSub', x >= 0.55 ? '$68.50' : '$63.00')
    T.press('oSend', x, 0.62, 0.66, 0.92)
    const sent = ss(x, 0.64, 0.68)
    T.o('oSendA', 1 - ss(x, 0.63, 0.67))
    T.o('oSendB', sent)
    T.A('oSend', 'data-done', x > 0.65 ? 'true' : null)
    T.o('oStA', 1 - ss(x, 0.63, 0.67))
    T.o('oStB', sent)
  },

  kitchen(T, x) {
    T.win('kCapA', x, 0, 0.5)
    T.rv('kCapB', x, 0.46, 0.54)
    T.rv('kCard', x, 0.02, 0.1, 18)
    T.rv('kT1', x, 0.04, 0.1, 8)
    T.rv('kT2', x, 0.06, 0.12, 8)
    T.rv('kT3', x, 0.1, 0.18, 26)
    for (let i = 1; i <= 6; i++) T.rv(`kI${i}`, x, 0.14 + 0.03 * i, 0.18 + 0.03 * i, 6)
    const ready = x >= 0.6
    const tick = Math.floor(clamp01(x, 0.1, 1) * 150)
    T.T('kW1', watch(13 * 60 + 40 + tick))
    T.T('kW2', watch(6 * 60 + 12 + tick))
    T.T('kW3', ready ? '11:06' : watch(8 + Math.floor(clamp01(x, 0.1, 0.58) * 650)))
    T.press('kBump', x, 0.57, 0.61, 0.94)
    T.o('kChipA', 1 - ss(x, 0.59, 0.62))
    T.o('kChipB', ss(x, 0.6, 0.63))
    T.A('kT3', 'data-kind', ready ? 'ready' : 'new')
    T.T('kAct', ready ? 'At the pass · Maya notified' : 'Start')
    ALL_DAY.forEach(([, before, after], i) => T.T(`kAd${i + 1}`, String(ready ? after : before)))
  },

  online(T, x) {
    T.win('qCapA', x, 0, 0.48)
    T.rv('qCapB', x, 0.44, 0.52)
    T.rv('qCard', x, 0.02, 0.1, 18)
    for (let i = 1; i <= 3; i++) T.rv(`q${i}`, x, 0.08 + 0.07 * i, 0.13 + 0.07 * i, 10)
    for (let i = 4; i <= 6; i++) T.rv(`q${i}`, x, 0.5 + 0.06 * (i - 3), 0.55 + 0.06 * (i - 3), 10)
    const n = x < 0.15 ? 0 : x < 0.22 ? 1 : x < 0.29 ? 2 : x < 0.56 ? 3 : x < 0.62 ? 4 : x < 0.68 ? 5 : 6
    T.T('qCount', `${n} open`)
  },

  payment(T, x) {
    T.win('pCapA', x, 0, 0.5)
    T.rv('pCapB', x, 0.46, 0.54)
    T.rv('pCard', x, 0.02, 0.1, 18)
    const bySeat = x >= 0.14
    T.A('pSegA', 'data-on', bySeat ? null : 'true')
    T.A('pSegB', 'data-on', bySeat ? 'true' : null)
    for (let i = 1; i <= 4; i++) T.rv(`pS${i}`, x, 0.14 + 0.05 * i, 0.19 + 0.05 * i, 10)
    for (let i = 1; i <= 3; i++) T.rv(`pL${i}`, x, 0.38 + 0.03 * i, 0.42 + 0.03 * i, 6)
    for (let i = 1; i <= 4; i++) {
      T.stamp(`pPaid${i}`, x, 0.52 + 0.05 * i, 0.56 + 0.05 * i, 1.3)
      T.o(`pDue${i}`, 1 - ss(x, 0.52 + 0.05 * i, 0.55 + 0.05 * i))
      T.A(`pS${i}`, 'data-paid', x >= 0.54 + 0.05 * i ? 'true' : null)
    }
    T.T('pV1', x >= 0.76 ? '$51.84' : '—')
    T.T('pV2', x >= 0.79 ? '$22.14' : '—')
    T.stamp('pFee', x, 0.84, 0.9, 1.4)
    T.T('pMeta', x >= 0.82 ? 'Closed 8:31 PM' : '$73.98 incl. tax')
  },

  stock(T, x) {
    T.win('sCapA', x, 0, 0.5)
    T.rv('sCapB', x, 0.46, 0.54)
    T.rv('sCard', x, 0.02, 0.1, 18)
    T.rv('sRec', x, 0.06, 0.12, 8)
    for (let i = 1; i <= 5; i++) {
      T.rv(`sR${i}`, x, 0.1 + 0.04 * i, 0.14 + 0.04 * i, 8)
      const sold = x >= 0.32 + 0.03 * i
      T.o(`sS${i}`, sold ? 1 : 0)
      T.T(`sC${i}`, sold ? STOCK[i - 1].after : STOCK[i - 1].before)
    }
    T.A('sR1', 'data-low', x >= 0.56 ? 'true' : null)
    T.o('sFlagA', 1 - ss(x, 0.55, 0.58))
    T.stamp('sFlagB', x, 0.56, 0.6, 1.3)
    T.rv('sPo', x, 0.64, 0.72, 12)
  },

  staff(T, x) {
    T.win('fCapA', x, 0, 0.5)
    T.rv('fCapB', x, 0.46, 0.54)
    T.rv('fCard', x, 0.02, 0.1, 18)
    for (let i = 1; i <= 6; i++) T.rv(`f${i}`, x, 0.06 + 0.045 * i, 0.1 + 0.045 * i, 8)
    T.o('fBtn', Math.min(ss(x, 0.5, 0.54), 1 - ss(x, 0.62, 0.65)))
    T.press('fBtn', x, 0.58, 0.62, 0.92)
    const out = x >= 0.6
    T.o('fChipA', 1 - ss(x, 0.5, 0.53))
    T.stamp('fChipB', x, 0.63, 0.67, 1.25)
    T.T('fRole', out ? 'Dish · out 11:04 PM' : 'Dish')
    T.T('fCount', out ? '5 on shift' : '6 on shift')
    T.A('f6', 'data-thread', out ? 'true' : null)
  },

  eod(T, x) {
    T.win('zCapA', x, 0, 0.5)
    T.rv('zCapB', x, 0.46, 0.54)
    T.rv('zCard', x, 0.02, 0.1, 18)
    for (let i = 1; i <= 3; i++) T.rv(`zN${i}`, x, 0.06 + 0.05 * i, 0.11 + 0.05 * i, 8)
    for (let i = 1; i <= 3; i++) {
      T.rv(`zT${i}`, x, 0.2 + 0.04 * i, 0.24 + 0.04 * i, 6)
      T.S(`zB${i}`, { width: `${(TENDERS[i - 1].v / GROSS) * 100 * ss(x, 0.24 + 0.04 * i, 0.36 + 0.04 * i)}%` })
    }
    T.rv('zTax', x, 0.4, 0.45, 6)
    T.rv('zVoid', x, 0.43, 0.48, 6)
    for (let i = 1; i <= 3; i++) T.rv(`zD${i}`, x, 0.5 + 0.05 * i, 0.55 + 0.05 * i, 6)
    T.tp('zCnt', x, 0.72, 0.8)
    T.o('zCaret', x > 0.7 && x < 0.83 ? 1 : 0)
    T.stamp('zBal', x, 0.83, 0.89, 1.3)
  },

  bill(T, x) {
    T.rv('bCapA', x, 0.02, 0.1)
    T.rv('bTiers', x, 0.3, 0.4, 12)
    T.rv('bCard', x, 0.02, 0.1, 18)
    for (let i = 1; i <= 11; i++) T.rv(`b${i}`, x, 0.08 + 0.03 * i, 0.12 + 0.03 * i, 6)
    for (let i = 1; i <= 3; i++) T.rv(`bT${i}`, x, 0.5 + 0.04 * i, 0.54 + 0.04 * i, 6)
    T.rv('bCta', x, 0.68, 0.76, 10)
  },

  close(T, x) {
    T.rv('clMark', x, 0.22, 0.42, 30)
    T.rv('clTag', x, 0.28, 0.48, 26)
    T.rv('clCta', x, 0.42, 0.58, 16)
    T.rv('clFoot', x, 0.55, 0.7, 10)
  },
}

/* Where the cursor goes in each band, as fractions of the viewport.
   `c` marks a click; it fires when the scroll passes that point. */
export const PATHS: Record<string, Waypoint[]> = {
  hero: [
    { x: 0.5, y: 0.63, t: 0 },
    { x: 0.505, y: 0.65, t: 1 },
  ],
  today: [
    { x: 0.28, y: 0.42, t: 0 },
    { x: 0.55, y: 0.34, t: 0.2, c: 1 },
    { x: 0.72, y: 0.5, t: 0.4, c: 1 },
    { x: 0.38, y: 0.62, t: 0.6, c: 1 },
    { x: 0.62, y: 0.68, t: 0.8 },
    { x: 0.5, y: 0.55, t: 1 },
  ],
  flip: [
    { x: 0.5, y: 0.6, t: 0 },
    { x: 0.5, y: 0.62, t: 1 },
  ],
  order: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.62, y: 0.52, t: 0.25 },
    { x: 0.66, y: 0.56, t: 0.38 },
    { x: 0.84, y: 0.74, t: 0.6 },
    { x: 0.85, y: 0.75, t: 0.72, c: 1 },
    { x: 0.7, y: 0.5, t: 1 },
  ],
  kitchen: [
    { x: 0.62, y: 0.38, t: 0 },
    { x: 0.7, y: 0.45, t: 0.2 },
    { x: 0.85, y: 0.5, t: 0.4 },
    { x: 0.84, y: 0.74, t: 0.6 },
    { x: 0.84, y: 0.74, t: 0.66, c: 1 },
    { x: 0.72, y: 0.5, t: 1 },
  ],
  online: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.66, y: 0.46, t: 0.3 },
    { x: 0.7, y: 0.6, t: 0.6 },
    { x: 0.64, y: 0.5, t: 1 },
  ],
  payment: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.56, y: 0.37, t: 0.16, c: 1 },
    { x: 0.6, y: 0.5, t: 0.35 },
    { x: 0.8, y: 0.48, t: 0.65, c: 1 },
    { x: 0.6, y: 0.62, t: 0.76 },
    { x: 0.8, y: 0.62, t: 0.86, c: 1 },
    { x: 0.7, y: 0.56, t: 1 },
  ],
  stock: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.62, y: 0.5, t: 0.3 },
    { x: 0.86, y: 0.47, t: 0.6 },
    { x: 0.86, y: 0.47, t: 0.64, c: 1 },
    { x: 0.7, y: 0.74, t: 0.78 },
    { x: 0.68, y: 0.72, t: 1 },
  ],
  staff: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.64, y: 0.5, t: 0.3 },
    { x: 0.86, y: 0.68, t: 0.6 },
    { x: 0.86, y: 0.68, t: 0.67, c: 1 },
    { x: 0.7, y: 0.55, t: 1 },
  ],
  eod: [
    { x: 0.6, y: 0.38, t: 0 },
    { x: 0.62, y: 0.5, t: 0.3 },
    { x: 0.78, y: 0.6, t: 0.6 },
    { x: 0.85, y: 0.68, t: 0.85 },
    { x: 0.85, y: 0.68, t: 0.93, c: 1 },
    { x: 0.8, y: 0.64, t: 1 },
  ],
  bill: [
    { x: 0.6, y: 0.4, t: 0 },
    { x: 0.64, y: 0.5, t: 0.4 },
    { x: 0.62, y: 0.74, t: 0.7 },
    { x: 0.62, y: 0.74, t: 0.78, c: 1 },
    { x: 0.66, y: 0.6, t: 1 },
  ],
  close: [],
}
