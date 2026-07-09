// app/api/items/default-locations/route.ts
import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemIds, orgId } = await req.json();
  if (orgId !== user.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await db.item.findMany({
    where: { id: { in: itemIds }, orgId },
    select: { id: true, defaultLocationId: true },
  });
  const result = await Promise.all(
    items.map(async (item) => {
      if (!item.defaultLocationId) return null;
      const loc = await db.location.findUnique({
        where: { id: item.defaultLocationId, orgId },
        select: { id: true, name: true },
      });
      return loc ? { itemId: item.id, locationId: loc.id, locationName: loc.name } : null;
    })
  );
  return NextResponse.json(result.filter(Boolean));
}