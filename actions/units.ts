"use server";

import { MetaPros } from "@/components/dashboard/blogs/blog-edit-form";
import { UnitFormProps } from "@/components/Forms/Inventory/UnitForm";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export type BlogCategoryProps = {
  name: string;
  slug: string;
};
export type BriefBlog = {
  id: string;
  title: string;
  thumbnail: string | null;
  published: boolean | null;
  categoryTitle: string;
};

export async function createUnit(data: UnitFormProps) {
  try {
  const createData = {
    name: data.name,
    symbol: data.symbol,
    orgId: data.orgId,
  };
  
  const newUnit = await db.unit.create({
    data: createData,
  });

    revalidatePath("/dashboard/inventory/units");
    return{
        status:200,
        data:newUnit,
        error: null,
    }
  } catch (error) {
    console.log(error);
    return{
        status:500,
        data:null,
        error:"Something went Wrong!"
    }
  }
}

export async function getOrgUnits(orgId: string) {
  try {
  const units = await db.unit.findMany({
    where: {
        orgId: orgId
    } as any,
    orderBy: {
        createdAt: 'desc', 
      },
    });
    return units;
  } catch (error) {
    console.log(error);
    return[]
  }
}
export async function deleteUnit(id: string) {
  try {
    const deleted = await db.unit.delete({
      where: {
        id,
      },
    });
     
    revalidatePath("/dashboard/inventory/units")
    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    console.log(error);
  }
}