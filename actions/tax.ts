"use server";

import { MetaPros } from "@/components/dashboard/blogs/blog-edit-form";
import { TaxFormProps } from "@/components/Forms/Inventory/TaxRateForm";
import { UnitFormProps } from "@/components/Forms/Inventory/UnitForm";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export async function createTax(data: TaxFormProps) {
  try {
  const createData = {
    name: data.name,
    rate: data.rate,
    orgId: data.orgId,
  };
  
  const newRate = await db.taxRate.create({
    data: createData,
  });

    revalidatePath("/dashboard/settings/tax-rates");
    return{
        status:200,
        data:newRate,
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

export async function getOrgTaxes(orgId: string) {
  try {
  const taxes = await db.taxRate.findMany({
    where: {
        orgId: orgId
    } as any,
    orderBy: {
        createdAt: 'desc', 
      },
    });
    return taxes;
  } catch (error) {
    console.log(error);
    return[]
  }
}
export async function deleteTax(id: string) {
  try {
    const deleted = await db.taxRate.delete({
      where: {
        id,
      },
    });
     
    revalidatePath("/dashboard/settings/tax-rates")
    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    console.log(error);
  }
}