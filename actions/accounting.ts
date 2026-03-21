"use server";
// actions/accounting.ts
// Expense and PayrollEntry models exist in schema.prisma — DB calls are active.

import { db }                   from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { revalidatePath }       from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "Operations" | "Logistics" | "Marketing"
  | "Maintenance" | "Utilities" | "Payroll" | "Other";

export type ExpenseCreateInput = {
  description: string;
  category:    ExpenseCategory;
  amount:      number;
  date?:       string;
  notes?:      string;
  isPayroll?:  boolean;
};

export type ExpenseRecord = {
  id:          string;
  orgId:       string;
  description: string;
  category:    string;
  amount:      number;
  date:        string;
  recordedBy:  string;
  isPayroll:   boolean;
  notes:       string | null;
};

export type PayrollCreateInput = {
  employeeName: string;
  role?:        string;
  amount:       number;
  period:       string;
  date?:        string;
  status?:      "PAID" | "PENDING";
  notes?:       string;
};

export type PayrollRecord = {
  id:           string;
  orgId:        string;
  employeeName: string;
  role:         string;
  amount:       number;
  period:       string;
  date:         string;
  status:       "PAID" | "PENDING";
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function createExpense(data: ExpenseCreateInput): Promise<{
  success: boolean; data?: ExpenseRecord; error?: string;
}> {
  try {
    const user    = await getAuthenticatedUser();
    const expense = await db.expense.create({
      data: {
        orgId:       user.orgId,
        description: data.description,
        category:    data.category,
        amount:      data.amount,
        date:        data.date ? new Date(data.date) : new Date(),
        recordedBy:  user.name ?? user.email ?? "Staff",
        isPayroll:   data.isPayroll ?? data.category === "Payroll",
        notes:       data.notes ?? null,
      },
    });
    revalidatePath("/dashboard/accounting");
    return {
      success: true,
      data: {
        ...expense,
        date:      expense.date.toISOString().split("T")[0],
        recordedBy: expense.recordedBy ?? "Staff",
        isPayroll:  expense.isPayroll,
        notes:      expense.notes,
      },
    };
  } catch (error) {
    console.error("❌ createExpense:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create expense" };
  }
}

export async function getOrgExpenses(dateRange = "30d"): Promise<{
  success: boolean; data: ExpenseRecord[]; error?: string;
}> {
  try {
    const user              = await getAuthenticatedUser();
    const { startDate, endDate } = getDateRange(dateRange);
    const expenses          = await db.expense.findMany({
      where:   { orgId: user.orgId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "desc" },
    });
    return {
      success: true,
      data: expenses.map(e => ({
        ...e,
        date:      e.date.toISOString().split("T")[0],
        recordedBy: e.recordedBy ?? "Staff",
        notes:     e.notes,
      })),
    };
  } catch (error) {
    console.error("❌ getOrgExpenses:", error);
    return { success: false, data: [], error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    await db.expense.delete({ where: { id, orgId: user.orgId } });
    revalidatePath("/dashboard/accounting");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function createPayrollEntry(data: PayrollCreateInput): Promise<{
  success: boolean; data?: PayrollRecord; error?: string;
}> {
  try {
    const user  = await getAuthenticatedUser();
    const entry = await db.payrollEntry.create({
      data: {
        orgId:        user.orgId,
        employeeName: data.employeeName,
        role:         data.role ?? null,
        amount:       data.amount,
        period:       data.period,
        date:         data.date ? new Date(data.date) : new Date(),
        status:       data.status ?? "PENDING",
        notes:        data.notes ?? null,
      },
    });
    revalidatePath("/dashboard/accounting");
    return {
      success: true,
      data: {
        ...entry,
        role:   entry.role   ?? "",
        date:   entry.date.toISOString().split("T")[0],
        status: entry.status as "PAID" | "PENDING",
      },
    };
  } catch (error) {
    console.error("❌ createPayrollEntry:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function getOrgPayroll(period?: string): Promise<{
  success: boolean; data: PayrollRecord[]; error?: string;
}> {
  try {
    const user    = await getAuthenticatedUser();
    const entries = await db.payrollEntry.findMany({
      where:   { orgId: user.orgId, ...(period ? { period } : {}) },
      orderBy: { date: "desc" },
    });
    return {
      success: true,
      data: entries.map(e => ({
        ...e,
        role:   e.role   ?? "",
        date:   e.date.toISOString().split("T")[0],
        status: e.status as "PAID" | "PENDING",
      })),
    };
  } catch (error) {
    console.error("❌ getOrgPayroll:", error);
    return { success: false, data: [], error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function markPayrollPaid(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    await db.payrollEntry.update({ where: { id, orgId: user.orgId }, data: { status: "PAID" } });
    revalidatePath("/dashboard/accounting");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deletePayrollEntry(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    await db.payrollEntry.delete({ where: { id, orgId: user.orgId } });
    revalidatePath("/dashboard/accounting");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getDateRange(range: string) {
  const now   = new Date();
  const start = new Date();
  switch (range) {
    case "today": start.setHours(0, 0, 0, 0); break;
    case "7d":    start.setDate(now.getDate() - 7); break;
    case "30d":   start.setDate(now.getDate() - 30); break;
    case "90d":   start.setDate(now.getDate() - 90); break;
    default:      start.setDate(now.getDate() - 30);
  }
  return { startDate: start, endDate: now };
}