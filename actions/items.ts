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
        orgId: user.orgId, // always use the authenticated user's orgId — never trust client-sent orgId
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

    // ✅ P2002 — unique constraint (SKU or slug already exists)
    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] ?? "field";
      return {
        success: false,
        error: `An item with this ${field === "sku" ? "SKU" : field} already exists. Please use a different one.`,
        data: null,
      };
    }

    // P2025 — record not found (e.g. bad categoryId FK)
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

// ✅ Use Prisma directly to fetch ALL items without API pagination limits
// UPDATED: Only returns active items (isActive: true)
export async function getOrgBriefItems(orgId: string, params?: any) {
  try {
    console.log(`🔍 Fetching active items for org: ${orgId}`);
    
    const items = await db.item.findMany({
      where: { 
        orgId,
        isActive: true, // 👈 Only show active items
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

// NEW: Get all items including inactive (for admin purposes)
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

/**
 * One-time migration helper: syncs stored salesCount + salesTotal fields
 * from actual SalesOrderLine records (skipping DRAFT/CANCELLED).
 */
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

// FIXED: Soft delete function with correct relation names
// actions/items.ts - Updated deleteItem function for permanent deletion

// actions/items.ts - Fixed deleteItem function for permanent deletion

export async function deleteItem(id: string) {
  try {
    console.log("🔍 Attempting to permanently delete item:", id);
    
    // First, check if the item exists and get all related records
    const item = await db.item.findUnique({
      where: { id },
      include: {
        salesOrderLines: {
          take: 1
        },
        inventories: {
          take: 1
        },
        supplierRelations: {
          take: 1
        },
        purchaseOrderLines: {
          take: 1
        },
        adjustmentLines: {
          take: 1
        },
        goodsReceiptLines: {
          take: 1
        },
        transferLines: {
          take: 1
        },
        serialNumbers: {
          take: 1
        }
      }
    });

    if (!item) {
      console.log("❌ Item not found:", id);
      return {
        success: false,
        data: null,
        error: "No item found",
      };
    }

    console.log("📊 Item found - checking for related records:", {
      id: item.id,
      name: item.name,
      salesCount: item.salesOrderLines?.length || 0,
      inventoryCount: item.inventories?.length || 0,
      supplierRelations: item.supplierRelations?.length || 0,
      purchaseOrderLines: item.purchaseOrderLines?.length || 0,
      adjustmentLines: item.adjustmentLines?.length || 0,
      goodsReceiptLines: item.goodsReceiptLines?.length || 0,
      transferLines: item.transferLines?.length || 0,
      serialNumbers: item.serialNumbers?.length || 0,
    });

    // Check for sales records - these are usually permanent and shouldn't be deleted
    if (item.salesOrderLines && item.salesOrderLines.length > 0) {
      console.log("⚠️ Item has sales records, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items with sales history cannot be deleted because it would break financial records. Consider deactivating instead.",
      };
    }

    // Check for purchase orders
    if (item.purchaseOrderLines && item.purchaseOrderLines.length > 0) {
      console.log("⚠️ Item has purchase order records, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items linked to purchase orders cannot be deleted. Consider deactivating instead.",
      };
    }

    // Check for goods receipt lines
    if (item.goodsReceiptLines && item.goodsReceiptLines.length > 0) {
      console.log("⚠️ Item has goods receipt records, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items with goods receipt history cannot be deleted. Consider deactivating instead.",
      };
    }

    // Check for transfer lines
    if (item.transferLines && item.transferLines.length > 0) {
      console.log("⚠️ Item has transfer records, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items involved in transfers cannot be deleted. Consider deactivating instead.",
      };
    }

    // Check for adjustment lines
    if (item.adjustmentLines && item.adjustmentLines.length > 0) {
      console.log("⚠️ Item has adjustment records, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items with adjustment history cannot be deleted. Consider deactivating instead.",
      };
    }

    // Check for serial numbers
    if (item.serialNumbers && item.serialNumbers.length > 0) {
      console.log("⚠️ Item has serial numbers, cannot delete");
      return {
        success: false,
        data: null,
        error: "Items with serial numbers cannot be deleted. Consider deactivating instead.",
      };
    }

    // If we get here, it's safe to permanently delete
    console.log("🗑️ Proceeding with permanent deletion - no related records found");

    // Use a transaction to ensure all operations succeed or fail together
    const deletedItem = await db.$transaction(async (tx) => {
      // First delete all related records in the correct order
      
      // 1. Delete inventory records
      if (item.inventories && item.inventories.length > 0) {
        await tx.inventory.deleteMany({
          where: { itemId: id },
        });
        console.log(`✅ Deleted ${item.inventories.length} inventory records`);
      }

      // 2. Delete supplier relations - FIXED: Changed from supplierItem to ItemSupplier
      if (item.supplierRelations && item.supplierRelations.length > 0) {
        await tx.itemSupplier.deleteMany({
          where: { itemId: id },
        });
        console.log(`✅ Deleted ${item.supplierRelations.length} supplier relations`);
      }

      // 3. Finally delete the item itself
      const deleted = await tx.item.delete({
        where: { id },
      });
      
      console.log("✅ Item permanently deleted:", deleted.id);
      return deleted;
    });

    revalidatePath("/dashboard/inventory/items");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: deletedItem,
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Error permanently deleting item:", error);
    
    // Handle foreign key constraint errors
    if (error?.code === "P2003") {
      return {
        success: false,
        data: null,
        error: "Cannot delete item because it is referenced by other records. Please remove those records first.",
      };
    }

    // Handle record not found
    if (error?.code === "P2025") {
      return {
        success: false,
        data: null,
        error: "Item not found or already deleted",
      };
    }

    return {
      success: false,
      data: null,
      error: error?.message || "Failed to delete item",
    };
  }
}

// NEW: Hard delete function (use with caution) - REMOVED because it had errors
// We'll keep only the soft delete function

export async function createBulkItems(items: ItemCreateProps[]) {
  try {
    for (const item of items) {
      await createItem(item);
    }
  } catch (error) {
    console.log(error);
  }
}