/**
 * Menu seed — adds sample categories and items to the Resto Fine Dining restaurant.
 * Run: node prisma/seed-menu.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load .env manually
try {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
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
  // Find the restaurant
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'resto-fine-dining' },
  })
  if (!restaurant) throw new Error('Restaurant not found. Run seed.js first.')

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Starters', displayOrder: 1 },
    { name: 'Mains', displayOrder: 2 },
    { name: 'Desserts', displayOrder: 3 },
    { name: 'Cocktails & Drinks', displayOrder: 4 },
  ]

  const createdCategories = {}
  for (const cat of categories) {
    const created = await prisma.menuCategory.upsert({
      where: { id: `seed-cat-${cat.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-cat-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        restaurantId: restaurant.id,
        name: cat.name,
        displayOrder: cat.displayOrder,
      },
    })
    createdCategories[cat.name] = created
    console.log(`Category: ${created.name}`)
  }

  // ── Menu Items ───────────────────────────────────────────────────────────────
  const items = [
    // Starters
    {
      category: 'Starters',
      items: [
        { name: 'Bruschetta al Pomodoro', description: 'Toasted sourdough, heirloom tomato, fresh basil, aged balsamic', price: 12.00, kdsStation: 'COLD', displayOrder: 1 },
        { name: 'Burrata & Prosciutto', description: 'Fresh burrata, San Daniele prosciutto, arugula, olive oil', price: 18.00, kdsStation: 'COLD', displayOrder: 2 },
        { name: 'French Onion Soup', description: 'Caramelised onion broth, gruyère crouton, fresh thyme', price: 14.00, kdsStation: 'HOT', displayOrder: 3 },
        { name: 'Calamari Fritti', description: 'Lightly fried squid, lemon aioli, cherry peppers', price: 16.00, kdsStation: 'HOT', displayOrder: 4 },
      ]
    },
    // Mains
    {
      category: 'Mains',
      items: [
        { name: 'Beef Tenderloin 8oz', description: 'Grass-fed fillet, truffle butter, roasted bone marrow jus', price: 52.00, kdsStation: 'HOT', displayOrder: 1 },
        { name: 'Pan-Seared Salmon', description: 'Atlantic salmon, saffron risotto, lemon caper beurre blanc', price: 38.00, kdsStation: 'HOT', displayOrder: 2 },
        { name: 'Wild Mushroom Risotto', description: 'Arborio rice, porcini, shiitake, parmesan, truffle oil', price: 28.00, kdsStation: 'HOT', displayOrder: 3 },
        { name: 'Duck Confit', description: 'Slow-cooked duck leg, cherry reduction, pomme purée, wilted greens', price: 42.00, kdsStation: 'HOT', displayOrder: 4 },
        { name: 'Lobster Linguine', description: 'Butter-poached lobster, cherry tomato, garlic, white wine, chilli', price: 46.00, kdsStation: 'HOT', displayOrder: 5 },
      ]
    },
    // Desserts
    {
      category: 'Desserts',
      items: [
        { name: 'Chocolate Fondant', description: 'Warm dark chocolate lava cake, vanilla bean ice cream', price: 14.00, kdsStation: 'HOT', displayOrder: 1 },
        { name: 'Crème Brûlée', description: 'Classic vanilla custard, caramelised sugar crust, fresh berries', price: 12.00, kdsStation: 'COLD', displayOrder: 2 },
        { name: 'Tiramisu', description: 'Savoiardi, mascarpone, espresso, cocoa dust', price: 13.00, kdsStation: 'COLD', displayOrder: 3 },
      ]
    },
    // Drinks
    {
      category: 'Cocktails & Drinks',
      items: [
        { name: 'Negroni', description: 'Campari, sweet vermouth, gin, orange twist', price: 16.00, kdsStation: 'BAR', displayOrder: 1 },
        { name: 'Aperol Spritz', description: 'Aperol, prosecco, soda, orange slice', price: 14.00, kdsStation: 'BAR', displayOrder: 2 },
        { name: 'Old Fashioned', description: 'Bourbon, angostura bitters, orange peel, demerara', price: 18.00, kdsStation: 'BAR', displayOrder: 3 },
        { name: 'House Sparkling Water', description: 'Still or sparkling, 750ml', price: 5.00, kdsStation: 'BAR', displayOrder: 4 },
      ]
    },
  ]

  for (const group of items) {
    const category = createdCategories[group.category]
    for (const item of group.items) {
      await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          kdsStation: item.kdsStation,
          displayOrder: item.displayOrder,
          taxRate: 0.08,
          isAvailable: true,
          is86d: false,
        },
      })
      console.log(`  ✓ ${item.name}`)
    }
  }

  console.log('\nMenu seed completed: 4 categories, 16 items.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
