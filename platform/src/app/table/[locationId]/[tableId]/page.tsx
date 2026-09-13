import { TableOrderClient } from '@/components/table/TableOrderClient'

interface TableOrderPageProps {
  params: Promise<{
    locationId: string
    tableId: string
  }>
}

export const metadata = {
  title: 'Table Digital Menu & Ordering | Resto AI',
}

export default async function TableOrderPage({ params }: TableOrderPageProps) {
  const { locationId, tableId } = await params
  return <TableOrderClient locationId={locationId} tableId={tableId} />
}
