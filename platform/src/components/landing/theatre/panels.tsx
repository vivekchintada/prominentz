import { Check, Send } from 'lucide-react'
import s from '../Landing.module.css'

/* The demo restaurant's screens. Every panel renders in two modes:
   scripted (the theatre animates it through `data-e` handles) and
   final (the finished state, for the stacked story and reduced motion). */

export type PanelMode = { final?: boolean }

const usd = (n: number) => `$${n.toFixed(2)}`
export const watch = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

function Panel({
  id,
  label,
  meta,
  metaId,
  children,
}: {
  id: string
  label: string
  meta?: React.ReactNode
  metaId?: string
  children: React.ReactNode
}) {
  return (
    <figure className={s.panel} data-e={id} aria-label={`Demo restaurant: ${label}`}>
      <figcaption className={s.panelHead}>
        <span className={`${s.label} ${s.demoTag}`}>{label}</span>
        {meta !== undefined && (
          <span className={s.label} data-e={metaId}>
            {meta}
          </span>
        )}
      </figcaption>
      {children}
    </figure>
  )
}

/* ── 1. Order: POS ticket ────────────────────────────────────────────────── */

const TICKET = [
  { seat: 'S1', item: 'Smash burger', price: 16, note: true },
  { seat: 'S1', item: 'Fries', price: 5 },
  { seat: 'S2', item: 'Paneer tikka', price: 14.5 },
  { seat: 'S3', item: 'Margherita', mod: 'Extra basil', price: 15 },
  { seat: 'S4', item: 'Caesar salad', mod: 'Dressing on the side', price: 12.5 },
]

export function PosPanel({ final }: PanelMode) {
  return (
    <Panel
      id="oCard"
      label="POS · Table 12"
      metaId="oSt"
      meta={
        final ? (
          'Sent 7:42 PM'
        ) : (
          <span className={s.swap}>
            <span data-e="oStA">4 guests · Draft</span>
            <span data-e="oStB" className={s.swapB} style={{ color: 'var(--good-t)' }}>
              Sent 7:42 PM
            </span>
          </span>
        )
      }
    >
      <div className={s.panelBody} style={{ paddingBlock: 4 }}>
        <div className={s.rows}>
          {TICKET.map((r, i) => (
            <div key={i} className={s.row} data-e={`oRow${i + 1}`}>
              <span className={s.seat}>{r.seat}</span>
              <span className={s.item}>
                {r.item}
                {r.note ? (
                  <span className={s.mod}>
                    {final ? (
                      'Medium · no onion'
                    ) : (
                      <>
                        <span data-e="oNote" data-t="Medium · no onion" />
                        <span className={s.caret} data-e="oCaret" aria-hidden="true" />
                      </>
                    )}
                  </span>
                ) : (
                  r.mod && <span className={s.mod}>{r.mod}</span>
                )}
              </span>
              <span className={s.price}>{usd(r.price)}</span>
            </div>
          ))}
          <div className={s.row} data-e="oQr">
            <span className={s.seat}>S3</span>
            <span className={s.item}>
              Mango lassi <span className={s.chipLive}>From table QR</span>
            </span>
            <span className={s.price}>{usd(5.5)}</span>
          </div>
        </div>
      </div>
      <div className={s.panelFoot}>
        <span className={s.total}>
          <span className={s.label}>Subtotal</span>
          <span className={s.totalNum} data-e="oSub">
            {final ? '$68.50' : '$63.00'}
          </span>
        </span>
        <span className={s.action} data-e="oSend" data-done={final ? 'true' : undefined}>
          {final ? (
            <>
              <Check size={16} strokeWidth={2} /> Sent to kitchen · 7:42 PM
            </>
          ) : (
            <span className={s.swap}>
              <span data-e="oSendA" className={s.swapRow}>
                <Send size={15} strokeWidth={2} /> Send to kitchen
              </span>
              <span data-e="oSendB" className={`${s.swapB} ${s.swapRow}`}>
                <Check size={16} strokeWidth={2} /> Sent to kitchen · 7:42 PM
              </span>
            </span>
          )}
        </span>
      </div>
    </Panel>
  )
}

