import { redirect } from 'next/navigation'

export default async function SignupInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  redirect(token ? `/invite?token=${token}` : '/invite')
}
