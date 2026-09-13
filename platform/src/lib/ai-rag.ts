import { prisma } from '@/lib/prisma'

export interface RagDocument {
  id: string
  title: string
  category: 'MENU_ITEM' | 'RECIPE_ALLERGEN' | 'PAIRING' | 'RESTAURANT_FAQ' | 'SAAS_GUIDE'
  content: string
  metadata: {
    menuItemId?: string
    price?: number
    isVeg?: boolean
    is86d?: boolean
    allergens?: string[]
    dietaryTags?: string[]
    pairingSuggestions?: string[]
    categoryName?: string
  }
}

// ─── Default Restaurant FAQs & Sommelier Knowledge Base ───────────────────────

const STATIC_RESTAURANT_FAQS: RagDocument[] = [
  {
    id: 'faq-hours',
    title: 'Hours of Operation & Dining Times',
    category: 'RESTAURANT_FAQ',
    content: 'Open daily: Lunch served from 11:30 AM to 3:00 PM. Dinner served from 5:00 PM to 11:00 PM. Late-night drinks and bar bites available until 1:00 AM on Friday and Saturday.',
    metadata: {},
  },
  {
    id: 'faq-reservations',
    title: 'Reservation & Cancellation Policy',
    category: 'RESTAURANT_FAQ',
    content: 'Reservations are accepted online via our website, table QR code, or by phone. Parties of 6 or more are held with a 15-minute grace period. Walk-ins are always welcomed on our live digital waitlist.',
    metadata: {},
  },
  {
    id: 'faq-dresscode-parking',
    title: 'Dress Code & Parking Information',
    category: 'RESTAURANT_FAQ',
    content: 'Dress code is smart casual. Complimentary valet parking is available at the main entrance starting at 6:00 PM Thursday through Sunday. Public parking garages are located within 1 block.',
    metadata: {},
  },
  {
    id: 'faq-payment-wifi',
    title: 'Accepted Payment Methods & Guest Wi-Fi',
    category: 'RESTAURANT_FAQ',
    content: 'We accept all major credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and Cash. Split checks are welcomed on the POS or digital tab. Free high-speed guest Wi-Fi network: "Resto-Guest", no password required.',
    metadata: {},
  },
  {
    id: 'pairing-guide-wine',
    title: 'Sommelier Wine & Beverage Pairing Rules',
    category: 'PAIRING',
    content: `Recommended pairings:
- Prime Steaks, Ribeye, Wagyu: Full-bodied red wine such as Cabernet Sauvignon, Malbec, or Bordeaux.
- Seafood, Salmon, Lobster, Oysters: Crisp dry white wine such as Chablis, Sancerre, Sauvignon Blanc, or Brut Champagne.
- Truffle Pasta, Risotto, Mushrooms: Earthy Pinot Noir, Nebbiolo, or oaked Chardonnay.
- Spicy dishes, curries, rich glazes: Off-dry Riesling, aromatic Gewürztraminer, or crisp craft IPA.
- Decadent Chocolate & Molten Cakes: Ruby Port, Espresso Martini, or Stout.`,
    metadata: {},
  },
]

const STATIC_SAAS_GUIDES: RagDocument[] = [
  {
    id: 'saas-split-check',
    title: 'How to Split a Check on the POS',
    category: 'SAAS_GUIDE',
    content: 'To split a bill on the POS Terminal: 1) Open the active table order. 2) Tap the "Split Check" button at the bottom of the check summary. 3) Choose between "Split Evenly" (2, 3, 4+ ways) or "Split by Seat / Item". 4) Collect payments individually per split tender.',
    metadata: {},
  },
  {
    id: 'saas-86-item',
    title: 'How to 86 an Item Across POS & Menus',
    category: 'SAAS_GUIDE',
    content: 'To 86 an item: 1) In the POS, long-press the item card or toggle "86 Mode". 2) Alternatively, ask RestoIQ: "86 [Item Name]". 3) In Dashboard, navigate to Menu -> Toggle availability. This immediately marks the dish unavailable across POS, digital QR menus, and online delivery.',
    metadata: {},
  },
  {
    id: 'saas-kds-stations',
    title: 'How KDS Kitchen Stations Work',
    category: 'SAAS_GUIDE',
    content: 'Kitchen tickets route automatically by item station category: HOT (Grill/Oven), COLD (Salads/Appetizers), BAR (Cocktails/Beverages), EXPO (Final assembly & pass). Cook times are tracked live. Tickets over 15 minutes trigger a yellow alert; over 20 minutes turn flashing red.',
    metadata: {},
  },
  {
    id: 'saas-floor-plan',
    title: 'How to Manage Tables and Floor Plan',
    category: 'SAAS_GUIDE',
    content: 'Navigate to Dashboard -> Floor & Tables. Click the gear icon to switch between floors (1st Floor, 2nd Floor, Patio), add custom tables with shapes (square, round, rectangle), set seat capacities, and drag tables into layout coordinates.',
    metadata: {},
  },
  {
    id: 'saas-z-report',
    title: 'How to Run End-of-Day Z-Report and Cash Out',
    category: 'SAAS_GUIDE',
    content: 'To run a Z-Report at shift close: Go to Dashboard -> Reports -> Sales. Click "Generate Z-Report". It calculates total net sales, sales tax, tip totals, cash expected vs actual, card gateway batch totals, and discounts/voids with full audit trail.',
    metadata: {},
  },
]

