import {
  Armchair, Banknote, BarChart3, Bell, CalendarDays, Camera, ChefHat, CheckCircle2, CircleDot,
  ClipboardList, Clock, CreditCard, FileText, Flame, Globe, Monitor, Plug, Printer, Receipt,
  Search, ShoppingBag, ShoppingCart, Sparkles, SquarePen, Tag, Ticket, Truck, User, Utensils,
  XCircle, Zap, type LucideIcon,
} from 'lucide-react'

const ICONS = {
  armchair: Armchair, banknote: Banknote, chart: BarChart3, bell: Bell, calendar: CalendarDays,
  camera: Camera, chef: ChefHat, check: CheckCircle2, dot: CircleDot, clipboard: ClipboardList,
  clock: Clock, card: CreditCard, file: FileText, flame: Flame, globe: Globe, monitor: Monitor,
  plug: Plug, printer: Printer, receipt: Receipt, search: Search, bag: ShoppingBag,
  cart: ShoppingCart, sparkles: Sparkles, note: SquarePen, tag: Tag, ticket: Ticket,
  truck: Truck, user: User, utensils: Utensils, cross: XCircle, zap: Zap,
} satisfies Record<string, LucideIcon>

export type PosIconName = keyof typeof ICONS

/** Decorative inline icon that sits on the text baseline; the label next to it carries the meaning. */
export default function PosIcon({ name, size = 15, label }: { name: PosIconName; size?: number; label?: string }) {
  const Icon = ICONS[name]
  return (
    <Icon
      size={size}
      strokeWidth={2.25}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{ display: 'inline-block', verticalAlign: '-0.18em', marginRight: 5, flexShrink: 0 }}
    />
  )
}
