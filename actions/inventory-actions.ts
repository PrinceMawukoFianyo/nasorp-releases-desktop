"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"

/**
 * Creates or updates the Inventory record that links an item to a location.
 * ✅ FIX: the update branch now persists `quantity` — previously it only
 *    updated stockStatus, so re-linking an item kept quantity at 0.
 */
export async function linkItemToLocation({
  itemId,
  locationId,
  quantity = 0,
}: {
  itemId: string
  locationId: string
  quantity?: number
}) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    if (!itemId || !locationId) {
      return { success: false, error: "itemId and locationId are required" }
    }

    const qty = Math.max(0, quantity)
    const stockStatus =
      qty > 10 ? "IN_STOCK" : qty > 0 ? "LOW_STOCK" : "OUT_OF_STOCK"

    // ✅ Both create AND update now write the quantity
    const inventory = await db.inventory.upsert({
      where: {
        itemId_locationId: { itemId, locationId },
      },
      update: {
        quantity: qty,        // ← was missing before; caused 0-quantity on re-link
        stockStatus,
      },
      create: {
        itemId,
        locationId,
        orgId: user.orgId,
        quantity: qty,
        reservedQuantity: 0,
        stockStatus,
      },
    })

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/pos")

    return { success: true, data: inventory }
  } catch (error) {
    console.error("❌ linkItemToLocation failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link item to location",
    }
  }
}

/**
 * Updates the quantity of an existing Inventory record.
 * Use this when receiving stock (purchase orders, adjustments, etc.)
 */
export async function updateInventoryQuantity({
  itemId,
  locationId,
  quantity,
  mode = "set",
}: {
  itemId: string
  locationId: string
  quantity: number
  mode?: "set" | "increment" | "decrement"
}) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const existing = await db.inventory.findUnique({
      where: { itemId_locationId: { itemId, locationId } },
    })

    if (!existing) {
      return { success: false, error: "Inventory record not found. Link item to location first." }
    }

    let newQuantity: number
    if (mode === "increment") {
      newQuantity = existing.quantity + quantity
    } else if (mode === "decrement") {
      newQuantity = Math.max(0, existing.quantity - quantity)
    } else {
      newQuantity = quantity
    }

    const stockStatus =
      newQuantity > 10 ? "IN_STOCK" : newQuantity > 0 ? "LOW_STOCK" : "OUT_OF_STOCK"

    const updated = await db.inventory.update({
      where: { itemId_locationId: { itemId, locationId } },
      data: { quantity: newQuantity, stockStatus },
    })

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard")

    return { success: true, data: updated }
  } catch (error) {
    console.error("❌ updateInventoryQuantity failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update inventory",
    }
  }
}

/**
 * Returns all inventory entries for a given item — every location
 * the item is stocked at, with quantities.
 */
export async function getItemInventoryLocations(itemId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.orgId) {
      return [];
    }

    // Fetch the item to get its minStockLevel
    const item = await db.item.findUnique({
      where: { id: itemId, orgId: user.orgId },
      select: { minStockLevel: true },
    });

    if (!item) return [];

    const inventories = await db.inventory.findMany({
      where: { itemId, orgId: user.orgId },
      include: {
        location: true,
      },
    });

    return inventories.map((inv) => {
      const quantity = Math.max(0, inv.quantity);
      const minStock = item.minStockLevel ?? 0;
      let stockStatus = "OUT_OF_STOCK";
      if (quantity > 0) {
        if (quantity < minStock) {
          stockStatus = "LOW_STOCK";
        } else {
          stockStatus = "IN_STOCK";
        }
      }

      return {
        inventoryId: inv.id,
        locationId: inv.locationId,
        locationName: inv.location.name,
        locationType: inv.location.type,
        quantity: quantity,
        reservedQuantity: Math.max(0, inv.reservedQuantity),
        available: Math.max(0, inv.quantity - inv.reservedQuantity),
        stockStatus: stockStatus, // corrected
      };
    });
  } catch (error) {
    console.error("Error fetching item inventory locations:", error);
    return [];
  }
}

export async function unlinkItemFromLocation(itemId: string, locationId: string) {
  try {
    // Delete the inventory record that connects this item to this location
    await db.inventory.deleteMany({
      where: {
        itemId: itemId,
        locationId: locationId,
      },
    });

    revalidatePath(`/dashboard/inventory/items/${itemId}`);
    revalidatePath("/dashboard/inventory/items");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to unlink item from location:", error);
    return {
      success: false,
      error: error?.message || "Could not remove item from this location",
    };
  }
}