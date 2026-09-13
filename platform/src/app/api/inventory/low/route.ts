import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Simple threshold: items with currentStock less than minStock (or default 5)
  const items = await prisma.inventoryItem.findMany({
    where: { minStock: { gt: 0 } },
    select: { id: true, name: true, currentStock: true, minStock: true },
  });
  const lowStock = items.filter(i => i.currentStock < i.minStock);
  return NextResponse.json(lowStock);
}
