// app/dashboard/sales/orders/credit/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server component — fetches all credit orders (unpaid + partial + paid),
// adapts DB rows to CreditOrder shape, then renders the client tracker.
// ─────────────────────────────────────────────────────────────────────────────

import { getCreditOrders } from "@/actions/sales-orders"
import CreditPaymentTracker, { CreditOrder, PaymentRecord } from "../components/credit-payment-tracker"

// ── Adapter: DB row → CreditOrder ─────────────────────────────────────────────
//
// Key differences between Prisma output and the component's type:
//
//  DB field            │ Component field   │ Notes
//  ────────────────────┼───────────────────┼──────────────────────────────────
//  paymentStatus       │ paymentStatus     │ DB: PENDING | PARTIAL | PAID
//                      │                   │ Component: UNPAID | PARTIAL | PAID
//  (no totalAmount)    │ totalAmount       │ computed: subtotal+tax+shipping-discount
//  amountPaid          │ amountPaid        │ direct
//  amountOwing         │ amountOwing       │ direct (DB keeps this in sync)
//  customer.name       │ customerName      │ nested → flat
//  customer.phone      │ customerPhone     │ nested → flat
//  payments[].paidAt   │ payments[].paidAt │ may be string from JSON serialisation
//  payments[].method   │ payments[].method │ direct
//

type DbOrder = NonNullable<Awaited<ReturnType<typeof getCreditOrders>>["data"]>[number]

function adaptOrder(o: DbOrder): CreditOrder {
  const totalAmount =
    (o.subtotal ?? 0) +
    (o.taxAmount ?? 0) +
    (o.shippingCost ?? 0) -
    (o.discount ?? 0)

  // Map PENDING → UNPAID so the tracker's badge logic works correctly
  const paymentStatus: CreditOrder["paymentStatus"] =
    o.paymentStatus === "PAID"    ? "PAID"
    : o.paymentStatus === "PARTIAL" ? "PARTIAL"
    : "UNPAID"

  const payments: PaymentRecord[] = (o.payments ?? []).map((p) => ({
    id:          p.id,
    amount:      p.amount,
    method:      p.method as PaymentRecord["method"],
    reference:   p.reference ?? undefined,
    paidAt:      new Date(p.paidAt),
    recordedBy:  p.recordedById ?? undefined,
  }))

  return {
    id:            o.id,
    orderNumber:   o.orderNumber,
    customerId:    o.customerId ?? "",
    customerName:  o.customer?.name ?? "Unknown",
    customerPhone: o.customer?.phone ?? undefined,
    totalAmount,
    amountPaid:    o.amountPaid  ?? 0,
    amountOwing:   o.amountOwing ?? Math.max(0, totalAmount - (o.amountPaid ?? 0)),
    orderDate:     new Date(o.createdAt),
    deliveryDate:  o.deliveryDate ? new Date(o.deliveryDate) : null,
    paymentStatus,
    payments,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CreditOrdersPage() {
  // showPaid = true so the tracker can display all statuses and allow filtering
  const result = await getCreditOrders(true)

  const orders: CreditOrder[] = (result.data ?? []).map(adaptOrder)

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit & Payment Tracker</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor outstanding balances, record payments, and track overdue accounts.
        </p>
      </div>

      <CreditPaymentTracker orders={orders} />
    </div>
  )
}