"use server";

import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { format, startOfDay, endOfDay } from "date-fns";
import { unstable_noStore as noStore } from "next/cache";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type StaffTransaction = {
  id: string;
  /**
   * POS_SALE     – source=POS (walked in, paid on the spot)
   * CASH_SALE    – SALES_ORDER fully paid (paymentStatus=PAID, not via POS source)
   * CREDIT_SALE  – SALES_ORDER with outstanding balance
   * CREDIT_PAYMENT – a payment collected against an existing credit order
   */
  type: "POS_SALE" | "CASH_SALE" | "CREDIT_SALE" | "CREDIT_PAYMENT";
  orderNumber: string;
  customerName: string;
  amount: number;
  date: Date;
  paymentMethod?: string;
};

export type StaffDailySummary = {
  date: string;
  totalRevenue: number;
  ordersCount: number;
  transactions: StaffTransaction[];
};

export type StaffPerformance = {
  userId: string;
  userName: string;
  totalRevenue: number;
  totalOrders: number;
  dailyBreakdown: StaffDailySummary[];
};

// ─────────────────────────────────────────────────────────────────────
// Get the date of the very first order in the org (for "All Time" UX)
// ─────────────────────────────────────────────────────────────────────
export async function getEarliestOrderDate(): Promise<
  { success: true; date: Date } | { success: false; error: string }
> {
  noStore();
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;

    const earliest = await db.salesOrder.findFirst({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    // Fall back to Jan 1 of current year if no orders exist yet
    return {
      success: true,
      date: earliest?.createdAt ?? new Date(new Date().getFullYear(), 0, 1),
    };
  } catch (error: any) {
    console.error("getEarliestOrderDate error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Main staff performance fetch
// fromDate = null  →  no lower bound (all-time up to toDate)
// ─────────────────────────────────────────────────────────────────────
export async function getStaffPerformance(
  fromDate: Date | null,
  toDate: Date
): Promise<
  { success: true; data: StaffPerformance[] } | { success: false; error: string }
> {
  noStore(); // always hit the DB fresh – never serve a cached response
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;

    const to   = endOfDay(toDate);
    const from = fromDate ? startOfDay(fromDate) : undefined;

    // Build date filters conditionally so null fromDate means "from the beginning"
    const createdAtFilter = from ? { gte: from, lte: to } : { lte: to };
    const paidAtFilter    = from ? { gte: from, lte: to } : { lte: to };

    // ── 1. Credit Saless (excluding DRAFT and CANCELLED) ───────────────
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: createdAtFilter,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
        amountPaid: true,
        paymentStatus: true,
        customer: { select: { name: true } },
        createdBy: { select: { id: true, name: true } },
        source: true,
        paymentMethod: true,
      },
    });

    // ── 2. Credit payments recorded in this period ────────────────────
    const creditPayments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: paidAtFilter,
        reference: { not: { contains: "VOIDED" } },
        order: { source: "SALES_ORDER" },
      },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        recordedBy: { select: { id: true, name: true } },
        order: {
          select: {
            orderNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    // ── Group by user ──────────────────────────────────────────────────
    const userMap = new Map<
      string,
      { name: string; orders: typeof salesOrders; payments: typeof creditPayments }
    >();

    const ensureUser = (userId: string, userName: string) => {
      if (!userMap.has(userId)) {
        userMap.set(userId, { name: userName, orders: [], payments: [] });
      }
    };

    for (const so of salesOrders) {
      if (!so.createdBy) continue;
      ensureUser(so.createdBy.id, so.createdBy.name);
      userMap.get(so.createdBy.id)!.orders.push(so);
    }

    for (const payment of creditPayments) {
      if (!payment.recordedBy) continue;
      ensureUser(payment.recordedBy.id, payment.recordedBy.name);
      userMap.get(payment.recordedBy.id)!.payments.push(payment);
    }

    // ── Build performance records ──────────────────────────────────────
    const performance: StaffPerformance[] = [];

    for (const [userId, data] of userMap.entries()) {
      const allTransactions: StaffTransaction[] = [
        ...data.orders.map((so): StaffTransaction => {
          const total =
            (so.subtotal ?? 0) +
            (so.taxAmount ?? 0) +
            (so.shippingCost ?? 0) -
            (so.discount ?? 0);

          const isPOS        = so.source === "POS";
          const isFullyPaid  = so.paymentStatus === "PAID";

          /**
           * ─── FIX: revenue was showing 0 for walk-in cash orders ───────
           *
           * Root cause: many cash/walk-in orders are stored with
           * source="SALES_ORDER" (not "POS"), and amountPaid=0 even though
           * the customer paid in full (paymentStatus="PAID").
           *
           * Rule:
           *   • POS source          → full order total
           *   • paymentStatus=PAID  → full order total (covers cash sales)
           *   • anything else       → only amountPaid (genuine credit sales)
           */
          const revenue = isPOS || isFullyPaid ? total : (so.amountPaid ?? 0);

          const txType: StaffTransaction["type"] = isPOS
            ? "POS_SALE"
            : isFullyPaid
            ? "CASH_SALE"
            : "CREDIT_SALE";

          return {
            id: so.id,
            type: txType,
            orderNumber: so.orderNumber,
            customerName: so.customer?.name || "Walk-in",
            amount: revenue,
            date: so.createdAt,
            paymentMethod: so.paymentMethod || undefined,
          };
        }),

        ...data.payments.map((p): StaffTransaction => ({
          id: p.id,
          type: "CREDIT_PAYMENT",
          orderNumber: p.order.orderNumber,
          customerName: p.order.customer?.name || "Unknown",
          amount: p.amount,
          date: p.paidAt,
          paymentMethod: p.method,
        })),
      ];

      allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      // ── Daily breakdown ──────────────────────────────────────────────
      const dailyMap = new Map<
        string,
        { revenue: number; count: number; txs: StaffTransaction[] }
      >();

      for (const tx of allTransactions) {
        const dateKey = format(tx.date, "yyyy-MM-dd");
        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.revenue += tx.amount;
          existing.count++;
          existing.txs.push(tx);
        } else {
          dailyMap.set(dateKey, { revenue: tx.amount, count: 1, txs: [tx] });
        }
      }

      const dailyBreakdown: StaffDailySummary[] = Array.from(
        dailyMap.entries()
      )
        .map(([date, d]) => ({
          date,
          totalRevenue: d.revenue,
          ordersCount: d.count,
          transactions: d.txs,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)); // newest first

      const totalRevenue = allTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );

      performance.push({
        userId,
        userName: data.name,
        totalRevenue,
        totalOrders: allTransactions.length,
        dailyBreakdown,
      });
    }

    performance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return { success: true, data: performance };
  } catch (error: any) {
    console.error("getStaffPerformance error:", error);
    return { success: false, error: error.message };
  }
}