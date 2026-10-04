import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
    if (!session?.user?.restaurantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
            if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                  }

                    const url = new URL(request.url);
                      const format = url.searchParams.get('format');

                        const start = new Date();
                          start.setHours(0, 0, 0, 0);
                            const end = new Date();
                              end.setHours(23, 59, 59, 999);

                                // Fetch orders completed today
                                  const orders = await prisma.order.findMany({
                                      where: {
                                            status: 'PAID',
                                                  createdAt: { gte: start, lte: end },
                                                        table: { location: { restaurantId: session.user.restaurantId } },
                                                            },
                                                                select: {
                                                                      id: true,
                                                                            total: true,
                                                                                  createdAt: true,
                                                                                      },
                                                                                        });

                                                                                          // Aggregate by hour
                                                                                            const hours: Record<number, { orders: number; revenue: number }> = {};
                                                                                              for (let i = 0; i < 24; i++) {
                                                                                                  hours[i] = { orders: 0, revenue: 0 };
                                                                                                    }
                                                                                                      for (const o of orders) {
                                                                                                          const hour = new Date(o.createdAt).getHours();
                                                                                                              hours[hour].orders += 1;
                                                                                                                  hours[hour].revenue += Number(o.total);
                                                                                                                    }

                                                                                                                      const data = Object.entries(hours).map(([hourStr, v]) => ({
                                                                                                                          hour: Number(hourStr),
                                                                                                                              orders: v.orders,
                                                                                                                                  revenue: Number(v.revenue.toFixed(2)),
                                                                                                                                    }));

                                                                                                                                      if (format === 'csv') {
                                                                                                                                          const header = 'hour,orders,revenue';
                                                                                                                                              const rows = data.map((d) => `${d.hour},${d.orders},${d.revenue}`).join('\n');
                                                                                                                                                  return new Response(`${header}\n${rows}`, {
                                                                                                                                                        headers: {
                                                                                                                                                                'Content-Type': 'text/csv',
                                                                                                                                                                        'Content-Disposition': 'attachment; filename="sales_report.csv"',
                                                                                                                                                                              },
                                                                                                                                                                                  });
                                                                                                                                                                                    }

                                                                                                                                                                                      return NextResponse.json(data);
                                                                                                                                                                                      }
                                                                                                                                                                                      