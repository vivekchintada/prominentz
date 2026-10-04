import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
    if (!session?.user?.restaurantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }

            // Fetch all shifts for today (including scheduled and active)
              const start = new Date();
                start.setHours(0, 0, 0, 0);
                  const end = new Date();
                    end.setHours(23, 59, 59, 999);

                      const shifts = await prisma.shift.findMany({
                          where: {
                                scheduledStart: { gte: start, lte: end },
                                      status: { in: ['SCHEDULED', 'ACTIVE'] },
                                            employee: { location: { restaurantId: session.user.restaurantId } },
                                                },
                                                    include: {
                                                          employee: { include: { user: { select: { name: true, email: true } } } },
                                                              },
                                                                });

                                                                  // Shape response
                                                                    const result = shifts.map((s) => ({
                                                                        id: s.id,
                                                                            employee: {
                                                                                  name: s.employee.user?.name ?? 'N/A',
                                                                                        email: s.employee.user?.email ?? '',
                                                                                            },
                                                                                                scheduledStart: s.scheduledStart?.toISOString() ?? null,
                                                                                                    scheduledEnd: s.scheduledEnd?.toISOString() ?? null,
                                                                                                        status: s.status,
                                                                                                          }));

                                                                                                            return NextResponse.json(result);
                                                                                                            }
                                                                                                            