// actions/manual-debt.ts
"use server";
import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { revalidatePath } from "next/cache";

export async function createManualDebt(data: {
  customerId: string;
  amountOwing: number;
  notes?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.orgId) return { success: false, error: "Not authenticated" };

    const customer = await db.customer.findFirst({
      where: { id: data.customerId, orgId: user.orgId },
    });
    if (!customer) return { success: false, error: "Customer not found" };

    const debt = await db.manualDebt.create({
      data: {
        orgId: user.orgId,
        customerId: data.customerId,
        amountOwing: data.amountOwing,
        amountPaid: 0,
        status: data.amountOwing > 0 ? "PENDING" : "PAID",
        notes: data.notes,
        createdById: user.id, // ✅ ADD THIS
      },
    });

    revalidatePath("/dashboard/sales/orders/credit");
    return { success: true, data: debt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordManualDebtPayment(data: {
  debtId: string;
  amount: number;
  method: "CASH" | "MOMO" | "CREDIT_CARD";
  reference?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    const debt = await db.manualDebt.findFirst({
      where: { id: data.debtId, orgId: user.orgId },
    });
    if (!debt) return { success: false, error: "Debt record not found" };
    if (debt.status === "PAID")
      return { success: false, error: "Already fully paid" };
    if (data.amount > debt.amountOwing)
      return { success: false, error: "Amount exceeds remaining balance" };

    const newPaid = debt.amountPaid + data.amount;
    const newOwing = debt.amountOwing - data.amount;
    const newStatus = newOwing <= 0 ? "PAID" : "PARTIAL";

    await db.$transaction([
      db.manualDebt.update({
        where: { id: data.debtId },
        data: { amountPaid: newPaid, amountOwing: newOwing, status: newStatus },
      }),
      db.manualDebtPayment.create({
        data: {
          manualDebtId: data.debtId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          paidAt: new Date(),
          recordedById: user.id,
          orgId: user.orgId,
        },
      }),
    ]);

    revalidatePath("/dashboard/sales/orders/credit");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getManualDebtsForCustomer(customerId: string) {
  try {
    const user = await getAuthenticatedUser();
    return db.manualDebt.findMany({
      where: { orgId: user.orgId, customerId },
      include: { payments: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}