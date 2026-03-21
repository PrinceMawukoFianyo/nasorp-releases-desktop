// app/dashboard/sales/orders/credit/page.tsx

import { db }                   from "@/prisma/db"
import { getAuthenticatedUser }  from "@/config/useAuth"
import CreditPaymentTracker, {
  CreditOrder, PaymentRecord,
} from "../components/credit-payment-tracker"

// ── Fetch: SALES_ORDER source only, exclude CANCELLED + DRAFT + POS ───────────
//
// Three-layer filter to ensure ONLY genuine unpaid credit orders appear:
//
//  1. source = SALES_ORDER  → never include POS walk-in sales
//  2. status NOT IN [DRAFT, CANCELLED]  → cancelled orders owe nothing
//     e.g. if Maa Mercy's GH₵2,261 order was cancelled, status = CANCELLED
//     and it is excluded HERE at the database level before anything else runs
//  3. paymentStatus IN [PENDING, PARTIAL]  → PAID orders owe nothing
//
// All three conditions must pass. An order cancelled AFTER partial payment
// has status=CANCELLED AND paymentStatus=REFUNDED — excluded by both #2 and #3.
async function getCreditSalesOrders() {
  const user  = await getAuthenticatedUser()
  const orgId = user.orgId

  return db.salesOrder.findMany({
    where: {
      orgId,
      source:        "SALES_ORDER",                       // layer 1: never POS
      status:        { notIn: ["DRAFT", "CANCELLED"] },   // layer 2: never cancelled
      // Include all payment statuses so filters work
      // PAID orders are included so the "Paid" tab shows settled accounts
      paymentStatus: { in: ["PENDING", "PARTIAL", "PAID"] },
    },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, email: true },
      },
      payments: {
        // Exclude voided payments from the sum
        where:    { reference: { not: { contains: "VOIDED" } } },
        orderBy:  { paidAt: "asc" },
        select:   { id: true, amount: true, method: true, reference: true, paidAt: true, recordedById: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ── Adapter ───────────────────────────────────────────────────────────────────
function adaptOrder(o: Awaited<ReturnType<typeof getCreditSalesOrders>>[number]): CreditOrder {
  // Correct total: subtotal + tax + shipping - discount
  const totalAmount =
    Number(o.subtotal     ?? 0) +
    Number(o.taxAmount    ?? 0) +
    Number(o.shippingCost ?? 0) -
    Number(o.discount     ?? 0)

  // Paid = DB column if reliable, else sum of non-voided payments
  const paymentsSum = o.payments.reduce((s, p) => s + Number(p.amount), 0)
  const amountPaid  = Number(o.amountPaid ?? 0) > 0
    ? Number(o.amountPaid)
    : paymentsSum

  // Owing: only trust the DB column if it is > 0 AND paymentStatus is not PAID.
  // If paymentStatus is PAID → owes nothing.
  // If amountOwing DB column is 0 but paymentStatus is PENDING/PARTIAL →
  //   this is a legacy row — compute from total - paid.
  const amountOwing =
    o.paymentStatus === "PAID"
      ? 0  // PAID = nothing owed regardless of DB column
      : Number(o.amountOwing ?? 0) > 0
        ? Number(o.amountOwing)
        : Math.max(0, totalAmount - amountPaid)

  const paymentStatus: CreditOrder["paymentStatus"] =
    o.paymentStatus === "PAID"    ? "PAID"
    : o.paymentStatus === "PARTIAL" ? "PARTIAL"
    : "UNPAID"

  const payments: PaymentRecord[] = o.payments.map(p => ({
    id:         p.id,
    amount:     Number(p.amount),
    method:     p.method as PaymentRecord["method"],
    reference:  p.reference ?? undefined,
    paidAt:     new Date(p.paidAt),
    recordedBy: p.recordedById ?? undefined,
  }))

  return {
    id:            o.id,
    orderNumber:   o.orderNumber,
    customerId:    o.customerId ?? "",
    customerName:  o.customer?.name  ?? "Walk-in",
    customerPhone: o.customer?.phone ?? undefined,
    totalAmount,
    amountPaid,
    amountOwing,
    orderDate:     new Date(o.createdAt),
    deliveryDate:  o.deliveryDate ? new Date(o.deliveryDate) : null,
    paymentStatus,
    payments,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function CreditOrdersPage() {
  const rows   = await getCreditSalesOrders()
  const orders: CreditOrder[] = rows
    .map(adaptOrder)
    // Final guard: after adapter runs, only include orders where
    // amountOwing > 0. This catches any edge case where DB columns
    // are inconsistent (e.g. paymentStatus=PENDING but amountOwing=0
    // because the order total was 0, or a rounding issue).
    // Keep all orders — PAID ones have amountOwing=0 but should show in "Paid" filter
    .filter(o => o.amountOwing > 0.005 || o.paymentStatus === "PAID")

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit &amp; Payment Tracker</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor outstanding balances, record payments, and track overdue accounts.
        </p>
      </div>

      <CreditPaymentTracker orders={orders} />
    </div>
  )
}