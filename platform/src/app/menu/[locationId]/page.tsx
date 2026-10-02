import { UniversalMenuClient } from '@/components/table/UniversalMenuClient'

interface MenuPageProps {
  params: Promise<{
    locationId: string
  }>
}

export const metadata = {
  title: 'Digital Dine-In Menu & Table Ordering | Prominentz',
}

export default async function UniversalMenuPage({ params }: MenuPageProps) {
  const { locationId } = await params
  return <UniversalMenuClient locationId={locationId} />
}
