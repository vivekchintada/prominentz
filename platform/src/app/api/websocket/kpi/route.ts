import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ordersPerHour, totalRevenue, avgDeliveryLatency, activeStaffCount } from '@/lib/kpi';

// NOTE: This legacy SSE endpoint is superseded by /api/kds/kpi for most uses.
// Kept for backwards compatibility.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = async () => {
        if (closed) return;
        try {
          const data = {
            ordersPerHour: await ordersPerHour(),
            totalRevenue: await totalRevenue(),
            avgDeliveryLatency: await avgDeliveryLatency(),
            activeStaffCount: await activeStaffCount(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // swallow errors to keep stream alive
        }
      };

      await sendData();
      const interval = setInterval(sendData, 5000);
      const keepAlive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode('event: ping\n\n'));
      }, 30000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
