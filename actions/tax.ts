"use server";
// actions/tax.ts
// No changes to the server actions themselves — the bug was in the page/client layer.
// Keeping this file clean and adding the TaxFormProps export that TaxRatesClient needs.

import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export type TaxFormProps = {
  name: string;
  rate: number;
  orgId: string;
};

export async function createTax(data: TaxFormProps) {
  try {
    const newRate = await db.taxRate.create({
      data: {
        name: data.name,
        rate: data.rate,
        orgId: data.orgId,
      },
    });

    revalidatePath("/dashboard/settings/tax-rates");
    return {
      status: 200,
      data: newRate,
      error: null,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      data: null,
      error: "Something went wrong!",
    };
  }
}

export async function getOrgTaxes(orgId: string) {
  try {
    const taxes = await db.taxRate.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return taxes;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function deleteTax(id: string) {
  try {
    const deleted = await db.taxRate.delete({
      where: { id },
    });

    revalidatePath("/dashboard/settings/tax-rates");
    return {
      ok: true,
      data: deleted,
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      data: null,
    };
  }
}