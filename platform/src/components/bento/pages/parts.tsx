import type { ReactNode } from 'react'

/** Eyebrow + big headline row at the top of a bento page, with optional actions on the right. */
export function PageHead({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="bz-head">
      <div className="bz-head__text">
        <span className="bz-eyebrow">{eyebrow}</span>
        <h1 className="bz-h1">{title}</h1>
      </div>
      {actions && <div className="bz-row bz-row--wrap" style={{ gap: 10 }}>{actions}</div>}
    </div>
  )
}

/** Dashed empty state inside a tile. */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="bz-empty">
      <strong>{title}</strong>
      {children}
    </div>
  )
}

/**
 * The page's full working tool (editors, filters, forms) under the bento tiles,
 * so nothing the old page could do is lost.
 */
export function ToolSection({ id = 'manage', title, sub, children }: { id?: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} className="bz-tool" aria-labelledby={`${id}-title`}>
      <div className="bz-tool__head">
        <h2 id={`${id}-title`} className="bz-title bz-title--lg">{title}</h2>
        {sub && <span className="bz-sub">{sub}</span>}
      </div>
      <div className="bz-tool__body">{children}</div>
    </section>
  )
}

/** "1 guest" / "4 guests" */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Share of a total as a whole percent, or null when the total is zero. */
export function pct(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null
}
