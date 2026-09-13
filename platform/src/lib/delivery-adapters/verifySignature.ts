// src/lib/delivery-adapters/verifySignature.ts
import crypto from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Validates HMAC‑SHA256 signature for delivery platform webhooks.
 * Returns { isValid, reason } where reason is optional diagnostic.
 */
export function verifyDeliverySignature(
  req: NextRequest,
  platform: string,
  rawBodyText: string
): { isValid: boolean; reason?: string } {
  let secret: string | undefined;
  let signatureHeader: string | null = null;

  if (platform === 'doordash') {
    secret = process.env.DOORDASH_WEBHOOK_SECRET || process.env.DELIVERY_WEBHOOK_SECRET;
    signatureHeader = req.headers.get('x-doordash-signature') || req.headers.get('x-signature');
  } else if (platform === 'ubereats') {
    secret = process.env.UBEREATS_WEBHOOK_SECRET || process.env.DELIVERY_WEBHOOK_SECRET;
    signatureHeader = req.headers.get('x-uber-signature') || req.headers.get('x-signature');
  } else if (platform === 'urbanpiper' || platform === 'zomato' || platform === 'swiggy') {
    secret = process.env.URBANPIPER_WEBHOOK_SECRET || process.env.DELIVERY_WEBHOOK_SECRET;
    signatureHeader = req.headers.get('x-urbanpiper-signature') || req.headers.get('x-signature');
  } else {
    secret = process.env.DELIVERY_WEBHOOK_SECRET;
    signatureHeader = req.headers.get('x-webhook-signature') || req.headers.get('x-signature');
  }

  if (!secret) {
    console.warn(`[Delivery Webhook] ${platform} webhook secret not configured. Skipping HMAC check in dev.`);
    return { isValid: true };
  }

  if (!signatureHeader) {
    return { isValid: false, reason: 'Missing signature header' };
  }

  try {
    const computed = crypto.createHmac('sha256', secret).update(rawBodyText).digest('hex');
    const cleanHeader = signatureHeader.replace(/^sha256=/i, '').trim();
    const isMatch = crypto.timingSafeEqual(Buffer.from(computed, 'utf-8'), Buffer.from(cleanHeader, 'utf-8'));
    return { isValid: isMatch, reason: isMatch ? undefined : 'Signature mismatch' };
  } catch (err: any) {
    console.error('[Delivery Webhook] Verification error:', err);
    return { isValid: false, reason: 'Verification failure' };
  }
}
