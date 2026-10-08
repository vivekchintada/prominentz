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
    if (process.env.NODE_ENV === 'production') {
      console.error(`[Delivery Webhook] ${platform} webhook secret is not configured.`);
      return { isValid: false, reason: 'Webhook verification is not configured' };
    }
    console.warn(`[Delivery Webhook] ${platform} webhook secret not configured. Skipping HMAC check in development.`);
    return { isValid: true };
  }

  if (!signatureHeader) {
    return { isValid: false, reason: 'Missing signature header' };
  }

  try {
    const computed = crypto.createHmac('sha256', secret).update(rawBodyText).digest('hex');
    const cleanHeader = signatureHeader.replace(/^sha256=/i, '').trim();
    const supplied = Buffer.from(cleanHeader, 'utf-8');
    const expected = Buffer.from(computed, 'utf-8');
    const isMatch = supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
    return { isValid: isMatch, reason: isMatch ? undefined : 'Signature mismatch' };
  } catch (err: unknown) {
    console.error('[Delivery Webhook] Verification error:', err);
    return { isValid: false, reason: 'Verification failure' };
  }
}
