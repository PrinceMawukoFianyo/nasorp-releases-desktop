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
  /** SALES_ORDER = credit/invoice order | POS = walk-in cash | CREDIT_PAYMENT = payment collected on old credit | REFUND = money paid back on a return */
  type:          "SALES_ORDER" | "POS" | "CREDIT_PAYMENT" | "REFUND";
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
  /** true when this order has a negative (refund) SalesOrderPayment against it, or status === "RETURNED" */
  isRefunded:      boolean;
  refundAmount:    number;
  refundReference: string | null;
};

export type DaySummary = {
  date:                 string;   // "2026-03-19"
  label:                string;   // "Today" | "Tomorrow" | "Wed 20 Mar"
  isToday:              boolean;
  isFuture:             boolean;
  salesOrders:          DailySaleOrder[];   // source = SALES_ORDER
  posOrders:            DailySaleOrder[];   // source = POS
  creditPaid:           DailySaleOrder[];   // SalesOrderPayment + ManualDebtPayment records
  refunds:              DailySaleOrder[];   // negative SalesOrderPayment records (money paid back)
  totalRevenue:         number;             // POS + upfront deposits + credit payments collected
  totalPOS:             number;
  totalCreditInvoiced:  number;             // full billed value of all Credit Saless (the invoice total)
  totalCredit:          number;             // cash actually received upfront from Credit Saless
  totalCreditPaid:      number;             // credit payments collected on this day (including manual debts)
  totalRefunded:        number;             // sum of refunds processed on this day (nets out of revenue)
  refundCount:          number;             // number of orders refunded this day
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
    refunds:         [],
    totalRevenue:        0,
    totalPOS:            0,
    totalCreditInvoiced: 0,
    totalCredit:         0,
    totalCreditPaid:     0,
    totalRefunded:       0,
    refundCount:         0,
    orderCount:          0,
  };
}

