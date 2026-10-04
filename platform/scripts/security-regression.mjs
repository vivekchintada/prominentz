import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const ai = read('src/app/api/ai/route.ts')
const agent = read('src/app/api/ai/agent/chat/route.ts')
const delivery = read('src/lib/delivery-adapters/verifySignature.ts')
const print = read('src/app/api/print/escpos/route.ts')
const inventory = read('src/app/api/inventory/adjust/route.ts')

for (const source of [ai, agent]) {
  assert.match(source, /Authentication required/)
  assert.match(source, /\['OWNER', 'MANAGER'\]\.includes\(session\.user\.role\)/)
  assert.doesNotMatch(source, /body\.mode\s*\|\|/)
  assert.match(source, /restaurantId:\s*session\.user\.restaurantId|const restaurantId = session\.user\.restaurantId/)
}

assert.match(delivery, /NODE_ENV === 'production'/)
assert.match(delivery, /Webhook verification is not configured/)
assert.doesNotMatch(print, /sendToNetworkPrinter\(/)
assert.match(print, /order\.table\.location\.restaurantId !== session\.user\.restaurantId/)
assert.match(inventory, /\['OWNER', 'MANAGER'\]\.includes\(session\.user\.role\)/)
assert.match(inventory, /location:\s*\{ restaurantId: session\.user\.restaurantId \}/)

console.log('Emergency security regression checks passed.')
