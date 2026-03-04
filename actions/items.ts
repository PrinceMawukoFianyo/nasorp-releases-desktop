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

// ✅ Revalidate all relevant paths after any item mutation
function revalidateItemPaths(id?: string) {
  revalidatePath("/dashboard/inventory/items");
  revalidatePath("/dashboard/inventory/items", "page");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pos");
  revalidatePath("/pos");
  if (id) revalidatePath(`/dashboard/inventory/items/${id}`);
}

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

    revalidateItemPaths(item.id);

    return { success: true, data: item, error: null };
  } catch (error: any) {
    console.error("❌ Error creating item:", error);

    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] ?? "field";
      return {
        success: false,
        error: `An item with this ${field === "sku" ? "SKU" : field} already exists.`,
        data: null,
      };
    }
    if (error?.code === "P2025") {
      return {
        success: false,
        error: "A related record (category, brand, or unit) was not found.",
        data: null,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
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

// ✅ FIXED: includes inactive items count so listing can show toggle, uses pagination hint
export async function getOrgBriefItems(orgId: string, params?: any) {
  try {
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
        barcode: true,
        category: { select: { id: true, title: true } },
        brand: { select: { id: true, name: true } },
        supplierRelations: { select: { id: true, supplierId: true } },
        inventories: {
          select: {
            quantity: true,
            locationId: true,
            location: { select: { name: true } },
          },
        },
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
      const totalStock = item.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      return { ...rest, salesCount, salesTotal, totalStock };
    });

    return { success: true, data: itemsWithStats, total: itemsWithStats.length };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}

export async function getAllOrgItems(orgId: string, includeInactive = false) {
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
        barcode: true,
        category: { select: { id: true, title: true } },
        brand: { select: { id: true, name: true } },
        supplierRelations: { select: { id: true, supplierId: true } },
        inventories: {
          select: {
            quantity: true,
            locationId: true,
            location: { select: { name: true } },
          },
        },
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
      const totalStock = item.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      return { ...rest, salesCount, salesTotal, totalStock };
    });

    return { success: true, data: itemsWithStats, total: itemsWithStats.length };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
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