// Refund payment references are written as "REFUND — RET-20260806-8873"
// (see actions/retuns.ts). Pull the RMA number back out for display/linking.
function parseRmaFromReference(reference: string | null): string | null {
  if (!reference) return null;
  const match = reference.match(/REFUND\s*[—-]\s*(\S+)/i);
  return match ? match[1] : null;
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

    // ── 2. Fetch positive credit payments collected in the date range ─────
    //    (amount > 0 — refunds are negative and are handled separately below,
    //     otherwise a refund on a credit order shows up here as a negative
    //     "payment collected", which is wrong.)
    const payments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
        amount: { gt: 0 },
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

    // ── 2b. Fetch refund payments processed in the date range ─────────────
    //    (amount < 0 — covers BOTH POS and credit orders; a refund on a POS
    //     order previously fell through every query entirely.)
    const refundPayments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
        amount: { lt: 0 },
      },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            lines: { include: { item: { select: { name: true, sku: true } } } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    // ── 2c. Fetch refund totals for orders in this window, regardless of ──
    //    when the refund itself was paid — so an order's row still shows
    //    "Refunded" even if the refund happened on a later day.
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

    const orderIds = orders.map(o => o.id);
    const orderRefunds = orderIds.length
      ? await db.salesOrderPayment.findMany({
          where: { orgId, orderId: { in: orderIds }, amount: { lt: 0 } },
          select: { orderId: true, amount: true, reference: true },
        })
      : [];

    const refundInfoByOrderId = new Map<string, { amount: number; reference: string | null }>();
    for (const r of orderRefunds) {
      const amt = Math.abs(Number(r.amount));
      const existing = refundInfoByOrderId.get(r.orderId);
      refundInfoByOrderId.set(r.orderId, {
        amount:    (existing?.amount ?? 0) + amt,
        reference: existing?.reference ?? parseRmaFromReference(r.reference),
      });
    }

    // ── 2b. Fetch manual debt payments collected in the date range ─────────
    const manualDebtPayments = await db.manualDebtPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
      },
      include: {
        manualDebt: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
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
      const refundInfo = refundInfoByOrderId.get(o.id);
      // Trust real refund payments first; fall back to status === "RETURNED"
      // for the rare case a return was recorded with no monetary refund.
      const isRefunded = !!refundInfo || o.status === "RETURNED";

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
        // NOTE: the refund flow (actions/retuns.ts) currently recomputes
        // amountOwing as (orderTotal - amountPaid) after a refund, which
        // makes a fully-refunded order look like it's still owed its full
        // value. We mask that here — a refunded order is never "owing".
        amountOwing:   isRefunded ? 0 : Number(o.amountOwing ?? 0),
        paymentMethod: o.paymentMethod ?? null,
        createdAt:     o.createdAt.toISOString(),
        time:          format(o.createdAt, "HH:mm"),
        items:         lineItems,
        notes:         o.notes ?? null,
        isRefunded,
        refundAmount:    refundInfo?.amount    ?? 0,
        refundReference: refundInfo?.reference ?? null,
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
        // ✨ Do NOT add amountPaid here – payments will be added from the payment loop
      }

      day.orderCount++;
    }

    // ── 5. Process standard credit payments (SalesOrderPayment) ───────────────
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
        isRefunded:      false,
        refundAmount:    0,
        refundReference: null,
      };

      day.creditPaid.push(entry);
      day.totalCreditPaid += Number(pmt.amount);
      day.totalRevenue    += Number(pmt.amount); // revenue = only cash collected today
    }

    // ── 5b. Process manual debt payments ────────────────────────────────────
    for (const pmt of manualDebtPayments) {
      const key = format(pmt.paidAt, "yyyy-MM-dd");
      const day = dayMap.get(key);
      if (!day) continue;

      const debt = pmt.manualDebt;
      const customer = debt.customer;

      const entry: DailySaleOrder = {
        orderId:       `debt-${debt.id}`,
        orderNumber:   `DEBT-${debt.id.slice(-8)}`,
        customerName:  customer?.name ?? "Deleted Customer",
        customerId:    customer?.id ?? "",
        customerEmail: customer?.email ?? "",
        customerPhone: customer?.phone ?? "",
        type:          "CREDIT_PAYMENT",
        status:        "PAID",
        paymentStatus: "PAID",
        total:         Number(pmt.amount),
        amountPaid:    Number(pmt.amount),
        amountOwing:   0,
        paymentMethod: pmt.method,
        createdAt:     pmt.paidAt.toISOString(),
        time:          format(pmt.paidAt, "HH:mm"),
        items:         [],   // manual debts have no line items
        notes:         `Manual debt payment${pmt.reference ? ` (${pmt.reference})` : ""}${pmt.recordedBy ? ` · recorded by ${pmt.recordedBy.name}` : ""}`,
        isRefunded:      false,
        refundAmount:    0,
        refundReference: null,
      };

      day.creditPaid.push(entry);
      day.totalCreditPaid += Number(pmt.amount);
      day.totalRevenue    += Number(pmt.amount);
    }

    // ── 5c. Process refund payments — money paid back to customers ────────
    //    Bucketed by the day the refund itself happened (paidAt), covering
    //    both POS and credit orders. This is what nets out of revenue and
    //    feeds the "Refunded" KPI card.
    for (const pmt of refundPayments) {
      const key = format(pmt.paidAt, "yyyy-MM-dd");
      const day = dayMap.get(key);
      if (!day) continue;

      const o = pmt.order;
      const refundAmt = Math.abs(Number(pmt.amount));
      const isPOS = o.orderNumber.startsWith("POS-") || o.source === "POS";
      const rmaNumber = parseRmaFromReference(pmt.reference);

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
        type:          "REFUND",
        status:        o.status,
        paymentStatus: o.paymentStatus,
        total:         refundAmt,
        amountPaid:    0,
        amountOwing:   0,
        paymentMethod: pmt.method,
        createdAt:     pmt.paidAt.toISOString(),
        time:          format(pmt.paidAt, "HH:mm"),
        items:         lineItems,   // full order's items — see note re: exact returned lines
        notes:         `Refund on order ${o.orderNumber}${rmaNumber ? ` (${rmaNumber})` : ""}`,
        isRefunded:      true,
        refundAmount:    refundAmt,
        refundReference: rmaNumber,
      };

      day.refunds.push(entry);
      day.totalRefunded += refundAmt;
      day.refundCount++;
      day.totalRevenue  -= refundAmt;
      if (isPOS) day.totalPOS -= refundAmt;
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