/* ── 2. Kitchen display ──────────────────────────────────────────────────── */

const T12_ITEMS: [string, string, string?, boolean?][] = [
  ['1', 'Smash burger', 'Medium · no onion'],
  ['1', 'Fries'],
  ['1', 'Paneer tikka', 'Allergy: nuts', true],
  ['1', 'Margherita'],
  ['1', 'Caesar salad', 'Dressing on the side'],
  ['1', 'Mango lassi', 'Added from table QR'],
]

export const ALL_DAY = [
  ['Margherita', 4, 3],
  ['Fries', 3, 2],
  ['Chicken wings', 3, 3],
  ['Caesar salad', 2, 1],
] as const

export function KdsPanel({ final }: PanelMode) {
  return (
    <Panel id="kCard" label="Kitchen display · all stations" meta="Target 12 min">
      <div className={s.kds}>
        <div className={s.ticket} data-kind="late" data-e="kT1">
          <div className={s.ticketHead}>
            <span className={s.chipLate}>LATE · Dine-in</span>
            <span className={s.mono} style={{ fontSize: 12.5 }} data-e="kW1">
              13:40
            </span>
          </div>
          <div className={s.ticketWhere}>Table 7</div>
          <ul className={s.ticketItems}>
            <li>
              <span>2×</span>Chicken wings
            </li>
            <li>
              <span>1×</span>Fries
            </li>
          </ul>
          <div className={s.ticketAction}>Bump to pass</div>
        </div>

        <div className={s.ticket} data-kind="cooking" data-e="kT2">
          <div className={s.ticketHead}>
            <span className={s.chipAging}>COOKING · Dine-in</span>
            <span className={s.mono} style={{ fontSize: 12.5 }} data-e="kW2">
              06:12
            </span>
          </div>
          <div className={s.ticketWhere}>Table 3</div>
          <ul className={s.ticketItems}>
            <li>
              <span>1×</span>Margherita
            </li>
            <li>
              <span>1×</span>Caesar salad
            </li>
            <li>
              <span>2×</span>Lemonade
            </li>
          </ul>
          <div className={s.ticketAction}>Bump</div>
        </div>

        <div className={s.ticket} data-kind={final ? 'ready' : 'new'} data-e="kT3">
          <div className={s.ticketHead}>
            {final ? (
              <span className={s.chipGood}>READY · Dine-in</span>
            ) : (
              <span className={s.swap}>
                <span className={s.chipLive} data-e="kChipA">
                  NEW · Dine-in
                </span>
                <span className={`${s.chipGood} ${s.swapB}`} data-e="kChipB">
                  READY · Dine-in
                </span>
              </span>
            )}
            <span className={s.mono} style={{ fontSize: 12.5 }} data-e="kW3">
              {final ? '11:06' : '00:08'}
            </span>
          </div>
          <div className={s.ticketWhere}>Table 12</div>
          <ul className={s.ticketItems}>
            {T12_ITEMS.map(([q, n, note, allergy], i) => (
              <li key={n} data-e={`kI${i + 1}`}>
                <span>{q}×</span>
                {n}
                {note && <small className={allergy ? undefined : s.note}>{note}</small>}
              </li>
            ))}
          </ul>
          <div className={s.ticketAction} data-e="kBump">
            <span data-e="kAct">{final ? 'At the pass · Maya notified' : 'Start'}</span>
          </div>
        </div>
      </div>
      <div className={s.allDay}>
        <span className={s.label} style={{ color: 'inherit' }}>
          All day
        </span>
        {ALL_DAY.map(([name, before, after], i) => (
          <span key={name}>
            <b data-e={`kAd${i + 1}`}>{final ? after : before}</b> {name}
          </span>
        ))}
      </div>
    </Panel>
  )
}

