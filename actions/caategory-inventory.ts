"use server";

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

export type CategoryInventoryStats = {
  itemCount:  number; // distinct items that have stock
  totalUnits: number; // total quantity in stock
  costValue:  number; // quantity × cost price
};

/** Stock figures per category, keyed by categoryId. */
export async function getCategoryInventoryStats(
  locationId?: string
): Promise<Record<string, CategoryInventoryStats>> {
  const user = await getAuthenticatedUser();

  const rows = await db.inventory.findMany({
    where: { orgId: user.orgId, quantity: { gt: 0 }, ...(locationId ? { locationId } : {}) },
    select: {
      quantity: true,
      item: { select: { id: true, categoryId: true, costPrice: true } },
    },
  });

  const acc: Record<string, { items: Set<string>; units: number; value: number }> = {};
  for (const r of rows) {
    const key = r.item.categoryId ?? "uncategorised";
    const a = (acc[key] ??= { items: new Set(), units: 0, value: 0 });
    a.items.add(r.item.id);
    a.units += r.quantity;
    a.value += r.quantity * (r.item.costPrice ?? 0);
  }

  const out: Record<string, CategoryInventoryStats> = {};
  for (const [k, a] of Object.entries(acc)) {
    out[k] = {
      itemCount:  a.items.size,
      totalUnits: a.units,
      costValue:  Math.round(a.value * 100) / 100,
    };
  }
  return out;
}