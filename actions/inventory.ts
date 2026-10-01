"use server"

import { getDb } from "@/lib/get-db"
const db = getDb()
import { Item, InventoryItem, LocationStock } from "@/types/inventory"

// Clamp any DB value to minimum 0 to handle corrupted/negative data
function safeQty(n: number | null | undefined): number {
  return Math.max(0, n ?? 0)
}

export async function getInventoryItems(orgId: string, searchQuery?: string) {
  try {
    const items = await db.item.findMany({
      where: {
        orgId,
        ...(searchQuery && {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { sku: { contains: searchQuery, mode: "insensitive" } }
          ],
        }),
      },
      include: {
        category: true,
        inventories: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Transform data to match InventoryItem interface
    const inventoryItems: InventoryItem[] = items.map((item) => {
      const locations: LocationStock[] = item.inventories.map((inv) => {
        const qty = safeQty(inv.quantity)
        const reserved = safeQty(inv.reservedQuantity)
        const available = Math.max(0, qty - reserved)
        return {
          id: inv.locationId,
          name: inv.location.name,
          quantity: qty,
          reserved,
          available,
          stockStatus: calculateStockStatus(qty, reserved),
        }
      })

      const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0)
      const reservedQuantity = locations.reduce((sum, loc) => sum + loc.reserved, 0)
      const availableQuantity = Math.max(0, totalQuantity - reservedQuantity)
      const overallStockStatus = calculateStockStatus(totalQuantity, reservedQuantity)

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category?.title || "Uncategorized",
        totalQuantity,
        reservedQuantity,
        availableQuantity,
        stockStatus: overallStockStatus,
        locations,
      }
    })

    return inventoryItems
  } catch (error) {
    console.error("Error fetching inventory items:", error)
    return []
  }
}

// Helper function to calculate stock status
function calculateStockStatus(quantity: number, reserved: number): "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" {
  const available = Math.max(0, quantity - reserved)

  if (available <= 0) {
    return "OUT_OF_STOCK"
  } else if (available < 10) {
    return "LOW_STOCK"
  } else {
    return "IN_STOCK"
  }
}

export async function getInventoryItem(itemId: string, orgId: string) {
  try {
    const item = await db.item.findUnique({
      where: {
        id: itemId,
        orgId,
      },
      include: {
        category: true,
        inventories: {
          include: {
            location: true,
          },
        },
      },
    })

    if (!item) {
      return null
    }

    // Transform data to match InventoryItem interface
    const locations: LocationStock[] = item.inventories.map((inv) => {
      const qty = safeQty(inv.quantity)
      const reserved = safeQty(inv.reservedQuantity)
      const available = Math.max(0, qty - reserved)
      return {
        id: inv.locationId,
        name: inv.location.name,
        quantity: qty,
        reserved,
        available,
        stockStatus: calculateStockStatus(qty, reserved),
      }
    })

    const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0)
    const reservedQuantity = locations.reduce((sum, loc) => sum + loc.reserved, 0)
    const availableQuantity = Math.max(0, totalQuantity - reservedQuantity)
    const overallStockStatus = calculateStockStatus(totalQuantity, reservedQuantity)

    const inventoryItem: InventoryItem = {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category?.title || "Uncategorized",
      totalQuantity,
      reservedQuantity,
      availableQuantity,
      stockStatus: overallStockStatus,
      locations,
    }

    return inventoryItem
  } catch (error) {
    console.error("Error fetching inventory item:", error)
    return null
  }
}


export async function getItemsByLocation(orgId: string, locationId: string | null) {
  try {
    if (!locationId) {
      // Return all active items
      const items = await db.item.findMany({
        where: {
          orgId,
          isActive: true
        },
        include: {
          category: { select: { id: true, title: true } },
          brand: { select: { id: true, name: true } },
          inventories: {
            include: {
              location: {
                select: { id: true, name: true, type: true }
              }
            }
          },
          salesOrderLines: {
            where: {
              salesOrders: { status: { notIn: ["DRAFT", "CANCELLED"] } }
            },
            select: { quantity: true, total: true }
          }
        },
        orderBy: { name: "asc" }
      });

      // Clamp negative inventory quantities and calculate sales stats
      const itemsWithStats = items.map(item => {
        const salesCount = item.salesOrderLines.reduce((sum, line) => sum + line.quantity, 0);
        const salesTotal = item.salesOrderLines.reduce((sum, line) => sum + line.total, 0);
        const { salesOrderLines, inventories, ...rest } = item;
        return {
          ...rest,
          inventories: inventories.map(inv => ({
            ...inv,
            quantity: safeQty(inv.quantity),
            reservedQuantity: safeQty(inv.reservedQuantity),
          })),
          salesCount,
          salesTotal,
        };
      });

      return itemsWithStats;
    }

    // Return items that have inventory in the specified location
    const items = await db.item.findMany({
      where: {
        orgId,
        isActive: true,
        inventories: {
          some: {
            locationId: locationId,
            quantity: { gt: 0 } // Only show items with stock in this location
          }
        }
      },
      include: {
        category: { select: { id: true, title: true } },
        brand: { select: { id: true, name: true } },
        inventories: {
          where: { locationId: locationId },
          include: {
            location: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        salesOrderLines: {
          where: {
            salesOrders: { status: { notIn: ["DRAFT", "CANCELLED"] } }
          },
          select: { quantity: true, total: true }
        }
      },
      orderBy: { name: "asc" }
    });

    // Clamp negative quantities and calculate sales stats
    const itemsWithStats = items.map(item => {
      const salesCount = item.salesOrderLines.reduce((sum, line) => sum + line.quantity, 0);
      const salesTotal = item.salesOrderLines.reduce((sum, line) => sum + line.total, 0);

      const filteredInventories = item.inventories
        .filter(inv => inv.locationId === locationId)
        .map(inv => ({
          ...inv,
          quantity: safeQty(inv.quantity),
          reservedQuantity: safeQty(inv.reservedQuantity),
        }));

      const { salesOrderLines, inventories, ...rest } = item;
      return {
        ...rest,
        inventories: filteredInventories,
        salesCount,
        salesTotal,
      };
    });

    return itemsWithStats;
  } catch (error) {
    console.error("Error fetching items by location:", error);
    return [];
  }
}