// ─── Dynamic Database Ingestion for Menu & Recipes ───────────────────────────

export async function buildDynamicRagDocuments(locationId?: string): Promise<RagDocument[]> {
  try {
    const categoryFilter = locationId
      ? { OR: [{ locationId }, { locationId: null }], isActive: true }
      : { isActive: true }

    let menuItems = await prisma.menuItem.findMany({
      where: {
        category: categoryFilter,
      },
      include: {
        category: { select: { name: true } },
        modifiers: { include: { options: true } },
        recipeItems: {
          include: {
            inventoryItem: { select: { name: true, unit: true } },
          },
        },
      },
    })

    // Fallback: If no items found with category filter, fetch all active menu items
    if (menuItems.length === 0) {
      menuItems = await prisma.menuItem.findMany({
        include: {
          category: { select: { name: true } },
          modifiers: { include: { options: true } },
          recipeItems: {
            include: {
              inventoryItem: { select: { name: true, unit: true } },
            },
          },
        },
      })
    }

    const dynamicDocs: RagDocument[] = []

    for (const item of menuItems) {
      const categoryName = item.category?.name || 'General'
      const ingredients = item.recipeItems.map((r) => r.inventoryItem.name)
      const modifierSummary = item.modifiers
        .map((m) => `${m.name}: [${m.options.map((o) => `${o.name}${Number(o.priceAdjustment) > 0 ? ` (+$${o.priceAdjustment})` : ''}`).join(', ')}]`)
        .join('; ')

      // Determine allergen & dietary cues
      const textCorpus = `${item.name} ${item.description || ''} ${ingredients.join(' ')}`.toLowerCase()
      const allergens: string[] = []
      if (textCorpus.includes('peanut') || textCorpus.includes('almond') || textCorpus.includes('walnut') || textCorpus.includes('nut')) allergens.push('Tree Nuts / Peanuts')
      if (textCorpus.includes('milk') || textCorpus.includes('cream') || textCorpus.includes('butter') || textCorpus.includes('cheese') || textCorpus.includes('parmesan')) allergens.push('Dairy')
      if (textCorpus.includes('wheat') || textCorpus.includes('flour') || textCorpus.includes('bread') || textCorpus.includes('pasta')) allergens.push('Gluten')
      if (textCorpus.includes('shrimp') || textCorpus.includes('lobster') || textCorpus.includes('crab') || textCorpus.includes('prawn') || textCorpus.includes('oyster') || textCorpus.includes('calamari')) allergens.push('Shellfish')
      if (textCorpus.includes('egg')) allergens.push('Eggs')
      if (textCorpus.includes('soy')) allergens.push('Soy')

      const dietaryTags: string[] = []
      if (item.isVeg) dietaryTags.push('Vegetarian')
      if (item.isVeg && !allergens.includes('Dairy') && !allergens.includes('Eggs')) dietaryTags.push('Vegan')
      if (!allergens.includes('Gluten')) dietaryTags.push('Gluten-Free')
      if (!allergens.includes('Shellfish') && !textCorpus.includes('pork') && !textCorpus.includes('bacon')) dietaryTags.push('Halal-Friendly')

      // Culinary pairings
      const pairingSuggestions: string[] = []
      if (textCorpus.includes('steak') || textCorpus.includes('beef') || textCorpus.includes('burger')) pairingSuggestions.push('Cabernet Sauvignon', 'Old Fashioned', 'Truffle Fries')
      if (textCorpus.includes('salmon') || textCorpus.includes('seafood') || textCorpus.includes('fish') || textCorpus.includes('shrimp')) pairingSuggestions.push('Sauvignon Blanc', 'Chardonnay', 'Sparkling Water with Lime')
      if (textCorpus.includes('pasta') || textCorpus.includes('risotto') || textCorpus.includes('truffle')) pairingSuggestions.push('Pinot Noir', 'Chianti Classico', 'Garlic Bread')
      if (textCorpus.includes('cake') || textCorpus.includes('dessert') || textCorpus.includes('chocolate')) pairingSuggestions.push('Espresso Martini', 'Late Harvest Riesling', 'Cappuccino')

      const docContent = [
        `Dish: ${item.name}`,
        `Category: ${categoryName}`,
        `Price: $${Number(item.price).toFixed(2)}`,
        `Availability: ${item.is86d ? 'OUT OF STOCK (86d)' : 'Available for ordering'}`,
        item.description ? `Description: ${item.description}` : null,
        ingredients.length > 0 ? `Key Ingredients: ${ingredients.join(', ')}` : null,
        dietaryTags.length > 0 ? `Dietary Classifications: ${dietaryTags.join(', ')}` : null,
        allergens.length > 0 ? `Allergens Present: ${allergens.join(', ')}` : 'Allergens: None declared',
        modifierSummary ? `Customization Modifiers: ${modifierSummary}` : null,
        pairingSuggestions.length > 0 ? `Recommended Pairings: ${pairingSuggestions.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      dynamicDocs.push({
        id: `item-${item.id}`,
        title: item.name,
        category: 'MENU_ITEM',
        content: docContent,
        metadata: {
          menuItemId: item.id,
          price: Number(item.price),
          isVeg: item.isVeg,
          is86d: item.is86d,
          allergens,
          dietaryTags,
          pairingSuggestions,
          categoryName,
        },
      })
    }

    return [...dynamicDocs, ...STATIC_RESTAURANT_FAQS, ...STATIC_SAAS_GUIDES]
  } catch (err) {
    console.error('[buildDynamicRagDocuments] Failed to fetch menu data:', err)
    return [...STATIC_RESTAURANT_FAQS, ...STATIC_SAAS_GUIDES]
  }
}

// ─── Semantic Hybrid Search & Retrieval Algorithm ────────────────────────────

function calculateSimilarityScore(query: string, doc: RagDocument): number {
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  if (qTokens.length === 0) return 0

  const contentLower = `${doc.title} ${doc.content}`.toLowerCase()
  let score = 0

  // 1. Exact title match boost
  if (doc.title.toLowerCase().includes(query.toLowerCase())) {
    score += 15
  }

  // 2. Token overlap score
  for (const token of qTokens) {
    if (doc.title.toLowerCase().includes(token)) {
      score += 6
    }
    const occurrences = (contentLower.match(new RegExp(token, 'g')) || []).length
    score += Math.min(occurrences * 1.5, 6)
  }

  // 3. Category & Dietary context boosters
  const q = query.toLowerCase()
  if (q.includes('vegan') && doc.metadata.dietaryTags?.includes('Vegan')) score += 8
  if (q.includes('vegetarian') && (doc.metadata.isVeg || doc.metadata.dietaryTags?.includes('Vegetarian'))) score += 8
  if ((q.includes('gluten') || q.includes('celiac')) && doc.metadata.dietaryTags?.includes('Gluten-Free')) score += 8
  if (q.includes('allergy') || q.includes('allergic')) {
    if (doc.category === 'MENU_ITEM' && (doc.metadata.allergens?.length || 0) > 0) score += 5
  }
  if (q.includes('wine') || q.includes('pair') || q.includes('drink') || q.includes('cocktail')) {
    if (doc.category === 'PAIRING' || (doc.metadata.pairingSuggestions?.length || 0) > 0) score += 7
  }
  if (q.includes('hours') || q.includes('open') || q.includes('park') || q.includes('reserve') || q.includes('policy')) {
    if (doc.category === 'RESTAURANT_FAQ') score += 10
  }
  if (q.includes('split') || q.includes('pos') || q.includes('kds') || q.includes('z-report') || q.includes('how to')) {
    if (doc.category === 'SAAS_GUIDE') score += 10
  }

  // 4. Availability penalty if item is 86'd
  if (doc.metadata.is86d) {
    score -= 2
  }

  return score
}

/**
 * Retrieve the most relevant RAG context documents for ANY query
 */
export async function retrieveRagContext(
  query: string,
  locationId?: string,
  limit: number = 5,
  mode: 'customer' | 'operator' = 'customer'
): Promise<{
  documents: RagDocument[]
  contextText: string
  actionableDishCards: Array<{
    id: string
    name: string
    price: number
    category: string
    is86d: boolean
    dietary: string[]
  }>
}> {
  const allDocs = await buildDynamicRagDocuments(locationId)

  // Filter docs if customer mode (customers don't need internal SaaS guides)
  const filteredDocs = mode === 'customer'
    ? allDocs.filter((d) => d.category !== 'SAAS_GUIDE')
    : allDocs

  const scoredDocs = filteredDocs
    .map((doc) => ({
      doc,
      score: calculateSimilarityScore(query, doc),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.doc)

  const selectedDocs = scoredDocs.length > 0 ? scoredDocs : allDocs.slice(0, 3)

  const contextText = selectedDocs
    .map((d, idx) => `[DOCUMENT ${idx + 1}: ${d.title} (${d.category})]\n${d.content}`)
    .join('\n\n')

  const actionableDishCards = selectedDocs
    .filter((d) => d.category === 'MENU_ITEM' && d.metadata.menuItemId)
    .map((d) => ({
      id: d.metadata.menuItemId!,
      name: d.title,
      price: d.metadata.price || 0,
      category: d.metadata.categoryName || 'Dishes',
      is86d: !!d.metadata.is86d,
      dietary: d.metadata.dietaryTags || [],
    }))

  return {
    documents: selectedDocs,
    contextText,
    actionableDishCards,
  }
}
