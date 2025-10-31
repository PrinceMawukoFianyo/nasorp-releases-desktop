"use server";

import { api } from "@/config/axios";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps} from "@/types/item";
import axios from "axios";
import { error } from "console";
import { revalidatePath } from "next/cache";

export async function createItem(data: ItemCreateProps) {
  try {
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
    const res = await api.get(`/organisations/${orgId}/items`, {params});
    
    const items = res.data.data;

    return items;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getOrgBriefItems(
  orgId: string, 
  params = {}
): Promise<BriefItemDTO> {
  try {
    const res = await api.get(`/organisations/${orgId}/brief-items`, { params }); 
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
export async function updateItemById(id: string, data: ItemCreateProps) {
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
}
export async function getItemById(id: string) {
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
}
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

