'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ReceiptText, ChefHat, Globe, CreditCard, Package, Users, Moon } from 'lucide-react'
import { Topbar, SiteFooter, CloseBand, type TrackerStep, type Ground } from './SiteChrome'
import { Theatre } from './theatre/engine'
import { BANDS, RUNS, PATHS, SCENES, TRACKER_OF } from './theatre/script'
import { BgLight, HeroBand, TodayBand, FlipBand, Scene, CloseBandStage, Rail, Prog, Scue, Elf, type Caption } from './theatre/bands'
import { PosPanel, KdsPanel, QueuePanel, PayPanel, StockPanel, StaffPanel, ZPanel, type PanelMode } from './theatre/panels'
import { PlanBill, OtherTiers } from './PlanBill'
import { Faq, DemoForm, DemoPoints } from './FaqDemo'
import s from './Landing.module.css'

type Chapter = {
  id: string
  prefix: string
  name: string
  icon: TrackerStep['icon']
  capA: Caption
  capB: Caption
  Panel: React.ComponentType<PanelMode>
  dpt?: string
  wide?: boolean
}

/* One order, Table 12, followed through a Friday night. */
const CHAPTERS: Chapter[] = [
  {
    id: 'order',
    prefix: 'o',
    name: 'Order',
    icon: ReceiptText,
    Panel: PosPanel,
    dpt: '11vh',
    capA: {
      h: 'Take the order where the guest sits.',
      p: 'Servers ring it up on any iPad, Android tablet or laptop: seats, modifiers and notes, on a floor plan of your own room.',
    },
    capB: {
      h: 'Or let the table order for itself.',
      p: 'Every table gets its own QR code. Guests scan, add a drink, and it lands on the same check and goes straight to the kitchen.',
    },
  },
  {
    id: 'kitchen',
    prefix: 'k',
    name: 'Kitchen',
    icon: ChefHat,
    Panel: KdsPanel,
    dpt: '10vh',
    wide: true,
    capA: {
      h: 'The kitchen sees it the moment you hit send.',
      p: 'Tickets land on the kitchen display with a stopwatch, allergy notes in red, and anything past your target time sorted to the front as late.',
    },
    capB: {
      h: 'Bump it, and the floor knows.',
      p: 'One tap moves a ticket to the pass. The all-day count updates, and the server can see the food is up without anyone shouting across the kitchen.',
    },
  },
  {
    id: 'online',
    prefix: 'q',
    name: 'Online',
    icon: Globe,
    Panel: QueuePanel,
    dpt: '13vh',
    capA: {
      h: 'Online orders join the same line.',
      p: 'Your own online ordering page and the table QR codes fire into the same kitchen queue as the POS, already paid.',
    },
    capB: {
      h: 'So do the delivery apps.',
      p: 'DoorDash, Uber Eats, Zomato and Swiggy come in through aggregator sync and land in the same queue. No second tablet on the counter.',
    },
  },
  {
    id: 'payment',
    prefix: 'p',
    name: 'Payment',
    icon: CreditCard,
    Panel: PayPanel,
    dpt: '9vh',
    capA: {
      h: 'Split it any way the table wants.',
      p: 'Evenly, by seat, or item by item. Take cash or card at the table, and close each seat as it pays.',
    },
    capB: {
      h: 'The money goes to you. All of it.',
      p: 'Card payments settle to your own Stripe account. Prominentz takes 0% of your sales; you pay Stripe’s standard processing fee and nothing on top.',
    },
  },
  {
    id: 'stock',
    prefix: 's',
    name: 'Stock',
    icon: Package,
    Panel: StockPanel,
    dpt: '11vh',
    capA: {
      h: 'Sell a burger, and the bun count drops.',
      p: 'Link menu items to recipes once. Every sale takes its ingredients off the shelf, so the stock sheet is right before you count it.',
    },
    capB: {
      h: 'Low stock shows up before you run out.',
      p: 'Anything below its low-stock level is flagged, and purchase orders to your suppliers live in the same place.',
    },
  },
  {
    id: 'staff',
    prefix: 'f',
    name: 'Staff',
    icon: Users,
    Panel: StaffPanel,
    dpt: '13vh',
    capA: {
      h: 'Everyone clocks in on the same tablet.',
      p: 'Staff clock in and out from the staff board. You see who’s on, and what they’re working.',
    },
    capB: {
      h: 'Clock out, and the shift’s hours are on record.',
      p: 'When someone clocks out, the hours for that shift are saved, so you’re not rebuilding the night from memory at payroll.',
    },
  },
  {
    id: 'eod',
    prefix: 'z',
    name: 'Close',
    icon: Moon,
    Panel: ZPanel,
    dpt: '10vh',
    wide: true,
    capA: {
      h: 'Close the day in one report.',
      p: 'The Z-report totals gross sales, tax, tips and voids, and breaks tenders into card, cash and Apple Pay.',
    },
    capB: {
      h: 'Count the drawer against what it should hold.',
      p: 'Opening float plus cash sales gives the cash you should have. Count it, see it balance, and go home.',
    },
  },
]

const STEPS: TrackerStep[] = CHAPTERS.map((c) => ({ id: c.id, label: c.name, icon: c.icon }))

const BILL_CAPTION: Caption = {
  h: 'Everything Table 12 touched is one plan.',
  p: 'POS, kitchen display, QR and online ordering, payments, stock, staff and the Z-report. One price for the restaurant, not per device or per seat.',
}

const FACTS = [
  ['Your own devices', 'iPad, Android tablet, Windows PC, Mac or phone, in the browser. Nothing to install.'],
  ['Your own printers', 'Standard 80mm thermal receipt printers over USB, with the cash drawer on the printer.'],
  ['Service keeps going', 'If the Wi-Fi drops, orders queue on the device and sync when it’s back.'],
  ['Your own payouts', 'Guest card payments settle to your Stripe account, with 0% taken by us.'],
]

