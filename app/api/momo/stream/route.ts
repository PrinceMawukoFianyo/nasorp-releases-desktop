// app/api/momo/stream/route.ts
// Server-Sent Events — pushes real-time MoMo alerts to the dashboard
// Falls back to polling every 5s via the momoAlert table

import { NextRequest } from "next/server";
import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user?.orgId) return new Response("Unauthorized", { status: 401 });

  const orgId = user.orgId;
  let lastId = "";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      send("connected", JSON.stringify({ ok: true }));

      // Poll every 3 seconds for new alerts
      const interval = setInterval(async () => {
        try {
          const alerts = await db.momoAlert.findMany({
            where: { orgId, ...(lastId ? { id: { gt: lastId } } : {}) },
            orderBy: { id: "asc" },
            take: 10,
          });
          for (const alert of alerts) {
            send("payment", alert.payload as string);
            lastId = alert.id;
            // Clean up after delivering
            await db.momoAlert.delete({ where: { id: alert.id } }).catch(() => {});
          }
        } catch {}
      }, 3000);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}