/**
 * Who may open the Prominentz HQ console (/hq).
 *
 * Platform admins are the Prominentz team, not restaurant staff, so the list
 * lives in the environment rather than in a tenant's database:
 *   PLATFORM_ADMIN_EMAILS=you@prominentz.com,ops@prominentz.com
 */
export function platformAdminEmails(): Set<string> {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return platformAdminEmails().has(email.trim().toLowerCase())
}
