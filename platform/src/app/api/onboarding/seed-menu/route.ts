import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Template = 'FINE_DINING' | 'FAST_CASUAL' | 'BAR'

const MENU_TEMPLATES: Record<Template, {
  categories: Array<{
    name: string
    items: Array<{
      name: string
      description: string
      price: number
      kdsStation: 'HOT' | 'COLD' | 'BAR'
      taxRate: number
    }>
  }>
}> = {
  FINE_DINING: {
    categories: [
      {
        name: 'Starters',
        items: [
          { name: 'Seared Scallops', description: 'Pan-seared scallops, cauliflower purée, micro herbs', price: 24.00, kdsStation: 'HOT', taxRate: 0.0875 },
          { name: 'Tuna Tartare', description: 'Yellowfin tuna, avocado, sesame, citrus ponzu', price: 21.00, kdsStation: 'COLD', taxRate: 0.0875 },
          { name: 'Burrata', description: 'Fresh burrata, heirloom tomatoes, aged balsamic', price: 18.00, kdsStation: 'COLD', taxRate: 0.0875 },
        ],
      },
      {
        name: 'Mains',
        items: [
          { name: 'Wagyu Tenderloin', description: '8oz Wagyu beef, truffle jus, roasted fingerlings', price: 72.00, kdsStation: 'HOT', taxRate: 0.0875 },
          { name: 'Halibut en Papillote', description: 'Steamed halibut, fennel, lemon butter, capers', price: 54.00, kdsStation: 'HOT', taxRate: 0.0875 },
          { name: 'Duck Confit', description: 'Slow-cooked duck leg, cherry reduction, wilted greens', price: 48.00, kdsStation: 'HOT', taxRate: 0.0875 },
        ],
      },
      {
        name: 'Desserts',
        items: [
          { name: 'Chocolate Fondant', description: 'Warm dark chocolate cake, vanilla bean ice cream', price: 16.00, kdsStation: 'HOT', taxRate: 0.0875 },
          { name: 'Crème Brûlée', description: 'Classic vanilla custard, caramelised sugar crust', price: 14.00, kdsStation: 'COLD', taxRate: 0.0875 },
        ],
      },
    ],
  },
  FAST_CASUAL: {
    categories: [
      {
        name: 'Burgers',
        items: [
          { name: 'Classic Smash Burger', description: 'Double smash patty, American cheese, house sauce, pickles', price: 13.99, kdsStation: 'HOT', taxRate: 0.08 },
          { name: 'BBQ Bacon Burger', description: 'Smoked bacon, cheddar, crispy onions, BBQ aioli', price: 15.99, kdsStation: 'HOT', taxRate: 0.08 },
          { name: 'Veggie Burger', description: 'Black bean patty, guacamole, pico de gallo, lettuce', price: 12.99, kdsStation: 'HOT', taxRate: 0.08 },
        ],
      },
      {
        name: 'Sides',
        items: [
          { name: 'Seasoned Fries', description: 'Crispy golden fries with house seasoning blend', price: 4.99, kdsStation: 'HOT', taxRate: 0.08 },
          { name: 'Onion Rings', description: 'Beer-battered onion rings, chipotle dip', price: 5.99, kdsStation: 'HOT', taxRate: 0.08 },
          { name: 'Side Salad', description: 'Mixed greens, cherry tomatoes, house vinaigrette', price: 5.49, kdsStation: 'COLD', taxRate: 0.08 },
        ],
      },
      {
        name: 'Drinks',
        items: [
          { name: 'Fountain Drink', description: 'Coke, Diet Coke, Sprite, Lemonade — free refills', price: 2.99, kdsStation: 'BAR', taxRate: 0.08 },
          { name: 'Milkshake', description: 'Vanilla, Chocolate, or Strawberry thick shake', price: 6.99, kdsStation: 'BAR', taxRate: 0.08 },
        ],
      },
    ],
  },
  BAR: {
    categories: [
      {
        name: 'Cocktails',
        items: [
          { name: 'Old Fashioned', description: 'Bourbon, Angostura bitters, orange peel, Luxardo cherry', price: 14.00, kdsStation: 'BAR', taxRate: 0.09 },
          { name: 'Margarita', description: 'Blanco tequila, triple sec, fresh lime, salted rim', price: 13.00, kdsStation: 'BAR', taxRate: 0.09 },
          { name: 'Espresso Martini', description: 'Vodka, Kahlúa, fresh espresso, vanilla sugar', price: 15.00, kdsStation: 'BAR', taxRate: 0.09 },
        ],
      },
      {
        name: 'Beer & Wine',
        items: [
          { name: 'Draft Beer', description: 'Rotating selection of local craft drafts — ask your server', price: 8.00, kdsStation: 'BAR', taxRate: 0.09 },
          { name: 'House Red Wine', description: '6oz pour of the house cabernet sauvignon', price: 11.00, kdsStation: 'BAR', taxRate: 0.09 },
          { name: 'House White Wine', description: '6oz pour of the house chardonnay', price: 10.00, kdsStation: 'BAR', taxRate: 0.09 },
        ],
      },
      {
        name: 'Bar Bites',
        items: [
          { name: 'Loaded Nachos', description: 'Tortilla chips, salsa, guacamole, jalapeños, sour cream', price: 14.00, kdsStation: 'HOT', taxRate: 0.09 },
          { name: 'Wings (12pc)', description: 'Buffalo or BBQ glazed, blue cheese dip, celery', price: 18.00, kdsStation: 'HOT', taxRate: 0.09 },
          { name: 'Charcuterie Board', description: 'Cured meats, artisan cheeses, crostini, fig jam', price: 22.00, kdsStation: 'COLD', taxRate: 0.09 },
        ],
      },
    ],
  },
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found for user' }, { status: 404 })
    }

    const { template = 'FAST_CASUAL' }: { template: Template } = await req.json()
    const templateData = MENU_TEMPLATES[template]

    if (!templateData) {
      return NextResponse.json({ error: 'Invalid template. Use FINE_DINING, FAST_CASUAL, or BAR' }, { status: 400 })
    }

    let totalItems = 0

    for (let i = 0; i < templateData.categories.length; i++) {
      const cat = templateData.categories[i]

      // Create master category (no locationId = HQ master)
      const category = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: cat.name,
          displayOrder: i,
          isActive: true,
        },
      })

      for (let j = 0; j < cat.items.length; j++) {
        const item = cat.items[j]
        await prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
            taxRate: item.taxRate,
            kdsStation: item.kdsStation,
            isAvailable: true,
            is86d: false,
            displayOrder: j,
          },
        })
        totalItems++
      }
    }

    // Advance onboarding to step 4
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { onboardingStep: 4 },
    })

    return NextResponse.json({
      success: true,
      template,
      categoriesCreated: templateData.categories.length,
      itemsCreated: totalItems,
    })
  } catch (error) {
    console.error('[POST /api/onboarding/seed-menu]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
