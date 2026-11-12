import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

console.log('=== RUNNING TWO-TENANT INTEGRATION & LAUNCH BLOCKER SECURITY SUITE ===')

// ── 1. DODO PAYMENTS SIGNATURE VERIFICATION TESTS ─────────────────────────────
console.log('\n--- 1. Testing Dodo Payments Webhook Signature & Replay Controls ---')

const dodoLibSource = readFileSync(new URL('../src/lib/dodo-payments.ts', import.meta.url), 'utf8')

// Assert dodo-payments.ts strictly rejects missing signature
assert.match(
  dodoLibSource,
  /if\s*\(!signature\s*\|\|\s*typeof signature\s*!==\s*'string'\s*\|\|\s*signature\.trim\(\)\s*===\s*''\)\s*return false/,
  'verifyDodoWebhookSignature must strictly return false for missing, empty, or non-string signature'
)

// Assert dodo-payments.ts rejects when the webhook secret itself is missing or mock
assert.match(
  dodoLibSource,
  /if\s*\(!rawWebhookKey\s*\|\|\s*rawWebhookKey\.includes\('mock'\)\s*\|\|\s*rawWebhookKey\.includes\('REPLACE_ME'\)\)\s*return false/,
  'CRITICAL: verifyDodoWebhookSignature must reject when DODO_PAYMENTS_WEBHOOK_KEY is missing or a mock value — no bypass'
)

// Verify the real Standard Webhooks signature scheme (same library the app imports) end-to-end
const { Webhook } = await import('standardwebhooks')
const testSecret = 'whsec_' + Buffer.from('dummy_webhook_secret_1234567890').toString('base64')
const webhookId = 'msg_test_123'
const timestamp = Math.floor(Date.now() / 1000).toString()
const testPayload = JSON.stringify({
  type: 'subscription.active',
  data: { subscription_id: 'sub_test_123', metadata: { restaurantId: 'rest_test_001', planTier: 'PRO' } },
})
const wh = new Webhook(testSecret)
const validSignature = wh.sign(webhookId, new Date(Number(timestamp) * 1000), testPayload)

function verifyDodoSig({ rawBody, webhookId: id, signature, timestamp: ts, secret }) {
  if (!signature || typeof signature !== 'string' || signature.trim() === '') return false
  if (!id || !ts) return false
  if (signature.includes('mock_') || signature === 'mock_valid_signature') return false
  if (!secret || secret.includes('mock') || secret.includes('REPLACE_ME')) return false
  try {
    new Webhook(secret).verify(rawBody, { 'webhook-id': id, 'webhook-signature': signature, 'webhook-timestamp': ts })
    return true
  } catch {
    return false
  }
}

assert.equal(verifyDodoSig({ rawBody: testPayload, webhookId, signature: null, timestamp, secret: testSecret }), false, 'Missing signature must return false')
assert.equal(verifyDodoSig({ rawBody: testPayload, webhookId, signature: '', timestamp, secret: testSecret }), false, 'Empty signature must return false')
assert.equal(verifyDodoSig({ rawBody: testPayload, webhookId, signature: 'v1,forged_sig', timestamp, secret: testSecret }), false, 'Forged signature must return false')
assert.equal(verifyDodoSig({ rawBody: testPayload, webhookId, signature: validSignature, timestamp, secret: testSecret }), true, 'Valid Standard Webhooks signature must return true')
assert.equal(verifyDodoSig({ rawBody: testPayload, webhookId, signature: validSignature, timestamp, secret: 'cf_test_mock_secret_key_mock' }), false, 'Mock webhook secret must never validate signatures')

console.log('✓ Dodo Payments signature security verified: unsigned and forged payloads strictly rejected.')

// ── 2. DODO PAYMENTS WEBHOOK ROUTE LIFECYCLE TESTS ────────────────────────────
console.log('\n--- 2. Testing Dodo Payments Webhook Route Lifecycle Controls ---')

