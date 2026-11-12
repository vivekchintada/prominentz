import Link from 'next/link'

/** The "prominentz" wordmark with the underlined z, as drawn on the role boards. */
export function BentoLogo({ href }: { href?: string }) {
  const mark = (
    <>
      prominent<span className="bz-logo__z">z</span>
    </>
  )
  if (!href) return <span className="bz-logo">{mark}</span>
  return (
    <Link href={href} className="bz-logo" aria-label="Prominentz home">
      {mark}
    </Link>
  )
}
