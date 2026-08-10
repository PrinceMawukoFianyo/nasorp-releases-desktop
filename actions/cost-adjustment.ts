// Target path: actions/cost-adjustment.ts (replaces the earlier version)

"use server";

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export interface CostAdjustmentItem {
  id: string;
  name: string;
  sku: string;
  thumbnail: string | null;
  costPrice: number;
  sellingPrice: number;
}

export interface PriceAdjustmentHistoryEntry {
  id: string;
  previousCostPrice: number;
  newCostPrice: number;
  previousSellingPrice: number;
  newSellingPrice: number;
  userEmail: string | null;
  createdAt: Date;
}

// ✅ Fetch items for the cost adjustment table
export async function getItemsForCostAdjustment(orgId: string) {
  try {
    const items = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        thumbnail: true,
        costPrice: true,
        sellingPrice: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: items as CostAdjustmentItem[], error: null };
  } catch (error: any) {
    console.error("❌ getItemsForCostAdjustment error:", error);
    return { success: false, data: [] as CostAdjustmentItem[], error: error.message };
  }
}

// ✅ Bulk (or single — just pass a 1-item array) update of cost/selling price.
// Writes a PriceAdjustmentLog row per changed item, in the same transaction,
// so a failed write never logs a change that didn't happen.
export async function bulkUpdateItemCostAndPrice(
  updates: { itemId: string; costPrice: number; sellingPrice: number }[]
) {
  if (!updates || updates.length === 0) {
    return { success: false, error: "No changes to save", updated: 0 };
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user?.orgId) return { success: false, error: "Not authenticated", updated: 0 };

    const ids = updates.map((u) => u.itemId);
    const existing = await db.item.findMany({
      where: { id: { in: ids }, orgId: user.orgId },
      select: { id: true, costPrice: true, sellingPrice: true },
    });
    const existingMap = new Map(existing.map((e) => [e.id, e]));

    const safeUpdates = updates.filter((u) => existingMap.has(u.itemId));
    if (safeUpdates.length === 0) {
      return { success: false, error: "No matching items found for this organisation", updated: 0 };
    }

    await db.$transaction(async (tx) => {
      for (const u of safeUpdates) {
        const prev = existingMap.get(u.itemId)!;

        await tx.item.update({
          where: { id: u.itemId },
          data: {
            costPrice: u.costPrice,
            sellingPrice: u.sellingPrice,
            updatedAt: new Date(),
          },
        });

        await tx.priceAdjustmentLog.create({
          data: {
            itemId: u.itemId,
            orgId: user.orgId,
            userId: user.id,
            userEmail: user.email ?? null,
            previousCostPrice: prev.costPrice,
            newCostPrice: u.costPrice,
            previousSellingPrice: prev.sellingPrice,
            newSellingPrice: u.sellingPrice,
          },
        });
      }
    });

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard/inventory/cost-adjustment");
    revalidatePath("/dashboard/pos");

    return {
      success: true,
      updated: safeUpdates.length,
      skipped: updates.length - safeUpdates.length,
      error: null,
    };
  } catch (error: any) {
    console.error("❌ bulkUpdateItemCostAndPrice error:", error);
    return { success: false, error: error.message || "Bulk update failed", updated: 0 };
  }
}

// ✅ Fetch recent price-change history for a single item (for the "History" view)
export async function getPriceAdjustmentHistory(itemId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.orgId) return { success: false, data: [], error: "Not authenticated" };

    const logs = await db.priceAdjustmentLog.findMany({
      where: { itemId, orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        previousCostPrice: true,
        newCostPrice: true,
        previousSellingPrice: true,
        newSellingPrice: true,
        userEmail: true,
        createdAt: true,
      },
    });

    return { success: true, data: logs as PriceAdjustmentHistoryEntry[], error: null };
  } catch (error: any) {
    console.error("❌ getPriceAdjustmentHistory error:", error);
    return { success: false, data: [], error: error.message };
  }
}