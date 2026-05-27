// actions/daily-sales.ts
// Uses the exact schema from prisma/schema.prisma:
//   SalesOrder  → lines (SalesOrderLine[]) → item (Item)
//   SalesOrder  → customer (Customer?)
//   SalesOrder  → source: Source  (POS | SALES_ORDER)  ← distinguishes POS vs orders
//   SalesOrder  → payments (SalesOrderPayment[])       ← credit payments collected
//   SalesOrder  → subtotal + taxAmount - discount      ← total (no `total` column)

"use server";

import { db }          from "@/prisma/db";
import { startOfDay, endOfDay, format, addDays } from "date-fns";
import { getAuthenticatedUser } from "@/config/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SaleLineItem = {
  itemName:  string;
  sku:       string;
  quantity:  number;
  unitPrice: number;
  lineTotal: number;
};

export type DailySaleOrder = {
  orderId:       string;
  orderNumber:   string;
  customerName:  string;
  customerId:    string;
  customerEmail: string;
  customerPhone: string;
  /** SALES_ORDER = credit/invoice order | POS = walk-in cash | CREDIT_PAYMENT = payment collected on old credit */
  type:          "SALES_ORDER" | "POS" | "CREDIT_PAYMENT";
  status:        string;
  paymentStatus: string;
  total:         number;
  amountPaid:    number;
  amountOwing:   number;
  paymentMethod: string | null;
  createdAt:     string;
  time:          string;   // "HH:mm"
  items:         SaleLineItem[];
  notes:         string | null;
};

export type DaySummary = {
  date:                 string;   // "2026-03-19"
  label:                string;   // "Today" | "Tomorrow" | "Wed 20 Mar"
  isToday:              boolean;
  isFuture:             boolean;
  salesOrders:          DailySaleOrder[];   // source = SALES_ORDER
  posOrders:            DailySaleOrder[];   // source = POS
  creditPaid:           DailySaleOrder[];   // SalesOrderPayment records
  totalRevenue:         number;             // POS + upfront deposits + credit payments collected
  totalPOS:             number;
  totalCreditInvoiced:  number;             // full billed value of all Credit Saless (the invoice total)
  totalCredit:          number;             // cash actually received upfront from Credit Saless
  totalCreditPaid:      number;             // credit payments collected on this day
  orderCount:           number;
};

