import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const ai = read('src/app/api/ai/route.ts')
const agent = read('src/app/api/ai/agent/chat/route.ts')
const delivery = read('src/lib/delivery-adapters/verifySignature.ts')
const print = read('src/app/api/print/escpos/route.ts')
const inventory = read('src/app/api/inventory/adjust/route.ts')
const orders = read('src/app/api/orders/[id]/route.ts')
const locationResolver = read('src/lib/location-resolver.ts')
const billingActivate = read('src/app/api/billing/activate/route.ts')
const geo = read('src/lib/geo.ts')
const inventoryExport = read('src/app/api/inventory/export/route.ts')
const customerRoute = read('src/app/api/customers/[id]/route.ts')
const privacyPolicy = read('src/app/privacy/page.tsx')

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

// [HIGH-01] IDOR Prevention in Orders API: no unscoped findUnique fallback
assert.doesNotMatch(orders, /return prisma\.order\.findUnique/)
assert.match(orders, /if \(!restaurantId\) return null/)

// [HIGH-02] No Cross-Tenant findFirst fallbacks
assert.doesNotMatch(locationResolver, /prisma\.restaurant\.findFirst/)

// [HIGH-03] Billing lockdown against self-service Enterprise upgrades
assert.doesNotMatch(billingActivate, /!\['ADMIN',\s*'OWNER'\]\.includes\(session\.user\.role\)/)
assert.match(billingActivate, /INTERNAL_ADMIN_SECRET/)

// [MED-01] Geofenced attendance hardening: missing user GPS fails bounds check
assert.match(geo, /if \(userLat == null \|\| userLng == null\)\s*\{\s*return \{ inBounds: false/)

// [LOW-01] CSV formula injection sanitization
assert.match(inventoryExport, /\/\^\[=\+\\-@\\t\\r\]\//)

// [MED-03] DPDP Act 2023 & GDPR Statutory Erasure
assert.match(customerRoute, /Statutory Right to Erasure/)
assert.match(customerRoute, /export async function DELETE/)
assert.match(privacyPolicy, /Digital Personal Data Protection \(DPDP\) Act, 2023/)

console.log('Emergency and pre-production security regression checks passed.')
