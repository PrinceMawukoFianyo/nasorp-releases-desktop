"use server";

import { api, getAuthenticatedApi } from "@/config/axios";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps, ProductResponse, ProductData} from "@/types/item";
import axios from "axios";

import { revalidatePath } from "next/cache";


interface ApiResponse {
  data: ProductData | null
  success: boolean
  error?: string
}

export async function createItem(data: ItemCreateProps) {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.post("/items", data);
    const item = res.data.data;
    return{
      success: true,
      data:item,
      error: 200,
    };
  } catch (error) {
    console.log(error);
    return {
      success: true,
      error: "Failed to Create an Item",
      data: null,    
    };
  }
}
export async function getOrgItems(orgId: string, params = {}) {
  try {
    
   const api = await getAuthenticatedApi();
    const res = await api.get(`/organisations/${orgId}/items`, {
      params,
    });
    
    const items = res.data.data;

    return items;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getOrgBriefItems(orgId: string, params?: any) {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.get(`/organisations/${orgId}/brief-items`, {
      params,
    });
    
    return res.data;
  } catch (error) {
    console.error("Error fetching items:", error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || "Failed to fetch items";
      throw new Error(message);
    }

    throw new Error("An unexpected error occurred");
  }
}
export async function getBriefItemById(
  id: string,
){
  try {
    const api = await getAuthenticatedApi();
    const item = await db.item.findUnique({
      where:{
        id
      },
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
              }
            }
          }
        },
      },
    }); 
    return item;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getItemById(
  id: string,
): Promise<ProductResponse> {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.get(`/items/${id}`); 
    return res.data;
  } catch (error) {
    console.error("Error fetching items:", error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || "Failed to fetch items";
      throw new Error(message);
    }
    
    throw new Error("An unexpected error occurred"); // ✅ Always throw or return
  }
} 

export async function updateItemById(id: string, data: Partial<ProductData>) {
  try {
    // Transform null values to undefined for Prisma
    const prismaData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);

    // ✅ FIX: Rename incorrect field if it exists
    if ('taxRatedId' in prismaData) {
      console.warn('⚠️ Correcting typo: taxRatedId → taxRateId');
      prismaData.taxRateId = prismaData.taxRatedId;
      delete prismaData.taxRatedId;
    }

    // ✅ VALIDATION: Remove any fields that don't exist in Prisma schema
    const validFields = [
      'id', 'name', 'sku', 'slug', 'barcode', 'description', 'dimensions', 
      'weight', 'upc', 'ean', 'mpn', 'isbn', 'imageUrl', 'thumbnail', 
      'salesCount', 'salesTotal', 'unitOfMeasure', 'costPrice', 'sellingPrice', 
      'minStockLevel', 'maxStockLevel', 'isActive', 'isSerialTracked', 
      'createdAt', 'updatedAt', 'organisationId', 'categoryId', 'taxRateId', 
      'brandId', 'unitId', 'tax'
    ];

    const sanitizedData = Object.entries(prismaData).reduce((acc, [key, value]) => {
      if (validFields.includes(key)) {
        acc[key] = value;
      } else {
        console.warn(`⚠️ Skipping invalid field: ${key}`);
      }
      return acc;
    }, {} as Record<string, any>);

    await db.item.update({
      where: {
        id,
      },
      data: sanitizedData,
    });
  
    console.log("✅ Update item successful:", id, sanitizedData);
    revalidatePath(`/dashboard/inventory/items/${id}`);
    return { success: true }
  } catch (error) {
    console.error("❌ Update item failed:", error);
    
    // Return more detailed error information
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: "An unknown error occurred"
    };
  }
}

/* export async function updateItem(id: string, data: Partial<ProductData>): Promise<ApiResponse> {
  try {
    const api = await getAuthenticatedApi();
    const res = await api.put(`/items/${id}`, data);
    
    if (!res.data) {
      return {
        data: null,
        success: false,
        error: "Failed to update item",
      }
    }

    revalidatePath("/dashboard/items");
    return {
      data: res.data.data,
      success: true,
    }
  } catch (error) {
    console.error("Error updating item:", error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || "Failed to update item";
      return {
        data: null,
        success: false,
        error: message,
      }
    }
    
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    }
  }
} */

/*  export async function updateItemById(id: string, data: ItemCreateProps) {
  try {
    const updatedItem = await db.item.update({
      where: {
        id,
      },
      data,
    });
    revalidatePath("/dashboard/items");
    return updatedItem;
  } catch (error) {
    console.log(error);
  }
}  */
/* export async function getItemById(id: string) {
  try {
    const item = await db.item.findUnique({
      where: {
        id,
      },
    });
    return item;
  } catch (error) {
    console.log(error);
  }
} */
export async function deleteItem(id: string) {
  try {
    const item = await db.item.findUnique({
      where: {
        id
      }
    })
    if(!item){
      return {
      success: false,
      data: null,
      error: "No item Found",
    };  
    }
    if(item.salesCount>0){
      return {
      success: false,
      data: null,
      error: "Item with sales can be deleted",
    };
    }
    const deletedItem = await db.item.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      data: deletedItem,
      error: null,
    };
  } catch (error) {
    console.log(error);
    return{
      success: false,
      data: null,
      error: "Item failed to delete",
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