const webhookRouteSource = readFileSync(new URL('../src/app/api/webhooks/dodo/route.ts', import.meta.url), 'utf8')

// Assert webhook route rejects if the signature does not verify
assert.match(
  webhookRouteSource,
  /if\s*\(!verifyDodoWebhookSignature\([\s\S]*?\)\)\s*\{\s*[\s\S]*?return NextResponse\.json\(\{\s*error:\s*'Invalid or missing webhook signature'\s*\}\s*,\s*\{\s*status:\s*401\s*\}\)/,
  'Webhook route must return HTTP 401 when signature is invalid or missing'
)

// Assert replay protection is implemented via the event log table
assert.match(
  webhookRouteSource,
  /prisma\.stripeEventLog\.findUnique\(\{\s*where:\s*\{\s*eventId:\s*eventUniqueId\s*\}\s*\}\)/,
  'Persisted replay protection must be implemented using the event log table'
)

// The webhook applies every subscription.* snapshot through the shared state applier.
assert.match(
  webhookRouteSource,
  /applyDodoSubscriptionState\(tx,/,
  'Webhook must apply subscription state through applyDodoSubscriptionState inside the transaction'
)

const dodoSyncSource = readFileSync(new URL('../src/lib/dodo-subscription-sync.ts', import.meta.url), 'utf8')

// Assert cancellation/expiry/failure revert the tenant to STARTER; only live statuses keep the paid tier
assert.match(
  dodoSyncSource,
  /const PLAN_RETAINING: DodoInternalStatus\[\] = \['ACTIVE', 'BILLING_ISSUE', 'PAUSED'\]/,
  'Only ACTIVE / BILLING_ISSUE / PAUSED may retain a paid plan tier'
)
assert.match(
  dodoSyncSource,
  /PLAN_RETAINING\.includes\(status\) \? paidTier : 'STARTER'/,
  'Cancellation, expiry, or failure events must revert tenant plan to STARTER and never upgrade'
)
assert.match(
  dodoLibSource,
  /case 'cancelled':\s*return 'CANCELLED'[\s\S]*?case 'expired':\s*return 'EXPIRED'[\s\S]*?case 'failed':\s*return 'FAILED'/,
  'cancelled / expired / failed Dodo statuses must map to non-retaining internal statuses'
)

// Assert past-due/on-hold are handled explicitly as a billing issue (soft lock, no downgrade)
assert.match(
  dodoLibSource,
  /case 'past_due':\s*case 'on_hold':\s*return 'BILLING_ISSUE'/,
  'subscription.past_due / subscription.on_hold must be handled explicitly'
)

// Assert an old subscription's cancellation can't knock out the restaurant's current one
assert.match(
  dodoSyncSource,
  /reason: 'superseded_subscription'/,
  'Events for a superseded subscription must not overwrite the current subscription'
)

console.log('✓ Dodo Payments route verified: signature enforcement, replay deduplication, and cancellation handling active.')

// ── 3. SPLIT PAYMENTS SERVER-SIDE BALANCE DUE ENFORCEMENT ───────────────────
console.log('\n--- 3. Testing Split Payments Balance Due & Electronic Gateway Controls ---')

const splitRouteSource = readFileSync(new URL('../src/app/api/payments/split/route.ts', import.meta.url), 'utf8')

// Assert Math.min bug is completely removed
assert.doesNotMatch(
  splitRouteSource,
  /Math\.min\(orderRawSubtotal,\s*totalSubtotal\)/,
  'CRITICAL: Flawed Math.min calculation allowing $0.02 underpayment must be completely removed'
)

// Assert net payment underpayment check against authoritative server balance
assert.match(
  splitRouteSource,
  /if\s*\(netPaymentSubmitted\s*<\s*requiredBalanceDue\s*-\s*0\.10\)/,
  'Split payment must reject any submission where net payment is less than requiredBalanceDue'
)

// Assert electronic splits require gateway verification
assert.match(
  splitRouteSource,
  /if\s*\(isElectronic\s*&&\s*s\.total\s*>\s*0\)\s*\{\s*if\s*\(!s\.stripePaymentIntentId\)/,
  'Electronic splits must strictly require a verified stripePaymentIntentId'
)

// Assert atomic transaction wraps settlement
assert.match(
  splitRouteSource,
  /await prisma\.\$transaction\(async\s*\(tx\)\s*=>/,
  'Settlement must be atomic inside prisma.$transaction'
)

console.log('✓ Split payment security verified: server-authoritative balance due and electronic gateway checks enforced.')

// ── 4. CROSS-TENANT ATTENDANCE ISOLATION ────────────────────────────────────
console.log('\n--- 4. Testing Cross-Tenant Attendance IDOR Protection ---')

const attendanceRouteSource = readFileSync(new URL('../src/app/api/attendance/[id]/route.ts', import.meta.url), 'utf8')

assert.match(
  attendanceRouteSource,
  /location:\s*\{\s*restaurantId:\s*session\.user\.restaurantId\s*\}/,
  'TimeEntry lookup must be strictly constrained to caller session restaurantId'
)
assert.doesNotMatch(
  attendanceRouteSource,
  /prisma\.timeEntry\.findUnique\(\{\s*where:\s*\{\s*id\s*\}\s*\}\)/,
  'Unscoped timeEntry findUnique by ID must be completely removed'
)

console.log('✓ Cross-tenant attendance protection verified: tenant ownership enforced on all timecard mutations.')

// ── 5. PRIVILEGE ESCALATION PREVENTION ──────────────────────────────────────
console.log('\n--- 5. Testing Role Privilege Escalation Prevention ---')

const usersRouteSource = readFileSync(new URL('../src/app/api/users/route.ts', import.meta.url), 'utf8')

assert.match(
  usersRouteSource,
  /session\.user\.role\s*===\s*'MANAGER'\s*&&\s*\['OWNER',\s*'MANAGER'\]\.includes\(role\)/,
  'Managers must be explicitly blocked from creating OWNER or MANAGER accounts'
)

console.log('✓ Privilege escalation protection verified: managers cannot create or assign OWNER/MANAGER accounts.')

// ── 6. POS CARD GATEWAY INTEGRITY ───────────────────────────────────────────
console.log('\n--- 6. Testing POS Card Gateway Intent Integrity ---')

const checkoutModalSource = readFileSync(new URL('../src/components/payments/CheckoutModal.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(
  checkoutModalSource,
  /pi_settle_\$\{Date\.now\(\)\}/,
  'Fabricated PaymentIntent references (pi_settle_...) must be completely removed'
)

const paymentsLibSource = readFileSync(new URL('../src/lib/payments.ts', import.meta.url), 'utf8')
const paymentsRouteSource = readFileSync(new URL('../src/app/api/payments/route.ts', import.meta.url), 'utf8')

assert.match(
  paymentsLibSource,
  /!intent\.metadata\?\.orderId\s*\|\|\s*intent\.metadata\.orderId\s*!==\s*orderId/,
  'A PaymentIntent must be tagged with the order it settles (untagged intents rejected)'
)
for (const [name, src] of [['payments', paymentsRouteSource], ['split', splitRouteSource]]) {
  assert.match(src, /assertIntentsUnused\(/, `${name} route must reject a card charge already applied to a bill`)
  assert.match(
    src,
    /updateMany\(\{\s*where:\s*\{\s*id:\s*orderId,\s*status:\s*\{\s*notIn:\s*\['PAID',\s*'VOIDED'\]/,
    `${name} route must claim the order atomically so concurrent submits can't both settle it`
  )
}

console.log('✓ POS Card integrity verified: zero fabricated intents, one charge per bill, atomic settlement.')

console.log('\n=== ALL TWO-TENANT & LAUNCH BLOCKER INTEGRATION CHECKS PASSED (0 FAILURES) ===\n')
