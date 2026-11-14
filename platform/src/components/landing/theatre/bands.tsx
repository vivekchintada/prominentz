import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProminentzLogo } from '@/components/brand/ProminentzLogo'
import { PRICING } from '@/lib/pricing'
import s from '../Landing.module.css'

/* The bands that are not product panels: the open, the pain collage, the
   flip, the scene frame, the close, and the chrome around the stage. */

export function BgLight() {
  return (
    <div data-e="bgLight" className={s.bgLight} aria-hidden="true">
      <div className={s.bgDots} />
      <div className={s.bgBlobA} />
      <div className={s.bgBlobB} />
      <div className={s.bgGlow} />
    </div>
  )
}

export function HeroBand({ inFlow }: { inFlow?: boolean }) {
  return (
    <div data-e="hero" className={`${s.band} ${s.bandHero} ${inFlow ? s.bandInFlow : ''}`}>
      <div className={s.heroGlow} aria-hidden="true" />
      <div className={s.heroInner}>
        <h1 className={s.h1}>The whole service, on one system.</h1>
        <p className={s.lede} style={{ marginInline: 'auto', textAlign: 'center' }}>
          Take the order at the table, fire it to the kitchen, split the check and close the day. POS, kitchen display, QR
          and online ordering, inventory and staff, for ${PRICING.STARTER.monthly} a month on the tablets you already own.
        </p>
        <div className={s.btnRow} style={{ justifyContent: 'center' }}>
          <Link href="/signup" className={`${s.btnSolid} plausible-event-name=Trial+Click`}>
            Start free trial <ArrowRight size={14} strokeWidth={2.6} />
          </Link>
          <a href="#demo" className={s.btnLine}>
            Book a demo
          </a>
        </div>
        <p className={s.fine}>14 days free · 0% of your sales · cancel anytime</p>
      </div>
      {!inFlow && (
        <div className={s.heroCue} aria-hidden="true">
          <span className={s.scrollLabel}>Scroll</span>
          <span className={s.cueLine}>
            <span className={s.cueFill} />
          </span>
        </div>
      )}
    </div>
  )
}

/* The night as it runs today: fragments that never talk to each other. */
const COLLAGE: { id: string; cls: string; style: React.CSSProperties; body: React.ReactNode }[] = [
  {
    id: 'ta1',
    cls: 'paper',
    style: { '--cl': '0%', '--ct': '0%', '--cw': '30%', '--cr': 'rotate(-1.6deg)' } as React.CSSProperties,
    body: (
      <>
        <b>T7 · 2 cvr</b>
        <span>2 burger (no onion??)</span>
        <span>1 fries · 1 wings</span>
        <small>hand-written · 7:41 PM</small>
      </>
    ),
  },
  {
    id: 'ta2',
    cls: 'tablet',
    style: { '--cl': '34%', '--ct': '2%', '--cw': '28%', '--cr': 'rotate(1.2deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Delivery tablet 1</small>
        <b>New order · tap to accept</b>
        <span>Re-key it into the POS</span>
      </>
    ),
  },
  {
    id: 'ta3',
    cls: 'tablet',
    style: { '--cl': '66%', '--ct': '6%', '--cw': '28%', '--cr': 'rotate(-2deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Delivery tablet 2</small>
        <b>New order · tap to accept</b>
        <span>Re-key it into the POS</span>
      </>
    ),
  },
  {
    id: 'ta4',
    cls: 'chat',
    style: { '--cl': '4%', '--ct': '34%', '--cw': '34%', '--cr': 'rotate(1deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Maya · 8:02 PM</small>
        <b>did table 12 get fired? kitchen says no ticket</b>
      </>
    ),
  },
  {
    id: 'ta5',
    cls: 'sheet',
    style: { '--cl': '42%', '--ct': '38%', '--cw': '30%', '--cr': 'rotate(-1.2deg)' } as React.CSSProperties,
    body: (
      <>
        <small>stock.xlsx · last edited Monday</small>
        <b>Buns 13? 12?</b>
        <span>recount Monday</span>
      </>
    ),
  },
  {
    id: 'ta6',
    cls: 'paper',
    style: { '--cl': '70%', '--ct': '42%', '--cw': '26%', '--cr': 'rotate(2.2deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Whiteboard · staff</small>
        <b>Leo 5:30 → ?</b>
        <span>Maya 5 → close</span>
      </>
    ),
  },
  {
    id: 'ta7',
    cls: 'sheet',
    style: { '--cl': '8%', '--ct': '70%', '--cw': '32%', '--cr': 'rotate(-0.8deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Monthly statement</small>
        <b>Software + per terminal + KDS add-on + online ordering add-on</b>
      </>
    ),
  },
  {
    id: 'ta8',
    cls: 'paper',
    style: { '--cl': '48%', '--ct': '74%', '--cw': '30%', '--cr': 'rotate(1.4deg)' } as React.CSSProperties,
    body: (
      <>
        <small>Napkin · 11:40 PM</small>
        <b>Drawer: 1,282.10 expected</b>
        <span>counted 1,261.10 … ???</span>
      </>
    ),
  },
]

