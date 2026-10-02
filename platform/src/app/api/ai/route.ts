import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import {
  getLiveOperations,
  getKitchenHealth,
  getInventoryHealth,
  getLaborHealth,
  getCrmAndReservations,
  execute86Action,
  executePrioritizeTicket,
  executeCompAction,
  AgentContext,
} from '@/lib/ai-agent'
import { retrieveRagContext } from '@/lib/ai-rag'

export const dynamic = 'force-dynamic'

interface AiActionRequest {
  prompt: string
  locationId?: string
  tableId?: string
  mode?: 'operator' | 'customer'
  currentPage?: string
}

/**
 * Call Llama 3.3 70B / 3.1 8B via Groq Cloud or Ollama with RAG & Telemetry Context
 */
async function callLlamaRagAi(params: {
  prompt: string
  systemPrompt: string
}): Promise<string | null> {
  const { prompt, systemPrompt } = params

  // 1. Try Groq Cloud (Llama-3.3-70b-versatile or Llama-3.1-8b-instant)
  const groqApiKey = process.env.GROQ_API_KEY
  if (groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 650,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const reply = data.choices?.[0]?.message?.content
        if (reply) return reply
      } else {
        // Fallback to 8b-instant if 70b hits rate limit
        const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        })
        if (fallbackRes.ok) {
          const data = await fallbackRes.json()
          const reply = data.choices?.[0]?.message?.content
          if (reply) return reply
        }
      }
    } catch (e) {
      console.warn('[Meta Resto IQ] Groq Llama call failed:', e)
    }
  }

  // 2. Try Local Ollama Instance (llama3.1:8b)
  try {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434'
    const res = await fetch(`${ollamaHost}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content
      if (reply) return reply
    }
  } catch (e) {}

  return null
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body: AiActionRequest = await req.json()
    const { prompt, currentPage, tableId } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const mode = body.mode || (session?.user ? 'operator' : 'customer')

    // Rate-limiting: max 40 requests per 60 seconds
    const clientIdentifier = session?.user?.id || req.headers.get('x-forwarded-for') || 'guest-ip'
    const rateLimitKey = `resto:ratelimit:ai:${clientIdentifier}`
    try {
      const currentRequests = await redis.incr(rateLimitKey)
      if (currentRequests === 1) await redis.expire(rateLimitKey, 60)
      if (currentRequests > 40) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment.' },
          { status: 429 }
        )
      }
    } catch {}

    // Resolve location ID
    let locationId = body.locationId
    let restaurantId = session?.user?.restaurantId || ''

    if (!locationId && session?.user) {
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id, isActive: true },
      })
      locationId = employee?.locationId
    }

    if (!locationId) {
      const firstLocation = await prisma.location.findFirst()
      locationId = firstLocation?.id || ''
      restaurantId = firstLocation?.restaurantId || ''
    }

    const agentCtx: AgentContext = {
      restaurantId,
      locationId,
      userId: session?.user?.id || 'guest',
      userName: session?.user?.name || (mode === 'customer' ? 'Valued Guest' : 'Manager'),
      userRole: session?.user?.role || 'SERVER',
    }

    const lowerPrompt = prompt.toLowerCase().trim()

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DIRECT FLOOR ACTIONS (Operator Mode Only)
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'operator') {
      // Action: 86 / Restore Menu Item
      if (/\b(86|un-86|restore)\b/i.test(prompt) && !prompt.toLowerCase().includes('how to')) {
        const is86ing = !lowerPrompt.includes('un-86') && !lowerPrompt.includes('restore')
        const targetName = prompt
          .replace(/\b86\b/gi, '')
          .replace(/un-86/gi, '')
          .replace(/restore/gi, '')
          .replace(/the/gi, '')
          .replace(/item/gi, '')
          .trim()

        if (targetName) {
          const result = await execute86Action(agentCtx, targetName, is86ing)
          return NextResponse.json({
            type: 'action',
            actionType: is86ing ? '86_ITEM' : 'RESTORE_ITEM',
            message: result.message,
            data: result,
          })
        }
      }

      // Action: Expedite / Prioritize KDS Ticket for a Table
      if (/\b(prioritize|rush|expedite)\b/i.test(prompt) && !prompt.toLowerCase().includes('how to')) {
        const tableMatch = prompt.match(/table\s*([a-zA-Z0-9_-]+)/i) || prompt.match(/\b([0-9]+)\b/)
        const tableIdStr = tableMatch ? tableMatch[1] : '1'

        const result = await executePrioritizeTicket(agentCtx, tableIdStr)
        return NextResponse.json({
          type: 'action',
          actionType: 'PRIORITIZE_TICKET',
          message: result.message,
          data: result,
        })
      }

      // Action: Apply Courtesy Comp / Discount
      if (/\b(comp|discount table)\b/i.test(prompt) && !prompt.toLowerCase().includes('how to')) {
        const tableMatch = prompt.match(/table\s*([a-zA-Z0-9_-]+)/i) || prompt.match(/\b([0-9]+)\b/)
        const tableIdStr = tableMatch ? tableMatch[1] : '1'
        const percentMatch = prompt.match(/(\d+)%/)
        const percent = percentMatch ? parseInt(percentMatch[1], 10) : 15

        const result = await executeCompAction(agentCtx, tableIdStr, percent, prompt)
        return NextResponse.json({
          type: 'action',
          actionType: 'APPLY_COMP',
          message: result.message,
          data: result,
        })
      }

      // Action: Draft Purchase Order
      if (/\b(draft po|create po|purchase order|order stock)\b/i.test(prompt) && !prompt.toLowerCase().includes('how to')) {
        const suppliers = await prisma.supplier.findMany({ where: { locationId } })
        if (suppliers.length === 0) {
          return NextResponse.json({
            type: 'message',
            message: 'No suppliers configured for this location yet. Please add a supplier in Inventory first.',
          })
        }
        const targetSupplier = suppliers.find((s) => lowerPrompt.includes(s.name.toLowerCase())) || suppliers[0]
        const poCount = await prisma.purchaseOrder.count({ where: { locationId } })
        const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(3, '0')}`

        const newPo = await prisma.purchaseOrder.create({
          data: {
            locationId,
            supplierId: targetSupplier.id,
            poNumber,
            status: 'DRAFT',
            notes: `Created via RestoIQ directive: "${prompt}"`,
          },
          include: { supplier: { select: { name: true } } },
        })

        return NextResponse.json({
          type: 'action',
          actionType: 'CREATE_PURCHASE_ORDER',
          message: `Drafted Purchase Order #${newPo.poNumber} for supplier "${newPo.supplier.name}".`,
          data: newPo,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PRODUCTION RAG RETRIEVAL (Menu, Allergens, Recipes, Pairings, FAQs)
    // ─────────────────────────────────────────────────────────────────────────
    const ragResult = await retrieveRagContext(prompt, locationId, 6, mode)

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TELEMETRY AGGREGATION (Live Operations Pulse)
    // ─────────────────────────────────────────────────────────────────────────
    let statsPills: { label: string; value: string }[] = []
    let liveTelemetryContext = ''

    if (mode === 'operator') {
      const [ops, kitchen, inventory, labor] = await Promise.all([
        getLiveOperations(agentCtx),
        getKitchenHealth(agentCtx),
        getInventoryHealth(agentCtx),
        getLaborHealth(agentCtx),
      ])

      statsPills = [
        { label: 'Live Sales', value: `$${ops.todayCompletedSales.toFixed(2)}` },
        { label: 'Active Queue', value: `${kitchen.activeQueueCount} Tickets` },
        { label: 'Labor %', value: `${labor.laborPercentage}%` },
        { label: 'Low Stock', value: `${inventory.criticalStockCount} Items` },
      ]

      liveTelemetryContext = `
REAL-TIME RESTAURANT TELEMETRY:
- Net Sales Today: $${ops.todayCompletedSales.toFixed(2)} (${ops.completedChecksCount} checks, avg $${ops.averageCheckSize})
- Seated Tables: ${ops.activeTablesCount} occupied tables (${ops.openTabsCount} open checks)
- Kitchen KDS Queue: ${kitchen.activeQueueCount} tickets active, ${kitchen.delayedTicketsCount} delayed >15 mins. Slowest station: ${kitchen.slowestStation?.station || 'Grill'}
- Staff & Labor: ${labor.currentlyClockedInCount} clocked in, labor is ${labor.laborPercentage}% of sales ($${labor.todayEstimatedLaborCost.toFixed(2)})
- Inventory Status: ${inventory.criticalStockCount} items below safety threshold. Currently 86'd: ${inventory.currently86dMenuCount} dishes.
Current User Screen: ${currentPage || 'Dashboard'}`
    } else {
      statsPills = [
        { label: 'Kitchen Speed', value: 'Normal (12m)' },
        { label: 'Specials Today', value: 'Chef Truffle Special' },
      ]
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. AUGMENTED SYSTEM PROMPT
    // ─────────────────────────────────────────────────────────────────────────
    const systemPrompt = `You are ProminentzIQ, the brilliant, conversational AI co-pilot for Prominentz.
Role: ${mode === 'customer' ? 'Michelin-Star Digital Sommelier & Guest Concierge' : 'Executive Restaurant General Manager & Operations Co-Pilot'}
Current Location: ${locationId}

${mode === 'customer'
  ? `CUSTOMER INSTRUCTIONS:
1. Answer ANY question asked by the guest warmly, knowledgeably, and accurately.
2. Address allergens, dietary safety (celiac, vegan, halal, nut allergies), ingredients, preparations, wine & drink pairings.
3. Recommend complementary dishes, sides, and beverages.
4. NEVER recommend an item marked 'OUT OF STOCK (86d)'. If an item is out of stock, politely inform the guest and suggest the best alternative.`
  : `OPERATOR INSTRUCTIONS:
1. Answer ANY question asked by the restaurant operator with authoritative, precise numbers and practical recommendations.
2. If asked about culinary recipes, ingredients, allergens, or pairings, use the retrieved documents.
3. If asked about platform workflows (how to split checks, how to 86, how to use KDS), guide them step-by-step.
4. If asked about revenue, labor %, or kitchen delays, reference the real-time telemetry.`
}

RETRIEVED KNOWLEDGE BASE (RAG DOCUMENTS):
${ragResult.contextText}
${liveTelemetryContext}

Provide a concise, engaging, and well-structured answer with markdown bullet points and bold highlights.`

    let aiMessage = await callLlamaRagAi({ prompt, systemPrompt })

    // Fallback synthesis if external LLM is offline
    if (!aiMessage) {
      if (mode === 'operator' && (lowerPrompt.includes('sales') || lowerPrompt.includes('revenue') || lowerPrompt.includes('labor') || lowerPrompt.includes('kds') || lowerPrompt.includes('kitchen') || lowerPrompt.includes('queue') || lowerPrompt.includes('stats'))) {
        aiMessage = `### 📊 Live Operations & Telemetry Briefing\n\n${liveTelemetryContext.trim()}\n\n*All restaurant systems operational.*`
      } else if (ragResult.documents.length > 0) {
        const topDoc = ragResult.documents[0]
        aiMessage = `**RestoIQ Insight regarding "${topDoc.title}":**\n\n${topDoc.content}\n\n*Feel free to ask for wine pairings, allergen details, or alternative dishes.*`
      } else {
        aiMessage = `I'm analyzing your inquiry. Our menu and operations are operating smoothly. How else can I assist with your table or order?`
      }
    }

    return NextResponse.json({
      type: 'intelligence',
      mode,
      message: aiMessage,
      stats: statsPills,
      actionableDishCards: ragResult.actionableDishCards,
      suggestedPills: mode === 'customer'
        ? ['🍷 What wine pairs with this?', '🌱 Show vegetarian dishes', '🌾 Any gluten-free options?', '🍰 What desserts are best?']
        : ['🍳 KDS bottleneck status', '💰 Today labor cost %', '📦 Critical low stock', '⚡ Prioritize Table 1'],
    })
  } catch (error) {
    console.error('[POST /api/ai]', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
