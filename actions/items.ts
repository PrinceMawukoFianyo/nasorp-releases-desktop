// actions/items.ts
"use server";

import { getAuthenticatedApi } from "@/config/axios";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps, ProductResponse, ProductData } from "@/types/item";
import axios from "axios";
import { revalidatePath } from "next/cache";

interface ApiResponse {
  data: ProductData | null;
  success: boolean;
  error?: string;
}

// Extended props type that covers all fields item-listing.tsx sends
type ItemCreateInput = ItemCreateProps & {
  description?: string | null
  barcode?: string | null
  minStockLevel?: number | null
  maxStockLevel?: number | null
  categoryId?: string | null
  brandId?: string | null
  unitId?: string | null
  unitOfMeasure?: string | null
  isActive?: boolean
  isSerialTracked?: boolean
}

// ✅ FIXED: Use Prisma directly — bypasses the broken /api/v1/items route
export async function createItem(data: ItemCreateInput) {
  try {
    const user = await getAuthenticatedUser();

    const item = await db.item.create({
      data: {
        name: data.name,
        sku: data.sku,
        slug: data.slug,
        orgId: user.orgId,
        thumbnail: data.thumbnail ?? null,
        costPrice: data.costPrice ?? 0,
        sellingPrice: data.sellingPrice ?? 0,
        description: data.description ?? null,
        barcode: data.barcode ?? null,
        minStockLevel: data.minStockLevel ?? 0,
        maxStockLevel: data.maxStockLevel ?? null,
        categoryId: data.categoryId ?? null,
        brandId: data.brandId ?? null,
        unitId: data.unitId ?? null,
        unitOfMeasure: data.unitOfMeasure ?? null,
        isActive: data.isActive ?? true,
        isSerialTracked: data.isSerialTracked ?? false,
      },
    });

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: item,
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Error creating item:", error);

    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] ?? "field";
      return {
        success: false,
        error: `An item with this ${field === "sku" ? "SKU" : field} already exists. Please use a different one.`,
        data: null,
      };
    }

    if (error?.code === "P2025") {
      return {
        success: false,
        error: "A related record (category, brand, or unit) was not found. Please check your selections.",
        data: null,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: false,
      error: "Failed to create item",
      data: null,
    };
  }
}