export default function HomeLanding() {
  const root = useRef<HTMLDivElement>(null)
  const engine = useRef<Theatre | null>(null)
  const [theatre, setTheatre] = useState(false)
  const [ground, setGround] = useState<Ground>('dark')

  // The theatre needs room and motion; everyone else reads the stacked story.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)')
    const apply = () => setTheatre(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!theatre || !root.current) return
    const T = new Theatre({
      root: root.current,
      bands: BANDS,
      runs: RUNS,
      paths: PATHS,
      trackerOf: TRACKER_OF,
      trackerCount: STEPS.length,
      railIds: SCENES,
      heroId: 'hero',
      todayId: 'today',
      flipId: 'flip',
      billId: 'bill',
      closeId: 'close',
      cursor: !window.matchMedia('(pointer: coarse)').matches,
    })
    engine.current = T
    T.boot()
    return () => {
      T.destroy()
      engine.current = null
    }
  }, [theatre])

  // Stacked story: the topbar follows the ground under it.
  useEffect(() => {
    if (theatre) {
      setGround('dark')
      return
    }
    let raf = 0
    const measure = () => {
      raf = 0
      const els = root.current?.querySelectorAll<HTMLElement>('[data-ground]') ?? []
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.top <= 30 && r.bottom > 30) {
          setGround(el.dataset.ground === 'light' ? 'light' : 'dark')
          break
        }
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [theatre])

  const goTo = useCallback((id: string) => {
    if (engine.current) engine.current.scrollToBand(id)
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div ref={root} className={`${s.root} ${s.dark}`}>
      <Topbar ground={ground} steps={theatre ? STEPS : undefined} onStep={goTo} scripted={theatre} />

      <main id="main-content">
        {theatre ? (
          <div className={s.theatre} data-e="spacer">
            <div className={`${s.stage} ${s.dark}`} data-e="stage" aria-label="One order through Prominentz, seat to close">
              <BgLight />
              <HeroBand />
              <TodayBand />
              <FlipBand />
              {CHAPTERS.map((c, i) => (
                <Scene
                  key={c.id}
                  id={c.id}
                  prefix={c.prefix}
                  num={String(i + 1).padStart(2, '0')}
                  name={c.name}
                  capA={c.capA}
                  capB={c.capB}
                  dpt={c.dpt}
                  wide={c.wide}
                >
                  <c.Panel />
                </Scene>
              ))}
              <Scene
                id="bill"
                prefix="b"
                num="08"
                name="The bill"
                capA={BILL_CAPTION}
                dpt="8vh"
                extra={
                  <div data-e="bTiers" className={s.billTiersStage}>
                    <OtherTiers />
                  </div>
                }
              >
                <PlanBill scripted />
              </Scene>
              <CloseBandStage />
            </div>
            <Rail count={SCENES.length} />
            <Prog />
            <Scue />
            <Elf />
          </div>
        ) : (
          <>
            <div data-ground="dark">
              <HeroBand inFlow />
            </div>
            <section className={`${s.flip} ${s.light}`} data-ground="light" aria-label="The story">
              <p className={s.flipText}>
                Follow one order. <em>Table 12</em>, four guests, a Friday at 7:40&nbsp;PM. Here&apos;s everywhere it goes.
              </p>
            </section>
            <div className={s.light} data-ground="light">
              {CHAPTERS.map((c) => (
                <section key={c.id} id={c.id} className={s.beat} aria-label={c.name}>
                  <div>
                    <h2 className={s.h2}>{c.capA.h}</h2>
                    <p className={s.body}>{c.capA.p}</p>
                    <div className={s.beatMore}>
                      <h3 className={s.h3}>{c.capB.h}</h3>
                      <p className={s.body}>{c.capB.p}</p>
                    </div>
                  </div>
                  <c.Panel final />
                </section>
              ))}
            </div>
            <section id="pricing" className={`${s.billSection} ${s.paper}`} data-ground="light" aria-labelledby="bill-title">
              <div className={s.billGrid}>
                <div className={s.billIntro}>
                  <h2 id="bill-title" className={s.h2}>
                    {BILL_CAPTION.h}
                  </h2>
                  <p className={s.body}>{BILL_CAPTION.p}</p>
                </div>
                <PlanBill />
                <div className={s.billTiers}>
                  <OtherTiers />
                </div>
              </div>
            </section>
          </>
        )}

        <section className={s.dark} data-ground="dark" aria-label="What it runs on">
          <div className={s.facts}>
            {FACTS.map(([h, p]) => (
              <div key={h} className={s.fact}>
                <h3 className={s.h3} style={{ fontSize: 20 }}>
                  {h}
                </h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className={`${s.faq} ${s.dark}`} data-ground="dark" aria-labelledby="faq-title">
          <div className={s.faqGrid}>
            <h2 id="faq-title" className={s.h2}>
              What owners ask before they switch.
            </h2>
            <Faq />
          </div>
        </section>

        <section id="demo" className={`${s.demo} ${s.dark}`} data-ground="dark" aria-labelledby="demo-title">
          <div className={s.demoGrid}>
            <div>
              <h2 id="demo-title" className={s.h2}>
                See it running on your own menu.
              </h2>
              <p className={s.body}>
                Tell us about your restaurant. We&apos;ll load your menu for free and walk you through the POS, kitchen
                display and QR ordering on a 15-minute call.
              </p>
              <DemoPoints />
            </div>
            <DemoForm />
          </div>
        </section>

        {!theatre && <CloseBand title="Run Friday night on Prominentz." />}
      </main>
      <SiteFooter />
    </div>
  )
}
