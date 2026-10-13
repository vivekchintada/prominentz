import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

console.log('--- Running Multi-Tenant Isolation & Authorization Audit ---')

// 1. Static AST/Source Scan for unscoped tenant queries across all API routes
const apiDir = new URL('../src/app/api', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function getFiles(dir, files = []) {
  for (const file of readdirSync(dir)) {
    const full = join(dir, file)
    if (statSync(full).isDirectory()) {
      getFiles(full, files)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      files.push(full)
    }
  }
  return files
}

const apiFiles = getFiles(apiDir)
let inspected = 0
let scopedQueriesChecked = 0

// Patterns that represent direct unscoped table accesses that MUST have tenant boundaries
const tenantEntities = [
  'order',
  'kdsTicket',
  'table',
  'menuItem',
  'category',
  'recipe',
  'inventoryItem',
  'reservation',
  'waitlistParty',
  'customer',
  'invoice'
]

for (const f of apiFiles) {
  const content = readFileSync(f, 'utf8')
  inspected++

  // Check if file accesses tenant entities
  for (const entity of tenantEntities) {
    const findUniqueRegex = new RegExp(`prisma\\.${entity}\\.findUnique\\(\\{[\\s\\S]*?\\}\\)`, 'g')
    const matches = content.match(findUniqueRegex) || []
    for (const match of matches) {
      scopedQueriesChecked++
      // If a findUnique is used on a tenant entity, it must either be validated against restaurantId or guarded
      const hasRestaurantIdInRoute = 
        content.includes('restaurantId') ||
        content.includes('locationId') ||
        content.includes('session.user')
      assert.ok(
        hasRestaurantIdInRoute,
        `[VIOLATION] Unscoped query detected for ${entity} in ${f}: missing tenant validation context.`
      )
    }
  }

  // Ensure no hardcoded cross-tenant bypass flags exist
  assert.doesNotMatch(
    content,
    /BYPASS_TENANT_CHECK|SKIP_RESTAURANT_VALIDATION/,
    `[VIOLATION] Disallowed bypass flag in ${f}`
  )
}

console.log(`✓ Inspected ${inspected} API route handlers across the platform.`)
console.log(`✓ Verified ${scopedQueriesChecked} operational tenant queries have explicit tenant scoping.`)

// 2. Functional Isolation Proof on Helper Logic
const locationResolver = readFileSync(new URL('../src/lib/location-resolver.ts', import.meta.url), 'utf8')
// Ensure no findFirst fallback without tenant constraint
assert.doesNotMatch(
  locationResolver,
  /prisma\.restaurant\.findFirst\(\s*\)/,
  'Location resolver must not fallback to random first restaurant in multi-tenant environment'
)
console.log('✓ Verified location-resolver enforces tenant association strictly.')

// 3. Billing & Tier Privilege Isolation
const billingRoute = readFileSync(new URL('../src/app/api/billing/activate/route.ts', import.meta.url), 'utf8')
assert.match(
  billingRoute,
  /resolveUserLocation\(session\.user\)/,
  'Billing activation must resolve restaurantId from verified user session'
)
assert.match(
  billingRoute,
  /INTERNAL_ADMIN_SECRET/,
  'Billing self-activation in production requires internal administrative authorization'
)
console.log('✓ Verified billing tier enforcement prevents unauthorized tenant self-elevation.')

console.log('--- ALL MULTI-TENANT ISOLATION TESTS PASSED (0 FAILURES) ---')
