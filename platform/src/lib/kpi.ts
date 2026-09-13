import { prisma } from '@/lib/prisma';

export async function ordersPerHour(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.order.count({
    where: { createdAt: { gte: oneHourAgo } },
  });
  return count;
}

export async function totalRevenue(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: oneHourAgo } },
    select: { total: true },
  });
  return orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
}

export async function avgDeliveryLatency(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const tickets = await prisma.kdsTicket.findMany({
    where: { createdAt: { gte: oneHourAgo }, readyAt: { not: null } },
    select: { createdAt: true, readyAt: true },
  });
  if (tickets.length === 0) return 0;
  const totalMs = tickets.reduce((sum, t) => {
    const latency = (t.readyAt!.getTime() - t.createdAt.getTime());
    return sum + latency;
  }, 0);
  return totalMs / tickets.length / 1000; // seconds
}

export async function activeStaffCount(): Promise<number> {
  const count = await prisma.employee.count({
    where: { isActive: true },
  });
  return count;
}

