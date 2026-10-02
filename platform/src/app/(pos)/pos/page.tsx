import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import {
  DreamsPosTerminal,
  MenuItemData,
  CategoryData,
  TableData,
  RecentOrderCardData,
} from '@/components/pos/DreamsPosTerminal'

export const metadata = {
  title: 'POS Terminal | Prominentz',
  description: 'High-speed Restaurant Point of Sale terminal with live checks, menu catalog, and table layout.',
}

function getImageForDish(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('old fashioned')) return 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=280&fit=crop&q=80'
  if (n.includes('aperol') || n.includes('spritz')) return 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=400&h=280&fit=crop&q=80'
  if (n.includes('burrata') || n.includes('prosciutto')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=280&fit=crop&q=80'
  if (n.includes('french onion') || n.includes('soup')) return 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=280&fit=crop&q=80'
  if (n.includes('chocolate') || n.includes('fondant')) return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=280&fit=crop&q=80'
  if (n.includes('crème') || n.includes('brulee') || n.includes('brûlée')) return 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=280&fit=crop&q=80'
  if (n.includes('negroni')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=280&fit=crop&q=80'
  if (n.includes('bruschetta')) return 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=280&fit=crop&q=80'
  if (n.includes('calamari')) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&h=280&fit=crop&q=80'
  if (n.includes('tiramisu')) return 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=280&fit=crop&q=80'
  if (n.includes('beef') || n.includes('tenderloin') || n.includes('steak')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=280&fit=crop&q=80'
  if (n.includes('salmon')) return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=280&fit=crop&q=80'
  if (n.includes('duck')) return 'https://images.unsplash.com/photo-1514944298352-78d120a169b1?w=400&h=280&fit=crop&q=80'
  if (n.includes('lobster') || n.includes('linguine') || n.includes('pasta')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop&q=80'
  if (n.includes('water') || n.includes('sparkling')) return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&h=280&fit=crop&q=80'
  if (n.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=280&fit=crop&q=80'
  if (n.includes('taco')) return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=280&fit=crop&q=80'
  if (n.includes('chicken')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=280&fit=crop&q=80'
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=280&fit=crop&q=80'
}

export default async function PosPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user

  // Resolve employee's locationId, fallback to restaurant's first location
  let locationId: string | undefined
  try {
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, isActive: true },
    })
    locationId = employee?.locationId

    if (!locationId && user.restaurantId) {
      const fallbackLocation = await prisma.location.findFirst({
        where: { restaurantId: user.restaurantId },
      })
      locationId = fallbackLocation?.id
    }
  } catch {}

  if (!locationId) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center max-w-md card">
          <h1 className="text-xl font-bold text-brand mb-2">Location Not Found</h1>
          <p className="text-sm text-zinc-400">
            No active restaurant location was resolved for your account. Please set up a location in the dashboard.
          </p>
        </div>
      </div>
    )
  }

  // 1. Fetch Categories
  const categoriesRaw = await prisma.menuCategory.findMany({
    where: { restaurantId: user.restaurantId, isActive: true },
    include: { items: true },
    orderBy: { displayOrder: 'asc' },
  })

  // 2. Fetch Menu Items
  const menuItemsRaw = await prisma.menuItem.findMany({
    where: { category: { restaurantId: user.restaurantId }, isAvailable: true },
    include: { category: true, modifiers: { include: { options: true } } },
    orderBy: { displayOrder: 'asc' },
  })

  // 3. Fetch Tables
  const tablesRaw = await prisma.table.findMany({
    where: { locationId },
    include: {
      orders: {
        where: { status: { notIn: ['PAID', 'VOIDED'] } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // 4. Fetch Recent Orders: only paid, delivered, and dined-in settled orders
  const recentOrdersRaw = await prisma.order.findMany({
    where: {
      table: { locationId },
      status: 'PAID',
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      table: true,
      customer: true,
      items: { include: { menuItem: true } },
    },
  })

  // Format Categories
  const formattedCategories: CategoryData[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: getImageForDish(c.name),
    itemCount: c.items.length,
  }))

  // Format Menu Items
  const formattedMenuItems: MenuItemData[] = menuItemsRaw.map((m, idx) => {
    const isVeg =
      m.category?.name.toLowerCase().includes('dessert') ||
      m.category?.name.toLowerCase().includes('drink') ||
      m.name.toLowerCase().includes('bruschetta') ||
      m.name.toLowerCase().includes('burrata') ||
      m.name.toLowerCase().includes('tiramisu') ||
      m.name.toLowerCase().includes('fondant') ||
      m.name.toLowerCase().includes('crème')

    return {
      id: m.id,
      categoryId: m.categoryId,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      imageUrl: m.imageUrl || getImageForDish(m.name),
      isAvailable: m.isAvailable,
      category: m.category ? { id: m.category.id, name: m.category.name } : undefined,
      modifiers: (m.modifiers || []).map((mod) => ({
        id: mod.id,
        menuItemId: mod.menuItemId,
        name: mod.name,
        isRequired: mod.isRequired,
        minSelect: mod.minSelect,
        maxSelect: mod.maxSelect,
        options: (mod.options || []).map((opt: any) => ({
          id: opt.id,
          name: opt.name,
          priceAdjustment: Number(opt.priceAdjustment || 0),
        })),
      })),
      isTrending: idx === 0 || idx === 2,
      isMustTry: idx === 1 || idx === 3,
      isVeg,
    }
  })

  // Format Tables
  const formattedTables: TableData[] = tablesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    capacity: t.capacity,
    status: t.status as any,
    orders: (t.orders || []).map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total || 0),
      guestCount: o.guestCount,
    })),
  }))

  // Format Recent Orders
  let formattedRecentOrders: RecentOrderCardData[] = recentOrdersRaw.map((o) => {
    const date = new Date(o.createdAt)
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const n = (o.notes || '').toLowerCase()
    let type: 'Dine In' | 'Take Away' | 'Delivery' = 'Dine In'
    if (n.includes('take away') || n.includes('takeaway') || n.includes('to-go') || n.includes('pickup')) {
      type = 'Take Away'
    } else if (n.includes('delivery') || n.includes('doordash') || n.includes('ubereats') || n.includes('courier') || (o as any).orderSource?.includes('DELIVERY')) {
      type = 'Delivery'
    } else {
      type = 'Dine In'
    }

    // Status / Timer label
    let timerLabel = '30 Mins'
    let timerColor: 'green' | 'red' = 'green'
    let progress = 20

    if (o.status === 'PAID') {
      timerLabel = '✓ Paid'
      timerColor = 'green'
      progress = 100
    } else if (o.status === 'READY') {
      timerLabel = '🔔 Ready'
      timerColor = 'green'
      progress = 100
    } else if (o.status === 'PARTIALLY_READY') {
      timerLabel = '⚡ Part Ready'
      timerColor = 'green'
      progress = 75
    } else if (o.status === 'SENT_TO_KITCHEN') {
      timerLabel = '🍳 Cooking'
      timerColor = 'green'
      progress = 50
    } else {
      timerLabel = '📋 Open'
      timerColor = 'green'
      progress = 20
    }

    return {
      id: o.id,
      orderNumber: `#${o.id.slice(-5).toUpperCase()}`,
      type,
      customerName: o.customer?.name || (o.table ? `Guest (${o.table.name})` : 'Walk-in Guest'),
      time: timeStr,
      tableName: o.table?.name,
      timerLabel,
      timerColor,
      targetTime: '20:00',
      progress,
      total: Number(o.total || 0),
      status: o.status,
    }
  })



  const currentUser = {
    id: user.id!,
    name: user.name || 'Sarah Manager',
    role: user.role,
    email: user.email!,
  }

  return (
    <DreamsPosTerminal
      initialCategories={formattedCategories}
      initialMenuItems={formattedMenuItems}
      initialTables={formattedTables}
      initialRecentOrders={formattedRecentOrders}
      currentUser={currentUser}
      locationId={locationId}
    />
  )
}
