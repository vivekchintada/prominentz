import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let val = match[2] || ''
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  })
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const IMAGE_MAP = [
  { match: /wagyu|ribeye|steak|beef|tenderloin/i, url: '/images/menu/hero_dish.png' },
  { match: /burger|cheeseburger/i, url: '/images/menu/hero_dish.png' },
  { match: /pasta|tagliolini|tagliatelle|linguine|risotto/i, url: '/images/menu/gallery_pasta.png' },
  { match: /burrata|caprese|prosciutto/i, url: '/images/menu/burrata_prosciutto.jpg' },
  { match: /arancini|bread|bruschetta/i, url: '/images/menu/gallery_bread.png' },
  { match: /calamari|squid/i, url: '/images/menu/calamari_fritti.jpg' },
  { match: /salmon|halibut|fish/i, url: '/images/menu/pan_seared_salmon.jpg' },
  { match: /tiramisu|brule|brûlée/i, url: '/images/menu/tiramisu_classic.jpg' },
  { match: /chocolate|fondant|mousse|dessert/i, url: '/images/menu/gallery_dessert.png' },
  { match: /fashioned|negroni|spritz|cocktail|wine|drink|beverage|lemonade|water/i, url: '/images/menu/gallery_drinks.png' },
]

async function run() {
  const items = await prisma.menuItem.findMany()
  console.log(`Updating ${items.length} menu items with premium image assets...`)

  for (const item of items) {
    let matchedUrl = '/images/menu/hero_dish.png'
    for (const rule of IMAGE_MAP) {
      if (rule.match.test(item.name) || rule.match.test(item.description || '')) {
        matchedUrl = rule.url
        break
      }
    }

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { imageUrl: matchedUrl }
    })
    console.log(`✓ ${item.name} -> ${matchedUrl}`)
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
