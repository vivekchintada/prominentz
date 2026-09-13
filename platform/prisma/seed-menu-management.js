const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = value
      }
    })
  }
} catch (e) {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const restaurant = await prisma.restaurant.findFirst()
  if (!restaurant) {
    console.error('No restaurant found.')
    return
  }

  console.log(`Seeding Menu Management for restaurant: ${restaurant.name} (${restaurant.id})`)

  // 1. Seed Categories (Matching Image 1)
  const categoriesData = [
    {
      name: 'Sea Food',
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&h=200&fit=crop&q=80',
      displayOrder: 1,
      isActive: true,
      createdAt: new Date('2026-02-15T10:00:00Z'),
    },
    {
      name: 'Pizza',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&q=80',
      displayOrder: 2,
      isActive: true,
      createdAt: new Date('2026-03-10T10:00:00Z'),
    },
    {
      name: 'Salads',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop&q=80',
      displayOrder: 3,
      isActive: true,
      createdAt: new Date('2026-04-05T10:00:00Z'),
    },
    {
      name: 'Tacos',
      imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=200&h=200&fit=crop&q=80',
      displayOrder: 4,
      isActive: false, // Expired / Inactive in picture 1
      createdAt: new Date('2026-05-20T10:00:00Z'),
    },
    {
      name: 'Burgers',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop&q=80',
      displayOrder: 5,
      isActive: true,
      createdAt: new Date('2026-06-30T10:00:00Z'),
    },
    {
      name: 'Ice Cream',
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=200&h=200&fit=crop&q=80',
      displayOrder: 6,
      isActive: true,
      createdAt: new Date('2026-07-18T10:00:00Z'),
    },
    {
      name: 'Pasta',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=200&h=200&fit=crop&q=80',
      displayOrder: 7,
      isActive: true,
      createdAt: new Date('2026-08-12T10:00:00Z'),
    },
    {
      name: 'Beverages',
      imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop&q=80',
      displayOrder: 8,
      isActive: true,
      createdAt: new Date('2026-09-19T10:00:00Z'),
    },
    {
      name: 'Steaks',
      imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=200&h=200&fit=crop&q=80',
      displayOrder: 9,
      isActive: false, // Expired / Inactive in picture 1
      createdAt: new Date('2026-10-07T10:00:00Z'),
    },
  ]

  const categoryMap = {}
  for (const c of categoriesData) {
    let cat = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, name: c.name },
    })
    if (!cat) {
      cat = await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: c.name,
          imageUrl: c.imageUrl,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
          createdAt: c.createdAt,
        },
      })
    } else {
      cat = await prisma.menuCategory.update({
        where: { id: cat.id },
        data: {
          imageUrl: c.imageUrl,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
          createdAt: c.createdAt,
        },
      })
    }
    categoryMap[c.name] = cat
  }
  console.log('Categories seeded/updated successfully.')

  // 2. Seed Items (Matching Image 2 & 3)
  const itemsData = [
    {
      categoryName: 'Steaks',
      name: 'Grilled Salmon Steak',
      description: 'Pan-seared Atlantic salmon fillet glazed with lemon herb butter sauce and served with grilled asparagus and crushed baby potatoes.',
      price: 80.0,
      netPrice: 72.0,
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop&q=80',
      isVeg: false,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Pizza',
      name: 'Cheese Burst Pizza',
      description: 'Hand-tossed crust stuffed with molten mozzarella, San Marzano tomato sauce, fresh basil leaves, and extra virgin olive oil drizzle.',
      price: 66.0,
      netPrice: 58.0,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Sea Food',
      name: 'Garlic Butter Shrimp',
      description: 'Wild jumbo gulf shrimp sautéed in white wine garlic butter sauce, finished with Italian flat parsley and toasted sourdough slices.',
      price: 25.0,
      netPrice: 21.0,
      imageUrl: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&h=400&fit=crop&q=80',
      isVeg: false,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Tacos',
      name: 'Chicken Taco',
      description: 'Corn tortillas packed with marinated grilled chicken breast, charred corn salsa, avocado crema, pickled red onions, and cotija cheese.',
      price: 38.0,
      netPrice: 32.0,
      imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop&q=80',
      isVeg: false,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Steaks',
      name: 'Grilled Chicken',
      description: 'Herb-marinated free-range half chicken grilled over charcoal, accompanied by fresh summer mixed greens and citrus vinaigrette.',
      price: 49.0,
      netPrice: 42.0,
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop&q=80',
      isVeg: false,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Tacos',
      name: 'Grilled Veggie Taco',
      description: 'Charred zucchini, bell peppers, black beans, pico de gallo, shredded purple cabbage, and chipotle lime drizzle in soft corn shells.',
      price: 69.0,
      netPrice: 60.0,
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Pasta',
      name: 'Chicken Noodle Soup',
      description: 'Slow-simmered rich chicken bone broth loaded with hand-pulled egg noodles, tender chicken chunks, carrots, celery, and fresh thyme.',
      price: 45.0,
      netPrice: 38.0,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop&q=80',
      isVeg: false,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Pizza',
      name: 'Corn Pizza',
      description: 'Golden sweet corn kernels, roasted bell peppers, fresh bocconcini mozzarella, oregano flakes, and aromatic garlic herb butter crust.',
      price: 96.0,
      netPrice: 85.0,
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Salads',
      name: 'Tomato Basil Soup',
      description: 'San Marzano roasted plum tomatoes pureed with sweet cream, fresh sweet basil, garlic croutons, and cracked tellicherry pepper.',
      price: 22.0,
      netPrice: 18.0,
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'HOT',
    },
    {
      categoryName: 'Beverages',
      name: 'Hot Chocolate',
      description: 'Rich Belgian dark chocolate melted with whole milk, topped with fluffy whipped cream, cinnamon stick, and cocoa dusting.',
      price: 14.0,
      netPrice: 11.0,
      imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'BAR',
    },
    {
      categoryName: 'Salads',
      name: 'Pumpkin Soup',
      description: 'Velvety roasted butternut squash and pumpkin soup topped with toasted spiced pumpkin seeds and coconut cream swirl.',
      price: 28.0,
      netPrice: 24.0,
      imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=600&h=400&fit=crop&q=80',
      isVeg: true,
      kdsStation: 'HOT',
    },
  ]

  for (const item of itemsData) {
    const category = categoryMap[item.categoryName] || Object.values(categoryMap)[0]
    let existing = await prisma.menuItem.findFirst({
      where: { category: { restaurantId: restaurant.id }, name: item.name },
    })

    if (!existing) {
      await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          netPrice: item.netPrice,
          taxRate: 0.1,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          kdsStation: item.kdsStation,
          isAvailable: true,
        },
      })
    } else {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          description: item.description,
          price: item.price,
          netPrice: item.netPrice,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          kdsStation: item.kdsStation,
        },
      })
    }
  }
  console.log('Items seeded/updated successfully.')

  // 3. Seed Addons (Matching Image 4)
  const addonsData = [
    { parentItem: 'Pizza', name: 'Extra Cheese', price: 10.0, status: 'ACTIVE' },
    { parentItem: 'Sauce', name: 'Garlic Butter Sauce', price: 5.0, status: 'ACTIVE' },
    { parentItem: 'Sea Food', name: 'Grilled Shrimp', price: 20.0, status: 'ACTIVE' },
    { parentItem: 'Salad', name: 'Avocado Slices', price: 5.0, status: 'ACTIVE' },
    { parentItem: 'Sauce', name: 'Spicy Mayo', price: 10.0, status: 'ACTIVE' },
    { parentItem: 'Topping', name: 'Crispy Bacon Bits', price: 5.0, status: 'ACTIVE' },
    { parentItem: 'Side Dish', name: 'Side Fries', price: 10.0, status: 'ACTIVE' },
    { parentItem: 'Topping', name: 'Guacamole', price: 12.0, status: 'ACTIVE' },
    { parentItem: 'Sauce', name: 'Extra Dressing', price: 15.0, status: 'ACTIVE' },
  ]

  for (const addon of addonsData) {
    const existing = await prisma.menuAddon.findFirst({
      where: { restaurantId: restaurant.id, parentItem: addon.parentItem, name: addon.name },
    })
    if (!existing) {
      await prisma.menuAddon.create({
        data: {
          restaurantId: restaurant.id,
          parentItem: addon.parentItem,
          name: addon.name,
          price: addon.price,
          status: addon.status,
        },
      })
    } else {
      await prisma.menuAddon.update({
        where: { id: existing.id },
        data: { price: addon.price, status: addon.status },
      })
    }
  }
  console.log('Addons seeded/updated successfully.')

  // 4. Seed Coupons with Loyalty Points Integration (Matching Image 5)
  const couponsData = [
    {
      code: 'SEAFOOD10',
      validCategory: 'Sea Foods',
      discountType: 'PERCENTAGE',
      discountAmount: 10.0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
      pointsCost: 100, // 100 loyalty points required
      pointsReward: 20,
    },
    {
      code: 'PIZZA20',
      validCategory: 'Pizza Orders',
      discountType: 'FIXED',
      discountAmount: 20.0,
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-11-20'),
      status: 'ACTIVE',
      pointsCost: 150, // 150 loyalty points required
      pointsReward: 30,
    },
    {
      code: 'SALAD15',
      validCategory: 'Salads',
      discountType: 'PERCENTAGE',
      discountAmount: 15.0,
      startDate: new Date('2026-03-22'),
      endDate: new Date('2026-11-25'),
      status: 'ACTIVE',
      pointsCost: 80, // 80 loyalty points required
      pointsReward: 15,
    },
    {
      code: 'TACO5',
      validCategory: 'Salads',
      discountType: 'PERCENTAGE',
      discountAmount: 5.0,
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-10-10'),
      status: 'EXPIRED',
      pointsCost: 50,
      pointsReward: 10,
    },
    {
      code: 'WEEKEND25',
      validCategory: 'All Categories',
      discountType: 'PERCENTAGE',
      discountAmount: 25.0,
      startDate: new Date('2026-05-03'),
      endDate: new Date('2026-11-13'),
      status: 'ACTIVE',
      pointsCost: 200, // 200 loyalty points required
      pointsReward: 50,
    },
    {
      code: 'COMBO50',
      validCategory: 'Combo Meals',
      discountType: 'PERCENTAGE',
      discountAmount: 5.0,
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-12-20'),
      status: 'ACTIVE',
      pointsCost: 50,
      pointsReward: 10,
    },
    {
      code: 'HOLIDAY30',
      validCategory: 'All Categories',
      discountType: 'FIXED',
      discountAmount: 30.0,
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-12-15'),
      status: 'ACTIVE',
      pointsCost: 250, // 250 loyalty points required
      pointsReward: 60,
    },
    {
      code: 'SWEET10',
      validCategory: 'Desserts',
      discountType: 'PERCENTAGE',
      discountAmount: 10.0,
      startDate: new Date('2026-08-18'),
      endDate: new Date('2026-12-25'),
      status: 'ACTIVE',
      pointsCost: 75,
      pointsReward: 15,
    },
    {
      code: 'FAMILYFEAST',
      validCategory: 'All Categories',
      discountType: 'FIXED',
      discountAmount: 100.0,
      startDate: new Date('2026-09-04'),
      endDate: new Date('2026-10-10'),
      status: 'EXPIRED',
      pointsCost: 500,
      pointsReward: 100,
    },
  ]

  for (const coupon of couponsData) {
    const existing = await prisma.coupon.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code: coupon.code,
        },
      },
    })
    if (!existing) {
      await prisma.coupon.create({
        data: {
          restaurantId: restaurant.id,
          ...coupon,
        },
      })
    } else {
      await prisma.coupon.update({
        where: { id: existing.id },
        data: coupon,
      })
    }
  }
  console.log('Coupons seeded/updated successfully.')
  console.log('All menu management demo data ready!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