const CHIPS: { id: string; style: React.CSSProperties; text: string }[] = [
  { id: 'tc1', style: { left: '30%', top: '24%' }, text: '4 screens on the counter' },
  { id: 'tc2', style: { left: '62%', top: '30%' }, text: 'none of them talk' },
  { id: 'tc3', style: { left: '22%', top: '60%' }, text: 'the owner is the integration' },
  { id: 'tc4', style: { left: '58%', top: '66%' }, text: 'close-out by hand' },
]

export function TodayBand() {
  return (
    <div data-e="today" className={s.band}>
      <div className={s.tHead} data-e="tHead">
        <h2 className={s.h2}>This is what Friday night looks like today.</h2>
      </div>
      <div className={s.collage} aria-label="A typical night without one system">
        {COLLAGE.map((c) => (
          <div key={c.id} className={s.collageItem} style={c.style}>
            <div className={`${s.frag} ${s[`frag_${c.cls}`]}`} data-e={c.id}>
              {c.body}
            </div>
          </div>
        ))}
        {CHIPS.map((c) => (
          <span key={c.id} className={s.collageChip} style={c.style} data-e={c.id}>
            {c.text}
          </span>
        ))}
      </div>
      <div className={s.tClose} data-e="tClose">
        Nothing talks to anything else.
      </div>
    </div>
  )
}

export function FlipBand() {
  return (
    <div data-e="flip" className={`${s.band} ${s.bandFlip}`}>
      <p className={s.flipText} data-e="fline">
        Follow one order. <em>Table 12</em>, four guests, a Friday at 7:40&nbsp;PM.
      </p>
    </div>
  )
}

export type Caption = { h: string; p: string }

export function Scene({
  id,
  prefix,
  num,
  name,
  capA,
  capB,
  dpt = '12vh',
  wide,
  extra,
  children,
}: {
  id: string
  prefix: string
  num: string
  name: string
  capA: Caption
  capB?: Caption
  dpt?: string
  wide?: boolean
  /** rendered under the caption, with its own handle */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div data-e={id} className={`${s.band} ${s.scene}`} aria-label={`Chapter ${num}: ${name}`}>
      <div className={s.sceneCaption}>
        <div data-e={`${prefix}CapA`}>
          <h2 className={s.h2}>{capA.h}</h2>
          <p className={s.body}>{capA.p}</p>
        </div>
        {capB && (
          <div data-e={`${prefix}CapB`} className={s.capAlt}>
            <h2 className={s.h2}>{capB.h}</h2>
            <p className={s.body}>{capB.p}</p>
          </div>
        )}
        {extra}
      </div>
      <div className={`${s.sceneDemo} ${wide ? s.sceneDemoWide : ''}`} style={{ '--dpt': dpt } as React.CSSProperties}>
        {children}
      </div>
    </div>
  )
}

export function CloseBandStage() {
  return (
    <div data-e="close" className={s.band}>
      <div className={s.heroGlow} aria-hidden="true" />
      <div className={s.heroInner}>
        <div data-e="clMark">
          <ProminentzLogo variant="app-icon" size={72} />
        </div>
        <h2 className={s.h1} data-e="clTag" style={{ marginTop: 28, maxWidth: '12em' }}>
          Run Friday night on Prominentz.
        </h2>
        <div className={s.btnRow} data-e="clCta" style={{ justifyContent: 'center' }}>
          <Link href="/signup" className={`${s.btnSolid} plausible-event-name=Trial+Click`}>
            Start free trial <ArrowRight size={14} strokeWidth={2.6} />
          </Link>
          <a href="#demo" className={s.btnLine}>
            Book a demo
          </a>
        </div>
        <p className={s.fine} data-e="clFoot">
          Every screen above is a demo restaurant. Yours will have your menu on it.
        </p>
      </div>
    </div>
  )
}

/* Chrome around the stage ---------------------------------------------------- */

export function Rail({ count }: { count: number }) {
  return (
    <div data-e="rail" className={s.rail} aria-hidden="true">
      <div className={s.railTrack}>
        <span className={s.railLine} />
        <span className={s.railFill} data-e="railFill" />
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={s.railDot} data-e={`r${i + 1}`} style={{ top: `${(i / (count - 1)) * 100}%` }} />
        ))}
      </div>
      <div className={s.railCount}>
        <span data-e="railCur">01</span> / {String(count).padStart(2, '0')}
      </div>
    </div>
  )
}

export function Prog() {
  return (
    <div data-e="prog" className={s.prog} aria-hidden="true">
      0%
    </div>
  )
}

export function Scue() {
  return (
    <div data-e="scue" className={s.scue} aria-hidden="true">
      <span className={s.scrollLabel}>Keep scrolling</span>
      <span className={s.cueLine} style={{ height: 26 }}>
        <span className={s.cueFill} />
      </span>
    </div>
  )
}

export function Elf() {
  return (
    <div data-e="elf" className={s.elf} aria-hidden="true">
      <span data-e="elfPulse" className={s.elfPulse} />
      <span data-e="elfCur" className={s.elfCur}>
        <svg viewBox="0 0 22 26" width="22" height="26">
          <path d="M3 3 L17 12 L9 13 L3 21 Z" fill="#0E1014" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className={s.elfPill}>
        <span className={s.elfPillDot} />
        prominentz
      </span>
    </div>
  )
}
