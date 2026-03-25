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
  totalCreditInvoiced:  number;             // full billed value of all sales orders (the invoice total)
  totalCredit:          number;             // cash actually received upfront from sales orders
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
    // Get orgId from session so data is scoped to the logged-in org
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    if (!orgId) return { success: false, error: "Not authenticated" };

    const today = new Date();
    const from  = startOfDay(params.fromDate);
    const to    = endOfDay(params.toDate);

    // ── 1. Fetch all sales orders in the date range ──────────────────────────
    const orders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: from, lte: to },
        // Exclude DRAFT — only show confirmed / processing / completed / etc.
        status: { not: "DRAFT" },
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        lines: {
          include: {
            item: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── 2. Fetch payment records collected in the date range ─────────────────
    //    These are SalesOrderPayment rows — they record when a customer pays
    //    against a credit order (PENDING / PARTIAL → PAID).
    //    We only want payments on orders that were SALES_ORDER (not POS),
    //    because POS is paid immediately.
    const payments = await db.salesOrderPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: from, lte: to },
        order: {
          source: "SALES_ORDER",   // only credit order payments
        },
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true },
            },
            lines: {
              include: {
                item: { select: { name: true, sku: true } },
              },
            },
          },
        },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    // ── 3. Build a day-keyed map covering every day in the range ─────────────
    const dayMap = new Map<string, DaySummary>();
    let cursor = startOfDay(from);
    while (cursor <= to) {
      dayMap.set(format(cursor, "yyyy-MM-dd"), emptyDay(cursor, today));
      cursor = addDays(cursor, 1);
    }

    // ── 4. Assign orders to their day ────────────────────────────────────────
    //
    //  POS detection: use orderNumber.startsWith("POS-") — this is the
    //  reliable identifier used across the whole codebase, not o.source.
    //
    //  Revenue rules:
    //  • POS orders  → always fully paid at point of sale → full total is revenue
    //  • SALES_ORDER → may be on credit (PENDING/PARTIAL with amountPaid = 0).
    //      - A pure credit order (nothing paid upfront) adds 0 to today's revenue.
    //      - It still appears in salesOrders so staff can see it.
    //      - Any cash collected later appears in step 5 on the payment date.
    for (const o of orders) {
      const key = format(o.createdAt, "yyyy-MM-dd");
      const day = dayMap.get(key);
      if (!day) continue;

      const total       = orderTotal(o);
      const amountPaid  = Number(o.amountPaid);
      const amountOwing = Number(o.amountOwing);

      // Use orderNumber prefix as the reliable POS identifier
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
        amountPaid,
        amountOwing,
        paymentMethod: o.paymentMethod ?? null,
        createdAt:     o.createdAt.toISOString(),
        time:          format(o.createdAt, "HH:mm"),
        items:         lineItems,
        notes:         o.notes ?? null,
      };

      if (isPOS) {
        // POS: always fully paid at the till — full total is today's revenue
        day.posOrders.push(entry);
        day.totalPOS     += total;
        day.totalRevenue += total;
      } else {
        // SALES_ORDER:
        //  • totalCreditInvoiced = full billed value regardless of payment (what was issued on invoice)
        //  • totalCredit         = cash actually received upfront today (amountPaid)
        //  • totalRevenue        = only the cash actually collected today
        //    Pure credit orders (amountPaid=0) add nothing to revenue — they appear in
        //    creditPaid when the customer pays later (step 5).
        day.salesOrders.push(entry);
        day.totalCreditInvoiced += total;       // ← full invoice value
        day.totalCredit         += amountPaid;  // ← cash received upfront (may be 0)
        day.totalRevenue        += amountPaid;  // ← only real cash hits revenue
      }
      day.orderCount++;
    }

    // ── 5. Assign credit payments to their collection day ────────────────────
    //    Each SalesOrderPayment = real cash received from a debtor.
    //    Revenue is recognised on the day the payment was collected (paidAt),
    //    not the day the original credit order was created.
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
      day.totalRevenue    += Number(pmt.amount); // real cash received today
    }

    // ── 6. Build result ───────────────────────────────────────────────────────
    const days       = Array.from(dayMap.values());
    const grandTotal = days.reduce((s, d) => s + d.totalRevenue, 0);
    const periodLabel = `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;

    return { success: true, data: { days, grandTotal, periodLabel } };
  } catch (err: any) {
    console.error("[getDailySales]", err);
    return { success: false, error: err?.message ?? "Failed to fetch daily sales" };
  }
}