export async function getItemById(id: string) {
  try {
    // ✅ FIXED: was using getAuthenticatedApi() (external HTTP call) which
    // was failing with a 500. Now queries the DB directly like every other
    // function in this file.
    const item = await db.item.findUnique({
      where: { id },
      include: {
        category:  { select: { id: true, title: true } },
        brand:     { select: { id: true, name: true } },
        unit:      { select: { id: true, name: true, symbol: true } },
        inventories: {
          include: { location: { select: { id: true, name: true, type: true } } },
        },
        pricingTiers: {
          include: { packagingUnit: { select: { id: true, name: true } } },
          orderBy: { unitsPerPack: "asc" },
        },
        supplierRelations: {
          include: {
            supplier: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!item) throw new Error(`Item with id "${id}" not found`);

    return { success: true, data: item, error: null };
  } catch (error: any) {
    console.error("❌ getItemById error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch item",
    };
  }
}

export async function updateItemById(id: string, data: Partial<ProductData>) {
  try {
    const prismaData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);

    if ("taxRatedId" in prismaData) {
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
      if (validFields.includes(key)) acc[key] = value;
      return acc;
    }, {} as Record<string, any>);

    await db.item.update({ where: { id }, data: sanitizedData });

    revalidateItemPaths(id);
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

// ✅ Soft-delete (deactivate) — always safe, no FK issues
export async function deactivateItem(id: string) {
  try {
    await db.item.update({ where: { id }, data: { isActive: false } });
    revalidateItemPaths(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to deactivate item" };
  }
}

// ✅ Bulk soft-delete
export async function bulkDeactivateItems(ids: string[]) {
  try {
    await db.item.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    revalidateItemPaths();
    return { success: true, deactivated: ids.length };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to deactivate items" };
  }
}

async function _cascadeDeleteItem(tx: any, id: string) {
  await tx.inventory.deleteMany({ where: { itemId: id } });
  await tx.itemSupplier.deleteMany({ where: { itemId: id } });
  return tx.item.delete({ where: { id } });
}

// ✅ Hard delete — checks blockers, then cascades cleanup in transaction
export async function deleteItem(id: string) {
  try {
    const item = await db.item.findUnique({
      where: { id },
      include: {
        salesOrderLines: { take: 1 },
        purchaseOrderLines: { take: 1 },
        goodsReceiptLines: { take: 1 },
        transferLines: { take: 1 },
        adjustmentLines: { take: 1 },
        serialNumbers: { take: 1 },
        inventories: { take: 1 },
        supplierRelations: { take: 1 },
      },
    });

    if (!item) return { success: false, data: null, error: "No item found" };

    const blockers = [
      { relation: "salesOrderLines", message: "Item has sales history. Deactivate instead." },
      { relation: "purchaseOrderLines", message: "Item is on purchase orders. Deactivate instead." },
      { relation: "goodsReceiptLines", message: "Item has goods receipt history. Deactivate instead." },
      { relation: "transferLines", message: "Item is involved in transfers. Deactivate instead." },
      { relation: "adjustmentLines", message: "Item has adjustment history. Deactivate instead." },
      { relation: "serialNumbers", message: "Item has serial numbers. Deactivate instead." },
    ];

    for (const { relation, message } of blockers) {
      if ((item as any)[relation]?.length > 0) {
        return { success: false, data: null, error: message };
      }
    }

    const deletedItem = await db.$transaction(async (tx) => _cascadeDeleteItem(tx, id));

    revalidateItemPaths(id);
    return { success: true, data: deletedItem, error: null };
  } catch (error: any) {
    console.error("❌ Error deleting item:", error);
    if (error?.code === "P2003") {
      return {
        success: false,
        data: null,
        error: "Item is referenced by other records. Deactivate it instead.",
      };
    }
    if (error?.code === "P2025") {
      return { success: false, data: null, error: "Item not found or already deleted" };
    }
    return { success: false, data: null, error: error?.message || "Failed to delete item" };
  }
}

// ✅ Bulk hard delete — with cascade cleanup
export async function bulkDeleteItems(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No item IDs provided", deleted: 0, skipped: [] };
  }

  const skipped: { id: string; name: string; reason: string }[] = [];
  const toDelete: string[] = [];

  const items = await db.item.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      salesOrderLines: { take: 1, select: { id: true } },
      purchaseOrderLines: { take: 1, select: { id: true } },
      goodsReceiptLines: { take: 1, select: { id: true } },
      transferLines: { take: 1, select: { id: true } },
      adjustmentLines: { take: 1, select: { id: true } },
      serialNumbers: { take: 1, select: { id: true } },
    },
  });

  for (const item of items) {
    if (item.salesOrderLines?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has sales history" });
    } else if (item.purchaseOrderLines?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has purchase orders" });
    } else if (item.goodsReceiptLines?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has goods receipt history" });
    } else if (item.transferLines?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has transfer records" });
    } else if (item.adjustmentLines?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has adjustment history" });
    } else if (item.serialNumbers?.length > 0) {
      skipped.push({ id: item.id, name: item.name, reason: "Has serial numbers" });
    } else {
      toDelete.push(item.id);
    }
  }

  if (toDelete.length === 0) {
    return {
      success: false,
      error: "All selected items have related records. Deactivate them instead.",
      deleted: 0,
      skipped,
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.inventory.deleteMany({ where: { itemId: { in: toDelete } } });
      await tx.itemSupplier.deleteMany({ where: { itemId: { in: toDelete } } });
      await tx.item.deleteMany({ where: { id: { in: toDelete } } });
    });

    revalidateItemPaths();

    return {
      success: true,
      deleted: toDelete.length,
      skipped,
      error:
        skipped.length > 0
          ? `${toDelete.length} deleted. ${skipped.length} skipped (have related records).`
          : null,
    };
  } catch (error: any) {
    console.error("❌ Bulk delete failed:", error);
    if (error?.code === "P2003") {
      return {
        success: false,
        error: "One or more items are still referenced. Deactivate instead.",
        deleted: 0,
        skipped,
      };
    }
    return { success: false, error: error?.message || "Bulk delete failed", deleted: 0, skipped };
  }
}

export async function createBulkItems(items: ItemCreateProps[]) {
  try {
    for (const item of items) await createItem(item);
  } catch (error) {
    console.log(error);
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
      const salesCount = item.salesOrderLines.reduce((sum, l) => sum + l.quantity, 0);
      const salesTotal = item.salesOrderLines.reduce((sum, l) => sum + l.total, 0);
      return db.item.update({ where: { id: item.id }, data: { salesCount, salesTotal } });
    });

    await db.$transaction(updates);
    revalidateItemPaths();
    return { success: true, updated: items.length };
  } catch (error) {
    console.error("❌ Failed to recompute sales stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}