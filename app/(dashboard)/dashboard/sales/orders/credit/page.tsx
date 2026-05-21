// app/dashboard/sales/orders/credit/page.tsx

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import CreditPaymentTracker, {
  CreditOrder, PaymentRecord,
} from "../components/credit-payment-tracker"

// ── Helper: get all credit sales orders ─────────────────────────────────────
async function getCreditSalesOrders() {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId

  return db.salesOrder.findMany({
    where: {
      orgId,
      source: "SALES_ORDER",
      status: { notIn: ["DRAFT", "CANCELLED"] },
      paymentStatus: { in: ["PENDING", "PARTIAL", "PAID"] },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      payments: {
        where: { reference: { not: { contains: "VOIDED" } } },
        orderBy: { paidAt: "asc" },
        select: { id: true, amount: true, method: true, reference: true, paidAt: true, recordedById: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ── Helper: get all manual debts with payments ───────────────────────────────
async function getManualDebts() {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId

  return db.manualDebt.findMany({
    where: { orgId, status: { in: ["PENDING", "PARTIAL", "PAID"] } },
    include: {
      customer: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

// ── Adapter: convert a sales order to CreditOrder ────────────────────────────
function adaptSalesOrder(o: Awaited<ReturnType<typeof getCreditSalesOrders>>[number]): CreditOrder {
  const totalAmount =
    Number(o.subtotal ?? 0) +
    Number(o.taxAmount ?? 0) +
    Number(o.shippingCost ?? 0) -
    Number(o.discount ?? 0)

  const paymentsSum = o.payments.reduce((s, p) => s + Number(p.amount), 0)
  const amountPaid = Number(o.amountPaid ?? 0) > 0 ? Number(o.amountPaid) : paymentsSum

  const amountOwing =
    o.paymentStatus === "PAID"
      ? 0
      : Number(o.amountOwing ?? 0) > 0
        ? Number(o.amountOwing)
        : Math.max(0, totalAmount - amountPaid)

  const paymentStatus: CreditOrder["paymentStatus"] =
    o.paymentStatus === "PAID" ? "PAID"
    : o.paymentStatus === "PARTIAL" ? "PARTIAL"
    : "UNPAID"

  const payments: PaymentRecord[] = o.payments.map(p => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method as PaymentRecord["method"],
    reference: p.reference ?? undefined,
    paidAt: new Date(p.paidAt),
    recordedBy: p.recordedById ?? undefined,
  }))

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId ?? "",
    customerName: o.customer?.name ?? "Walk-in",
    customerPhone: o.customer?.phone ?? undefined,
    totalAmount,
    amountPaid,
    amountOwing,
    orderDate: new Date(o.createdAt),
    deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : null,
    paymentStatus,
    payments,
  }
}

// ── Adapter: convert a manual debt to CreditOrder ────────────────────────────
function adaptManualDebt(debt: Awaited<ReturnType<typeof getManualDebts>>[number]): CreditOrder {
  const totalAmount = debt.amountOwing + debt.amountPaid
  const amountOwing = debt.amountOwing
  const amountPaid = debt.amountPaid

  let paymentStatus: CreditOrder["paymentStatus"] = "UNPAID"
  if (debt.status === "PAID") paymentStatus = "PAID"
  else if (debt.amountPaid > 0) paymentStatus = "PARTIAL"

  const payments: PaymentRecord[] = debt.payments.map(p => ({
    id: p.id,
    amount: p.amount,
    method: p.method as PaymentRecord["method"],
    reference: p.reference ?? undefined,
    paidAt: new Date(p.paidAt),
    recordedBy: p.recordedById,
  }))

  return {
    id: `debt-${debt.id}`,
    orderNumber: `DEBT-${debt.id.slice(-8)}`,
    customerId: debt.customerId,
    customerName: debt.customer.name,
    customerPhone: debt.customer.phone ?? undefined,
    totalAmount,
    amountPaid,
    amountOwing,
    orderDate: debt.createdAt,
    deliveryDate: null,
    paymentStatus,
    payments,
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default async function CreditOrdersPage() {
  // Fetch both sources in parallel
  const [salesOrdersRows, manualDebts] = await Promise.all([
    getCreditSalesOrders(),
    getManualDebts(),
  ])

  // Convert each to CreditOrder
  const salesOrders: CreditOrder[] = salesOrdersRows.map(adaptSalesOrder)
  const debtOrders: CreditOrder[] = manualDebts.map(adaptManualDebt)

  // Merge all orders
  const allOrders = [...salesOrders, ...debtOrders]

  // Keep PAID orders so the "Paid" filter works
  const filteredOrders = allOrders.filter(o => o.amountOwing > 0.005 || o.paymentStatus === "PAID")

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit &amp; Payment Tracker</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor outstanding balances, record payments, and track overdue accounts.
          Manual debts appear with "DEBT‑..." order numbers.
        </p>
      </div>

      <CreditPaymentTracker orders={filteredOrders} />
    </div>
  )
}