export async function getOrgItems(orgId: string, params = {}) {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.get(`/organisations/${orgId}/items`, { params });
    return res.data.data;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getOrgBriefItems(orgId: string, params?: any) {
  try {
    console.log(`🔍 Fetching active items for org: ${orgId}`);

    const items = await db.item.findMany({
      where: {
        orgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        thumbnail: true,
        sellingPrice: true,
        costPrice: true,
        isActive: true,
        categoryId: true,
        brandId: true,
        category: { select: { id: true, title: true } },
        brand: { select: { id: true, name: true } },
        supplierRelations: { select: { id: true, supplierId: true } },
        salesOrderLines: {
          where: {
            salesOrders: { status: { notIn: ["DRAFT", "CANCELLED"] } },
          },
          select: { quantity: true, total: true },
        },
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📦 Found ${items.length} active items`);

    const itemsWithStats = items.map((item) => {
      const { salesOrderLines, ...rest } = item;
      const salesCount = salesOrderLines.reduce((sum, line) => sum + line.quantity, 0);
      const salesTotal = salesOrderLines.reduce((sum, line) => sum + line.total, 0);
      return { ...rest, salesCount, salesTotal };
    });

    return {
      success: true,
      data: itemsWithStats,
      total: itemsWithStats.length,
    };
  } catch (error) {
    console.error("Error fetching items:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: [],
    };
  }
}

export async function getAllOrgItems(orgId: string, includeInactive: boolean = false) {
  try {
    const items = await db.item.findMany({
      where: {
        orgId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        thumbnail: true,
        sellingPrice: true,
        costPrice: true,
        isActive: true,
        categoryId: true,
        brandId: true,
        category: { select: { id: true, title: true } },
        brand: { select: { id: true, name: true } },
        supplierRelations: { select: { id: true, supplierId: true } },
        salesOrderLines: {
          where: {
            salesOrders: { status: { notIn: ["DRAFT", "CANCELLED"] } },
          },
          select: { quantity: true, total: true },
        },
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const itemsWithStats = items.map((item) => {
      const { salesOrderLines, ...rest } = item;
      const salesCount = salesOrderLines.reduce((sum, line) => sum + line.quantity, 0);
      const salesTotal = salesOrderLines.reduce((sum, line) => sum + line.total, 0);
      return { ...rest, salesCount, salesTotal };
    });

    return {
      success: true,
      data: itemsWithStats,
      total: itemsWithStats.length,
    };
  } catch (error) {
    console.error("Error fetching items:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: [],
    };
  }
}

export async function recomputeItemSalesStats(orgId: string) {
  try {
    const items = await db.item.findMany({
      where: { orgId },
      select: {
        id: true,
        salesOrderLines: {
          where: { salesOrders: { status: { notIn: ["DRAFT", "CANCELLED"] } } },
          select: { quantity: true, total: true },
        },
      },
    });

    const updates = items.map((item) => {
      const salesCount = item.salesOrderLines.reduce((sum, line) => sum + line.quantity, 0);
      const salesTotal = item.salesOrderLines.reduce((sum, line) => sum + line.total, 0);
      return db.item.update({ where: { id: item.id }, data: { salesCount, salesTotal } });
    });

    await db.$transaction(updates);
    revalidatePath("/dashboard/inventory/items");
    console.log(`✅ Recomputed sales stats for ${items.length} items`);
    return { success: true, updated: items.length };
  } catch (error) {
    console.error("❌ Failed to recompute sales stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getBriefItemById(id: string) {
  try {
    const item = await db.item.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        orgId: true,
        sku: true,
        updatedAt: true,
        supplierRelations: {
          select: {
            id: true,
            supplierId: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                contactPerson: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
    return item;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getItemById(id: string): Promise<ProductResponse> {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.get(`/items/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching item:", error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || "Failed to fetch item";
      throw new Error(message);
    }
    throw new Error("An unexpected error occurred");
  }
}

export async function updateItemById(id: string, data: Partial<ProductData>) {
  try {
    const prismaData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);

    if ("taxRatedId" in prismaData) {
      console.warn("⚠️ Correcting typo: taxRatedId → taxRateId");
      prismaData.taxRateId = prismaData.taxRatedId;
      delete prismaData.taxRatedId;
    }

    const validFields = [
      "id", "name", "sku", "slug", "barcode", "description", "dimensions",
      "weight", "upc", "ean", "mpn", "isbn", "imageUrl", "thumbnail",
      "salesCount", "salesTotal", "unitOfMeasure", "costPrice", "sellingPrice",
      "minStockLevel", "maxStockLevel", "isActive", "isSerialTracked",
      "createdAt", "updatedAt", "organisationId", "categoryId", "taxRateId",
      "brandId", "unitId", "tax",
    ];

    const sanitizedData = Object.entries(prismaData).reduce((acc, [key, value]) => {
      if (validFields.includes(key)) {
        acc[key] = value;
      } else {
        console.warn(`⚠️ Skipping invalid field: ${key}`);
      }
      return acc;
    }, {} as Record<string, any>);

    await db.item.update({ where: { id }, data: sanitizedData });

    console.log("✅ Update item successful:", id, sanitizedData);
    revalidatePath(`/dashboard/inventory/items/${id}`);
    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Update item failed:", error);

    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] ?? "field";
      return {
        success: false,
        error: `An item with this ${field === "sku" ? "SKU" : field} already exists.`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

// ✅ FIXED: Shared cascade-delete helper used by both single and bulk delete
async function _cascadeDeleteItem(tx: any, id: string) {
  // 1. Delete inventory records FIRST (this was the FK causing the error)
  await tx.inventory.deleteMany({ where: { itemId: id } });

  // 2. Delete supplier relations
  await tx.itemSupplier.deleteMany({ where: { itemId: id } });

  // 3. Delete the item itself
  return tx.item.delete({ where: { id } });
}

// ✅ FIXED: Checks for blocking relations, then properly cascades cleanup
export async function deleteItem(id: string) {
  try {
    console.log("🔍 Attempting to permanently delete item:", id);

    const item = await db.item.findUnique({
      where: { id },
      include: {
        salesOrderLines: { take: 1 },
        purchaseOrderLines: { take: 1 },
        goodsReceiptLines: { take: 1 },
        transferLines: { take: 1 },
        adjustmentLines: { take: 1 },
        serialNumbers: { take: 1 },
        // ✅ No `take` limit here — we need to know they exist to delete them
        inventories: { take: 1 },
        supplierRelations: { take: 1 },
      },
    });

    if (!item) {
      return { success: false, data: null, error: "No item found" };
    }

    // Guard: relations that BLOCK deletion (financial/audit trail)
    const blockers: { relation: string; message: string }[] = [
      {
        relation: "salesOrderLines",
        message: "Items with sales history cannot be deleted. Consider deactivating instead.",
      },
      {
        relation: "purchaseOrderLines",
        message: "Items linked to purchase orders cannot be deleted. Consider deactivating instead.",
      },
      {
        relation: "goodsReceiptLines",
        message: "Items with goods receipt history cannot be deleted. Consider deactivating instead.",
      },
      {
        relation: "transferLines",
        message: "Items involved in transfers cannot be deleted. Consider deactivating instead.",
      },
      {
        relation: "adjustmentLines",
        message: "Items with adjustment history cannot be deleted. Consider deactivating instead.",
      },
      {
        relation: "serialNumbers",
        message: "Items with serial numbers cannot be deleted. Consider deactivating instead.",
      },
    ];

    for (const { relation, message } of blockers) {
      if ((item as any)[relation]?.length > 0) {
        console.log(`⚠️ Blocked by ${relation}`);
        return { success: false, data: null, error: message };
      }
    }

    // ✅ Safe to delete — cascade cleanup inside a transaction
    const deletedItem = await db.$transaction(async (tx) => {
      return _cascadeDeleteItem(tx, id);
    });

    console.log("✅ Item permanently deleted:", deletedItem.id);

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard");

    return { success: true, data: deletedItem, error: null };
  } catch (error: any) {
    console.error("❌ Error permanently deleting item:", error);

    if (error?.code === "P2003") {
      return {
        success: false,
        data: null,
        error: "Cannot delete item because it is referenced by other records. Please remove those records first.",
      };
    }

    if (error?.code === "P2025") {
      return { success: false, data: null, error: "Item not found or already deleted" };
    }

    return { success: false, data: null, error: error?.message || "Failed to delete item" };
  }
}

// ✅ NEW: Bulk delete — this was missing and caused the FK error shown in the screenshot.
// The raw SQL was attempting to delete multiple items without cleaning up Inventory first.
export async function bulkDeleteItems(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No item IDs provided", deleted: 0, skipped: [] };
  }

  const skipped: { id: string; reason: string }[] = [];
  const toDelete: string[] = [];

  // Check each item for blocking relations before attempting any delete
  const items = await db.item.findMany({
    where: { id: { in: ids } },
    include: {
      salesOrderLines: { take: 1 },
      purchaseOrderLines: { take: 1 },
      goodsReceiptLines: { take: 1 },
      transferLines: { take: 1 },
      adjustmentLines: { take: 1 },
      serialNumbers: { take: 1 },
    },
  });

  for (const item of items) {
    if (item.salesOrderLines?.length > 0) {
      skipped.push({ id: item.id, reason: "Has sales history" });
    } else if (item.purchaseOrderLines?.length > 0) {
      skipped.push({ id: item.id, reason: "Has purchase orders" });
    } else if (item.goodsReceiptLines?.length > 0) {
      skipped.push({ id: item.id, reason: "Has goods receipt history" });
    } else if (item.transferLines?.length > 0) {
      skipped.push({ id: item.id, reason: "Has transfer records" });
    } else if (item.adjustmentLines?.length > 0) {
      skipped.push({ id: item.id, reason: "Has adjustment history" });
    } else if (item.serialNumbers?.length > 0) {
      skipped.push({ id: item.id, reason: "Has serial numbers" });
    } else {
      toDelete.push(item.id);
    }
  }

  if (toDelete.length === 0) {
    return {
      success: false,
      error: "All selected items have related records and cannot be deleted. Consider deactivating instead.",
      deleted: 0,
      skipped,
    };
  }

  try {
    // ✅ Delete inside a single transaction: inventory first, then supplier relations, then items
    await db.$transaction(async (tx) => {
      // 1. Remove inventory records for all items being deleted
      await tx.inventory.deleteMany({ where: { itemId: { in: toDelete } } });

      // 2. Remove supplier relations
      await tx.itemSupplier.deleteMany({ where: { itemId: { in: toDelete } } });

      // 3. Now safe to delete items
      await tx.item.deleteMany({ where: { id: { in: toDelete } } });
    });

    console.log(`✅ Bulk deleted ${toDelete.length} items`);

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard");

    return {
      success: true,
      deleted: toDelete.length,
      skipped,
      error: skipped.length > 0
        ? `${toDelete.length} item(s) deleted. ${skipped.length} item(s) skipped due to related records.`
        : null,
    };
  } catch (error: any) {
    console.error("❌ Bulk delete failed:", error);

    if (error?.code === "P2003") {
      return {
        success: false,
        error: "One or more items are still referenced by other records and cannot be deleted.",
        deleted: 0,
        skipped,
      };
    }

    return {
      success: false,
      error: error?.message || "Bulk delete failed",
      deleted: 0,
      skipped,
    };
  }
}

export async function createBulkItems(items: ItemCreateProps[]) {
  try {
    for (const item of items) {
      await createItem(item);
    }
  } catch (error) {
    console.log(error);
  }
}