import { redirect } from 'next/navigation'

/**
 * The old "classic" POS was retired in favour of the single bento POS at /pos.
 * Old bookmarks and printed links keep working: they land on the same check.
 */
export default async function ClassicPosRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const keep = new URLSearchParams()
  for (const key of ['tableId', 'orderId']) {
    const v = sp[key]
    if (typeof v === 'string' && v) keep.set(key, v)
  }
  const q = keep.toString()
  redirect(q ? `/pos?${q}` : '/pos')
}
