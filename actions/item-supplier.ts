'use server';

import { db } from "@/prisma/db";
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Server action to create item suppliers
 */
export async function createItemSuppliers(
  itemId: string,
  supplierIds: string[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    if (!supplierIds || supplierIds.length === 0) {
      return { success: false, error: 'At least one supplier must be selected' };
    }

    // Create the item-supplier relationships with default unitCost of 0
    const result = await db.itemSupplier.createMany({
      data: supplierIds.map((supplierId) => ({
        itemId,
        supplierId,
        unitCost: 0, // Required field - set to 0 as default
        isPreferred: false,
      })),
      skipDuplicates: true,
    });

    console.log(`Created ${result.count} item-supplier relationship(s) for item ${itemId}`);
    
    revalidatePath(`/dashboard/inventory/items/${itemId}/suppliers`);
    
    return { 
      success: true, 
      count: result.count 
    };
  } catch (error) {
    console.error('Error creating item suppliers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create item suppliers' 
    };
  }
}

/**
 * Server action to get all suppliers for a specific item
 */
export async function getItemSuppliers(itemId: string): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    supplierName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    costPrice?: number;
    isActive: boolean;
    addedDate: Date;
  }>;
  error?: string;
}> {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    const itemSuppliers = await db.itemSupplier.findMany({
      where: { itemId },
      include: {
        supplier: true,
      },
      orderBy: {
        lastPurchaseDate: 'desc',
      },
    });

    const formattedSuppliers = itemSuppliers.map(is => ({
      id: is.id,
      supplierName: is.supplier.name,
      contactPerson: is.supplier.contactPerson || undefined,
      email: is.supplier.email || undefined,
      phone: is.supplier.phone || undefined,
      // Convert Decimal to number for costPrice
      costPrice:is.unitCost || undefined,
      isActive: is.supplier.isActive,
      addedDate: is.lastPurchaseDate || is.supplier.createdAt,
    }));

    return { 
      success: true, 
      data: formattedSuppliers
    };
  } catch (error) {
    console.error('Error fetching item suppliers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch item suppliers'
    };
  }
}

/**
 * Server action to remove a supplier from an item
 */
export async function removeItemSupplier(
  itemSupplierId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!itemSupplierId) {
      return { success: false, error: 'Item supplier ID is required' };
    }

    await db.itemSupplier.delete({
      where: { id: itemSupplierId },
    });

    console.log(`Removed item-supplier relationship: ${itemSupplierId}`);

    revalidatePath(`/dashboard/inventory/items`);

    return { success: true };
  } catch (error) {
    console.error('Error removing item supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove item supplier' 
    };
  }
}

/**
 * Server action to update item supplier details
 */
export async function updateItemSupplier(
  itemSupplierId: string,
  data: Record<string, any>
) {
  try {
    const updateData: Record<string, any> = { ...data }
    
    // Extract itemId from data (don't include it in the update)
    const itemId = data.itemId;
    delete updateData.itemId;

    if (updateData.lastPurchaseDate) {
      if (typeof updateData.lastPurchaseDate === "string") {
        if (updateData.lastPurchaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          updateData.lastPurchaseDate = new Date(`${updateData.lastPurchaseDate}T00:00:00.000Z`)
        } else if (updateData.lastPurchaseDate === "") {
          delete updateData.lastPurchaseDate
        }
      }
    }
    
    // If this is marked as preferred, unmark ALL other preferred suppliers for this item
    if(updateData.isPreferred === true && itemId){
      await db.itemSupplier.updateMany({
        where: {
          itemId: itemId,
          isPreferred: true,
          id: { not: itemSupplierId }, // Exclude the current record
        },
        data:{
          isPreferred: false,
        },
      });
    }

    if (updateData.unitCost !== undefined && updateData.unitCost !== "") {
      updateData.unitCost = new Decimal(updateData.unitCost.toString())
    } else if (updateData.unitCost === "") {
      delete updateData.unitCost
    }

    await db.itemSupplier.update({
      where: { id: itemSupplierId },
      data: updateData,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating item supplier:", error)
    throw error
  }
}
export async function deleteItemSupplier(itemSupplierId: string) {
  try {
    await db.itemSupplier.delete({
      where: { id: itemSupplierId },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting item supplier:", error)
    throw error
  }
}