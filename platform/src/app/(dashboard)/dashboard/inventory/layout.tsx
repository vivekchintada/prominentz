import { InventorySubbar } from '@/components/bento/inventory/InventorySubbar'

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <InventorySubbar />
      <div>{children}</div>
    </div>
  )
}
