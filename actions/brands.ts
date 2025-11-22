"use server";

import { BrandFormProps } from "@/components/Forms/Inventory/BrandForm";
import { UnitFormProps } from "@/components/Forms/Inventory/UnitForm";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";


export async function createBrand(data: BrandFormProps) {
  try {
   const existingBrand = await db.brand.findUnique({
    where: {
      slug:data.slug
    }
   }) 
   if(existingBrand){
      return{
        status:409,
        data:null,
        error:"This Brand Already Exist",
      }
   }
  const createData = {
    name: data.name,
    slug: data.slug,
    orgId: data.orgId,
  };
  
  const newBrand = await db.brand.create({
    data: createData,
  });

    revalidatePath("/dashboard/inventory/brands");
    return{
        status:200,
        data:newBrand,
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

export async function getOrgBrands(orgId: string) {
  try {
  const brands = await db.brand.findMany({
    where: {
        orgId: orgId
    } as any,
    orderBy: {
        createdAt: 'desc', 
      },
    });
    return brands;
  } catch (error) {
    console.log(error);
    return[]
  }
}
export async function deleteBrands(id: string) {
  try {
    // First check if the brand exists
    const existingBrand = await db.brand.findUnique({
      where: { id },
    });

    if (!existingBrand) {
      return {
        ok: false,
        error: "Brand not found",
      };
    }

    // Then delete it
    const deleted = await db.brand.delete({
      where: {
        id,
      },
    });

    revalidatePath("/dashboard/inventory/brands");
    return {
      ok: true,
      data: deleted,
    };
  } catch (error: any) {
    console.log(error);
    
    // Handle Prisma P2025 error (record not found)
    if (error.code === 'P2025') {
      return {
        ok: false,
        error: "Brand not found or already deleted",
      };
    }

    return {
      ok: false,
      error: "Failed to delete brand",
    };
  }
}