/* ── 3. Every channel, one queue ─────────────────────────────────────────── */

const QUEUE = [
  { time: '7:42', ch: 'POS', main: 'Table 12', sub: '6 items · Grill, Cold, Bar', tag: 'live', thread: true },
  { time: '7:44', ch: 'Table QR', main: 'Table 4', sub: 'Guest added 2 drinks', tag: 'live' },
  { time: '7:47', ch: 'Online', main: 'Order #1043', sub: 'Pickup 8:05 · paid online', tag: 'good' },
  { time: '7:49', ch: 'DoorDash', main: 'Order 4F2K', sub: 'Courier due 8:02', tag: 'plain' },
  { time: '7:51', ch: 'Uber Eats', main: 'Order 91C3', sub: 'Courier due 8:06', tag: 'plain' },
  { time: '7:53', ch: 'Online', main: 'Order #1044', sub: 'Delivery · paid online', tag: 'good' },
]

export function QueuePanel({ final }: PanelMode) {
  return (
    <Panel id="qCard" label="Kitchen queue · every channel" metaId="qCount" meta={final ? '6 open' : '0 open'}>
      <div className={s.queue}>
        {QUEUE.map((q, i) => (
          <div key={i} className={s.qRow} data-e={`q${i + 1}`} data-thread={q.thread || undefined}>
            <span className={s.qTime}>{q.time} PM</span>
            <span>
              <span className={q.tag === 'live' ? s.chipLive : q.tag === 'good' ? s.chipGood : s.chip}>{q.ch}</span>
            </span>
            <span className={s.qMain}>
              {q.main}
              <small>{q.sub}</small>
            </span>
            <span className={s.qDot} aria-hidden="true" />
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ── 4. Split and pay ────────────────────────────────────────────────────── */

const SEATS = [
  { seat: 'Seat 1', items: 'Smash burger, Fries', amt: 22.68, tender: 'Card' },
  { seat: 'Seat 2', items: 'Paneer tikka', amt: 15.66, tender: 'Card' },
  { seat: 'Seat 3', items: 'Margherita, Mango lassi', amt: 22.14, tender: 'Cash' },
  { seat: 'Seat 4', items: 'Caesar salad', amt: 13.5, tender: 'Card' },
]

export function PayPanel({ final }: PanelMode) {
  return (
    <Panel id="pCard" label="Check · Table 12" metaId="pMeta" meta={final ? 'Closed 8:31 PM' : '$73.98 incl. tax'}>
      <div className={s.panelBody}>
        <div className={s.segment} aria-label="Split mode">
          <span data-e="pSegA" data-on={final ? undefined : 'true'}>
            Even
          </span>
          <span data-e="pSegB" data-on={final ? 'true' : undefined}>
            By seat
          </span>
          <span>By item</span>
        </div>
        <div className={s.seats}>
          {SEATS.map((seat, i) => (
            <div key={seat.seat} className={s.seatCard} data-e={`pS${i + 1}`} data-paid={final ? 'true' : undefined}>
              <div className={s.seatTop}>
                <span className={s.label}>{seat.seat}</span>
                <span className={s.swap}>
                  {!final && (
                    <span className={s.chip} data-e={`pDue${i + 1}`}>
                      Due
                    </span>
                  )}
                  <span className={`${s.chipGood} ${final ? '' : s.swapB}`} data-e={`pPaid${i + 1}`}>
                    <Check size={11} strokeWidth={2.5} /> {seat.tender}
                  </span>
                </span>
              </div>
              <span className={s.seatAmt}>{usd(seat.amt)}</span>
              <span className={s.seatItems}>{seat.items}</span>
            </div>
          ))}
        </div>
        <div className={s.ledger}>
          <div className={s.ledgerRow} data-e="pL1">
            Card, settled to your Stripe account <b data-e="pV1">{final ? usd(51.84) : '—'}</b>
          </div>
          <div className={s.ledgerRow} data-e="pL2">
            Cash in the drawer <b data-e="pV2">{final ? usd(22.14) : '—'}</b>
          </div>
          <div className={s.ledgerRow} data-tone="good" data-e="pL3">
            Prominentz fee on this check{' '}
            <b data-e="pFee" className={s.stampText}>
              $0.00
            </b>
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ── 5. Stock that counts itself ─────────────────────────────────────────── */

export const STOCK = [
  { name: 'Brioche buns', unit: 'pcs', before: '13', after: '12', low: '12' },
  { name: 'Beef patty 6 oz', unit: 'pcs', before: '31', after: '30', low: '15' },
  { name: 'Cheddar slices', unit: 'pcs', before: '58', after: '57', low: '20' },
  { name: 'Fries', unit: 'kg', before: '9.4', after: '9.2', low: '4' },
  { name: 'Paneer', unit: 'kg', before: '2.2', after: '2.05', low: '1' },
]

export function StockPanel({ final }: PanelMode) {
  return (
    <Panel id="sCard" label="Inventory · live counts" meta="Updated by sales">
      <div className={s.recipe} data-e="sRec">
        <span className={s.chipLive}>Table 12 · 8:31 PM</span>
        <span>
          <b>Smash burger</b> uses 1 bun, 1 patty, 1 cheddar, 0.2 kg fries
        </span>
      </div>
      <div className={s.stockHead}>
        <span className={s.label}>Item</span>
        <span className={s.label}>On hand</span>
        <span className={s.label}>Low at</span>
        <span className={s.label}>Status</span>
      </div>
      {STOCK.map((r, i) => {
        const first = i === 0
        return (
          <div key={r.name} className={s.stockRow} data-e={`sR${i + 1}`} data-low={final && first ? 'true' : undefined}>
            <span style={{ fontWeight: 500 }}>{r.name}</span>
            <span className={s.stockNum}>
              <s data-e={`sS${i + 1}`} style={final ? undefined : { opacity: 0 }}>
                {r.before}
              </s>
              <span data-e={`sC${i + 1}`}>{final ? r.after : r.before}</span> {r.unit}
            </span>
            <span className={s.stockPar}>
              {r.low} {r.unit}
            </span>
            <span className={s.swap}>
              {first ? (
                <>
                  {!final && (
                    <span className={s.chip} data-e="sFlagA">
                      OK
                    </span>
                  )}
                  <span className={`${s.chipLate} ${final ? '' : s.swapB}`} data-e="sFlagB">
                    Low stock
                  </span>
                </>
              ) : (
                <span className={s.chip}>OK</span>
              )}
            </span>
          </div>
        )
      })}
      <div className={s.po} data-e="sPo">
        <span>
          <span className={s.label} style={{ display: 'block', marginBottom: 4 }}>
            Purchase order · draft
          </span>
          <span style={{ fontWeight: 500 }}>Harbor Bakery · Brioche buns × 60</span>
        </span>
        <span className={s.chip}>To send</span>
      </div>
    </Panel>
  )
}

/* ── 6. Staff board ──────────────────────────────────────────────────────── */

const STAFF = [
  { i: 'MA', name: 'Maya', role: 'Server', in: '4:58 PM', hrs: '6h 06m' },
  { i: 'DV', name: 'Dev', role: 'Grill', in: '3:30 PM', hrs: '7h 34m' },
  { i: 'AN', name: 'Ana', role: 'Server', in: '5:02 PM', hrs: '6h 02m' },
  { i: 'JO', name: 'Jon', role: 'Expo', in: '5:15 PM', hrs: '5h 49m' },
  { i: 'PR', name: 'Priya', role: 'Manager', in: '2:45 PM', hrs: '8h 19m' },
  { i: 'LE', name: 'Leo', role: 'Dish', in: '5:30 PM', hrs: '5h 34m' },
]

export function StaffPanel({ final }: PanelMode) {
  return (
    <Panel id="fCard" label="Staff board · tonight" metaId="fCount" meta={final ? '5 on shift' : '6 on shift'}>
      {STAFF.map((p, i) => {
        const leo = p.name === 'Leo'
        return (
          <div key={p.name} className={s.staffRow} data-e={`f${i + 1}`} data-thread={final && leo ? 'true' : undefined}>
            <span className={s.avatar}>{p.i}</span>
            <span>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span className={s.mod} data-e={leo ? 'fRole' : undefined}>
                {leo && final ? 'Dish · out 11:04 PM' : p.role}
              </span>
            </span>
            <span className={s.stockPar}>In {p.in}</span>
            <span className={s.stockNum}>{p.hrs}</span>
            <span className={s.swap}>
              {leo ? (
                <>
                  {!final && (
                    <>
                      <span className={s.chipGood} data-e="fChipA">
                        On shift
                      </span>
                      <span className={`${s.miniBtn} ${s.swapB}`} data-e="fBtn" style={{ opacity: 0 }}>
                        Clock out
                      </span>
                    </>
                  )}
                  <span className={`${s.chip} ${final ? '' : s.swapB}`} data-e="fChipB">
                    Clocked out
                  </span>
                </>
              ) : (
                <span className={s.chipGood}>On shift</span>
              )}
            </span>
          </div>
        )
      })}
    </Panel>
  )
}

/* ── 7. Close of day ─────────────────────────────────────────────────────── */

export const TENDERS = [
  { k: 'Card', v: 4710.4 },
  { k: 'Cash', v: 1082.1 },
  { k: 'Apple Pay', v: 690 },
]
const GROSS = 6482.5

export function ZPanel({ final }: PanelMode) {
  return (
    <Panel id="zCard" label="Z-report · Friday" meta="186 orders · 214 guests">
      <div className={s.zGrid}>
        {[
          ['Gross sales', '$6,482.50'],
          ['Tips', '$1,104.20'],
          ['Avg per guest', '$30.29'],
        ].map(([k, v], i) => (
          <div key={k} className={s.zCell} data-e={`zN${i + 1}`}>
            <span className={s.label}>{k}</span>
            <span className={s.zNum}>{v}</span>
          </div>
        ))}
      </div>
      <div className={s.zSplit}>
        <div>
          <h4 className={s.label}>Tenders</h4>
          {TENDERS.map((t, i) => (
            <div key={t.k} className={s.tender} data-e={`zT${i + 1}`}>
              <span>{t.k}</span>
              <span className={s.tenderBar}>
                <i data-e={`zB${i + 1}`} style={{ width: final ? `${(t.v / GROSS) * 100}%` : '0%' }} />
              </span>
              <span className={s.stockNum}>${t.v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className={s.ledgerRow} style={{ borderBottom: 0 }} data-e="zTax">
            Tax collected <b>$518.60</b>
          </div>
          <div className={s.ledgerRow} style={{ borderBottom: 0, paddingTop: 0 }} data-e="zVoid">
            Voids · 3 items <b>$41.00</b>
          </div>
        </div>
        <div>
          <h4 className={s.label}>Cash drawer</h4>
          <div className={s.ledger} style={{ marginTop: 6 }}>
            <div className={s.ledgerRow} data-e="zD1">
              Opening float <b>$200.00</b>
            </div>
            <div className={s.ledgerRow} data-e="zD2">
              Cash sales <b>$1,082.10</b>
            </div>
            <div className={s.ledgerRow} data-e="zD3">
              Expected in drawer <b>$1,282.10</b>
            </div>
            <div className={s.ledgerRow} data-tone="good">
              Counted{' '}
              <b>
                <span data-e="zCnt" data-t="$1,282.10">
                  {final ? '$1,282.10' : ''}
                </span>
                {!final && <span className={s.caret} data-e="zCaret" aria-hidden="true" />}{' '}
                <span data-e="zBal" className={s.stampText}>
                  · balanced
                </span>
              </b>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
