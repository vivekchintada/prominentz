// src/app/api/integrations/urbanpiper/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Returns whether the UrbanPiper integration is configured.
 * It is considered configured when at least one webhook secret is present.
 */
export async function GET() {
  const configured = !!(
    process.env.URBANPIPER_WEBHOOK_SECRET ||
    process.env.DELIVERY_WEBHOOK_SECRET
  );

  return NextResponse.json({ configured });
}
