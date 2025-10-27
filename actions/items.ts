"use server";

import { CategoryFormProps } from "@/components/Forms/Inventory/CategoryFormModel";
import { ItemFormProps } from "@/components/Forms/Inventory/ItemFormModel";
import { db } from "@/prisma/db";
import { CategoryProps } from "@/types/types";
import { revalidatePath } from "next/cache";

export async function createItem(data: ItemFormProps) {
  const slug = data.slug;
  try {
    const existingItem = await db.item.findUnique({
      where: {
        slug,
      } as any
    });
    if (existingItem) {
      return {
        status: 409,
        data:null,
        error: "Item Already Exist"
      };
    }
    const newItem = await db.item.create({
      data,
    });
    // console.log(newCategory);
    revalidatePath("/dashboard/inventory/items");
    return{
      status: 200,
      data:newItem,
      error: 200,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 200,
      error: "Something Went Wrong",
      data: null,    
    };
  }
}
export async function getOrgItems(orgId: string) {
  try {
    const items = await db.item.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        orgId,
      } as any,
    });

    return items;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getOrgBriefItems(orgId: string) {
  try {
    const items = await db.item.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        orgId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnail: true,
        createdAt: true,
      }
    });

    return items;
  } catch (error) {
    console.log(error);
    return [];
  }
}
export async function updateItemById(id: string, data: ItemFormProps) {
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
    const deletedItem = await db.item.delete({
      where: {
        id,
      },
    });

    return {
      ok: true,
      data: deletedItem,
    };
  } catch (error) {
    console.log(error);
  }
}
export async function createBulkItems(items: ItemFormProps[]) {
  try {
    for (const item of items) {
      await createItem(item);
    }
  } catch (error) {
    console.log(error);
  }
}