export type DailySalesResult = {
  days:        DaySummary[];
  grandTotal:  number;
  periodLabel: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function orderTotal(o: { subtotal: number; taxAmount: number; shippingCost: number | null; discount: number | null }): number {
  return (
    Number(o.subtotal)            +
    Number(o.taxAmount)           +
    Number(o.shippingCost ?? 0)   -
    Number(o.discount     ?? 0)
  );
}

function dayLabel(date: Date, today: Date): string {
  const diff = Math.round(
    (startOfDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000
  );
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(date, "EEE d MMM");
}

function emptyDay(date: Date, today: Date): DaySummary {
  const key = format(date, "yyyy-MM-dd");
  return {
    date:            key,
    label:           dayLabel(date, today),
    isToday:         format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
    isFuture:        startOfDay(date) > startOfDay(today),
    salesOrders:     [],
    posOrders:       [],
    creditPaid:      [],
    totalRevenue:        0,
    totalPOS:            0,
    totalCreditInvoiced: 0,
    totalCredit:         0,
    totalCreditPaid:     0,
    orderCount:          0,
  };
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function getDailySales(params: {
  fromDate: Date;
  toDate:   Date;
}): Promise<{ success: true; data: DailySalesResult } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    if (!orgId) return { success: false, error: "Not authenticated" };

    const today = new Date();
    const from  = startOfDay(params.fromDate);
    const to    = endOfDay(params.toDate);

    // ── 1. Fetch all orders (sales orders + POS) ──────────────────────────
    const orders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: from, lte: to },
        status: { not: "DRAFT" },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        lines: { include: { item: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── 2. Fetch all payments collected in the date range ─────────────────
    const payments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
        order: { source: "SALES_ORDER" },
      },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            lines: { include: { item: { select: { name: true, sku: true } } } },
          },
        },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    // ── 3. Build day map covering every day in the range ─────────────────
    const dayMap = new Map<string, DaySummary>();
    let cursor = startOfDay(from);
    while (cursor <= to) {
      dayMap.set(format(cursor, "yyyy-MM-dd"), emptyDay(cursor, today));
      cursor = addDays(cursor, 1);
    }

    // ── 4. Process orders ────────────────────────────────────────────────
    for (const o of orders) {
      const key = format(o.createdAt, "yyyy-MM-dd");
      const day = dayMap.get(key);
      if (!day) continue;

      const total = orderTotal(o);
      const isPOS = o.orderNumber.startsWith("POS-") || o.source === "POS";

      const lineItems: SaleLineItem[] = o.lines.map(li => ({
        itemName:  li.item?.name  ?? "Unknown Item",
        sku:       li.item?.sku   ?? "—",
        quantity:  li.quantity,
        unitPrice: Number(li.unitPrice),
        lineTotal: Number(li.total),
      }));

      const entry: DailySaleOrder = {
        orderId:       o.id,
        orderNumber:   o.orderNumber,
        customerName:  o.customer?.name  ?? "Walk-in",
        customerId:    o.customer?.id    ?? "",
        customerEmail: o.customer?.email ?? "",
        customerPhone: o.customer?.phone ?? "",
        type:          isPOS ? "POS" : "SALES_ORDER",
        status:        o.status,
        paymentStatus: o.paymentStatus,
        total,
        amountPaid:    Number(o.amountPaid ?? 0),
        amountOwing:   Number(o.amountOwing ?? 0),
        paymentMethod: o.paymentMethod ?? null,
        createdAt:     o.createdAt.toISOString(),
        time:          format(o.createdAt, "HH:mm"),
        items:         lineItems,
        notes:         o.notes ?? null,
      };

      if (isPOS) {
        // POS: full total is revenue (paid at the till)
        day.posOrders.push(entry);
        day.totalPOS     += total;
        day.totalRevenue += total;
      } else {
        // Credit order: only track the invoice value (not revenue)
        day.salesOrders.push(entry);
        day.totalCreditInvoiced += total;   // full invoice amount (info only)
        // ✨ FIX: Do NOT add amountPaid here – payments will be added from the payment loop
      }
      day.orderCount++;
    }

    // ── 5. Process payments (these are real cash collected) ───────────────
    for (const pmt of payments) {
      const key = format(pmt.paidAt, "yyyy-MM-dd");
      const day = dayMap.get(key);
      if (!day) continue;

      const o = pmt.order;

      const lineItems: SaleLineItem[] = o.lines.map(li => ({
        itemName:  li.item?.name  ?? "Unknown Item",
        sku:       li.item?.sku   ?? "—",
        quantity:  li.quantity,
        unitPrice: Number(li.unitPrice),
        lineTotal: Number(li.total),
      }));

      const entry: DailySaleOrder = {
        orderId:       o.id,
        orderNumber:   o.orderNumber,
        customerName:  o.customer?.name  ?? "Unknown",
        customerId:    o.customer?.id    ?? "",
        customerEmail: o.customer?.email ?? "",
        customerPhone: o.customer?.phone ?? "",
        type:          "CREDIT_PAYMENT",
        status:        "PAID",
        paymentStatus: "PAID",
        total:         Number(pmt.amount),
        amountPaid:    Number(pmt.amount),
        amountOwing:   0,
        paymentMethod: pmt.method,
        createdAt:     pmt.paidAt.toISOString(),
        time:          format(pmt.paidAt, "HH:mm"),
        items:         lineItems,
        notes:         `Payment on order ${o.orderNumber}${pmt.recordedBy ? ` · recorded by ${pmt.recordedBy.name}` : ""}`,
      };

      day.creditPaid.push(entry);
      day.totalCreditPaid += Number(pmt.amount);
      day.totalRevenue    += Number(pmt.amount); // revenue = only cash collected today
    }

    // ── 6. Build result ───────────────────────────────────────────────────
    const days = Array.from(dayMap.values());
    const grandTotal = days.reduce((s, d) => s + d.totalRevenue, 0);
    const periodLabel = `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;

    return { success: true, data: { days, grandTotal, periodLabel } };
  } catch (err: any) {
    console.error("[getDailySales]", err);
    return { success: false, error: err?.message ?? "Failed to fetch daily sales" };
  }
}

export interface StaffSaleDetail {
  userId: string;
  userName: string;
  salesAmount: number;
  orderCount: number;
  posAmount: number;
  posCount: number;
  creditAmount: number;
  creditCount: number;
}

export interface StaffSalesDay {
  date: string;
  totalRevenue: number;
  staff: StaffSaleDetail[];
}

export async function getStaffSalesBreakdown(
  fromDate: Date,
  toDate: Date
): Promise<{ success: true; data: StaffSalesDay[] } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;

    const from = startOfDay(fromDate);
    const to = endOfDay(toDate);

    // 1. Credit Saless (source = SALES_ORDER)
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: from, lte: to },
        source: "SALES_ORDER",
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: {
        createdById: true,
        createdAt: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
      },
    });

    // 2. POS orders (orderNumber starts with "POS-")
    const posOrders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: from, lte: to },
        orderNumber: { startsWith: "POS-" },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: {
        createdById: true,
        createdAt: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
      },
    });

    // Helper to compute order total
    const orderTotal = (o: { subtotal: number; taxAmount: number; shippingCost: number | null; discount: number | null }) =>
      (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0);

    // 3. Credit payments (SalesOrderPayment) where reference not voided
    const creditPayments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
        reference: { not: { contains: "VOIDED" } },
      },
      select: {
        amount: true,
        recordedById: true,
        paidAt: true,
      },
    });

    // Map to collect data per day
    const dayMap = new Map<string, Map<string, StaffSaleDetail>>();

    // Helper to add to day/user
    const addToDay = (dateKey: string, userId: string, userName: string, amount: number, type: "order" | "pos" | "credit") => {
      let day = dayMap.get(dateKey);
      if (!day) {
        day = new Map();
        dayMap.set(dateKey, day);
      }
      let staff = day.get(userId);
      if (!staff) {
        staff = {
          userId,
          userName,
          salesAmount: 0,
          orderCount: 0,
          posAmount: 0,
          posCount: 0,
          creditAmount: 0,
          creditCount: 0,
        };
        day.set(userId, staff);
      }
      if (type === "order") {
        staff.salesAmount += amount;
        staff.orderCount += 1;
      } else if (type === "pos") {
        staff.salesAmount += amount;
        staff.posAmount += amount;
        staff.posCount += 1;
      } else if (type === "credit") {
        staff.salesAmount += amount;
        staff.creditAmount += amount;
        staff.creditCount += 1;
      }
    };

    // Fetch user names in batch
    const userIds = new Set<string>();
    for (const o of [...salesOrders, ...posOrders]) if (o.createdById) userIds.add(o.createdById);
    for (const p of creditPayments) if (p.recordedById) userIds.add(p.recordedById);
    const users = await db.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, firstName: true, lastName: true },
    });
    const userNameMap = new Map<string, string>();
    for (const u of users) {
      userNameMap.set(u.id, u.name || `${u.firstName} ${u.lastName}`.trim() || u.id);
    }

    // Process Credit Saless
    for (const o of salesOrders) {
      const dateKey = format(o.createdAt, "yyyy-MM-dd");
      const amount = orderTotal(o);
      if (amount === 0) continue;
      const userId = o.createdById;
      const userName = userNameMap.get(userId) || "Unknown";
      addToDay(dateKey, userId, userName, amount, "order");
    }

    // Process POS orders
    for (const o of posOrders) {
      const dateKey = format(o.createdAt, "yyyy-MM-dd");
      const amount = orderTotal(o);
      if (amount === 0) continue;
      const userId = o.createdById;
      const userName = userNameMap.get(userId) || "Unknown";
      addToDay(dateKey, userId, userName, amount, "pos");
    }

    // Process credit payments
    for (const p of creditPayments) {
      const dateKey = format(p.paidAt, "yyyy-MM-dd");
      const amount = p.amount;
      if (amount === 0) continue;
      const userId = p.recordedById;
      const userName = userNameMap.get(userId) || "Unknown";
      addToDay(dateKey, userId, userName, amount, "credit");
    }

    // Build result array
    const result: StaffSalesDay[] = [];
    for (const [dateKey, staffMap] of dayMap.entries()) {
      const staffArray = Array.from(staffMap.values());
      const totalRevenue = staffArray.reduce((sum, s) => sum + s.salesAmount, 0);
      result.push({
        date: dateKey,
        totalRevenue,
        staff: staffArray.sort((a, b) => b.salesAmount - a.salesAmount),
      });
    }
    result.sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: result };
  } catch (error: any) {
    console.error("getStaffSalesBreakdown error:", error);
    return { success: false, error: error.message || "Failed to load staff sales" };
  }
}