// actions/credit-ledger.ts
"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { format } from "date-fns"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | "ORDER_CREATED"
  | "PAYMENT_RECEIVED"
  | "ORDER_CANCELLED"
  | "RETURN_REFUND"
  | "PAYMENT_VOIDED"
  | "STATUS_CHANGE"

export interface LedgerEntry {
  id:            string
  eventType:     LedgerEventType
  eventLabel:    string
  orderId:       string
  orderNumber:   string
  customerId:    string | null
  customerName:  string
  customerPhone: string | null
  locationName:  string
  date:          string
  rawDate:       Date
  orderTotal:    number
  amountPaid:    number
  amountOwing:   number
  paymentMethod: string | null
  reference:     string | null
  paymentStatus: string
  orderStatus:   string
  notes:         string | null
  recordedBy:    string | null
}

export interface CreditLedgerSummary {
  totalCreditGiven:    number
  totalCollected:      number
  totalOutstanding:    number
  totalCancelled:      number
  totalRefunded:       number
  activeDebtors:       number
  overdueCount:        number
  paidCount:           number
  partialCount:        number
  pendingCount:        number
}

export interface CreditLedgerData {
  entries:    LedgerEntry[]
  summary:    CreditLedgerSummary
  exportRows: CsvRow[]
}

export interface CsvRow {
  Date:              string
  "Order #":         string
  Customer:          string
  Phone:             string
  Location:          string
  Event:             string
  "Order Total":     string
  "Amount Paid":     string
  "Amount Owing":    string
  "Payment Method":  string
  Reference:         string
  "Payment Status":  string
  "Order Status":    string
  Notes:             string
  "Recorded By":     string
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — order total formula
// ─────────────────────────────────────────────────────────────────────────────
function calcTotal(o: {
  subtotal: number; taxAmount: number;
  shippingCost: number | null; discount: number | null
}): number {
  return (
    Number(o.subtotal      ?? 0) +
    Number(o.taxAmount     ?? 0) +
    Number(o.shippingCost  ?? 0) -
    Number(o.discount      ?? 0)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — compute true amountOwing for an order
//
// The key insight: we must NEVER use amountOwing from the DB if paymentStatus
// is PAID, because PAID means the customer owes nothing regardless of what
// the column says. Similarly for CANCELLED orders.
//
// Priority:
//  1. If status=CANCELLED → 0 (cancelled orders owe nothing)
//  2. If paymentStatus=PAID → 0 (fully paid)
//  3. If amountOwing DB column > 0 → use it (maintained by recordPayment)
//  4. Fallback: orderTotal - amountPaid (for legacy rows where column was 0)
// ─────────────────────────────────────────────────────────────────────────────
function computeOwing(o: {
  subtotal: number; taxAmount: number; shippingCost: number | null; discount: number | null
  amountPaid: number | null; amountOwing: number | null
  paymentStatus: string; status: string
}): number {
  // Cancelled or fully paid → owes nothing
  if (o.status === "CANCELLED") return 0
  if (o.paymentStatus === "PAID") return 0

  const orderTotal = calcTotal(o)
  const paid       = Number(o.amountPaid ?? 0)

  // Trust the DB column if it's positive
  if (Number(o.amountOwing ?? 0) > 0) return Number(o.amountOwing)

  // Fallback for legacy rows
  return Math.max(0, orderTotal - paid)
}

// ─────────────────────────────────────────────────────────────────────────────
// getCreditLedger
// ─────────────────────────────────────────────────────────────────────────────
export async function getCreditLedger(filters?: {
  fromDate?:         Date
  toDate?:           Date
  customerId?:       string
  orderId?:          string
  paymentStatus?:    string
  includeFullyPaid?: boolean
}): Promise<{ success: boolean; data?: CreditLedgerData; error?: string }> {
  try {
    const user     = await getAuthenticatedUser()
    const from     = filters?.fromDate
    const to       = filters?.toDate
    const showPaid = filters?.includeFullyPaid ?? true

    // ── 1. Fetch active sales orders ──────────────────────────────────
    const where: any = {
      orgId:  user.orgId,
      source: "SALES_ORDER",
      status: { notIn: ["CANCELLED", "DRAFT"] },
      OR: showPaid
        ? [
            { paymentStatus: "PENDING"  },
            { paymentStatus: "PARTIAL"  },
            { paymentStatus: "PAID"     },
          ]
        : [
            { paymentStatus: "PENDING" },
            { paymentStatus: "PARTIAL" },
          ],
    }

    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
      delete where.OR
      where.paymentStatus = filters.paymentStatus
    }
    if (filters?.customerId) where.customerId = filters.customerId
    if (filters?.orderId)    where.id         = filters.orderId
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to   && { lte: to   }),
      }
    }

    const orders = await db.salesOrder.findMany({
      where,
      include: {
        customer:  { select: { id: true, name: true, phone: true, email: true } },
        location:  { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        lines:     { include: { item: { select: { id: true, name: true, sku: true } } } },
        payments: {
          where:   { reference: { not: { contains: "VOIDED" } } },
          orderBy: { paidAt: "asc" },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // ── 2. Fetch cancelled sales orders ───────────────────────────────
    const cancelledOrders = await db.salesOrder.findMany({
      where: {
        orgId:  user.orgId,
        source: "SALES_ORDER",
        status: "CANCELLED",
        ...(from || to ? { createdAt: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        }} : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      },
      include: {
        customer:  { select: { id: true, name: true, phone: true } },
        location:  { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // ── 3. Fetch manual debts ─────────────────────────────────────────
    const manualDebts = await db.manualDebt.findMany({
      where: {
        orgId: user.orgId,
        ...(from ? { createdAt: { gte: from } } : {}),
        ...(to   ? { createdAt: { lte: to   } } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        payments: {
          include: { recordedBy: { select: { name: true } } },
        },
      },
    })

    // ── 4. Build ledger entries (sales orders) ────────────────────────
    const entries: LedgerEntry[] = []

    // ---- Active orders ----
    for (const order of orders) {
      const orderTotal  = calcTotal(order)
      const paymentsSum = order.payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
      const amountPaid  = Number(order.amountPaid ?? 0) > 0 ? Number(order.amountPaid) : paymentsSum
      const amountOwing = computeOwing({ ...order, amountPaid })

      const base = {
        orderId:       order.id,
        orderNumber:   order.orderNumber,
        customerId:    order.customerId,
        customerName:  order.customer?.name  ?? "Walk-in",
        customerPhone: order.customer?.phone ?? null,
        locationName:  order.location?.name  ?? "N/A",
        orderTotal,
        amountPaid,
        amountOwing,
        paymentStatus: order.paymentStatus,
        orderStatus:   order.status,
        recordedBy:    order.createdBy?.name ?? null,
      }

      entries.push({
        ...base,
        id:            `${order.id}-created`,
        eventType:     "ORDER_CREATED",
        eventLabel:    "Credit Order Created",
        date:          format(order.createdAt, "dd MMM yyyy, hh:mm a"),
        rawDate:       order.createdAt,
        paymentMethod: order.paymentMethod ?? null,
        reference:     null,
        notes:         order.notes ?? null,
      })

      for (const payment of (order.payments as any[])) {
        entries.push({
          ...base,
          id:            payment.id,
          eventType:     "PAYMENT_RECEIVED",
          eventLabel:    `Payment Received — ${payment.method.replace("_", " ")}`,
          date:          format(new Date(payment.paidAt), "dd MMM yyyy, hh:mm a"),
          rawDate:       new Date(payment.paidAt),
          paymentMethod: payment.method,
          reference:     payment.reference ?? null,
          amountPaid:    Number(payment.amount),
          amountOwing,   // still the same owing after this payment? For ledger it's fine
          notes:         payment.reference ?? null,
          recordedBy:    payment.recordedBy?.name ?? base.recordedBy,
        })
      }
    }

    // ---- Cancelled orders (only if not already added) ----
    for (const order of cancelledOrders) {
      const alreadyAdded = entries.some(e => e.orderId === order.id)
      if (!alreadyAdded) {
        entries.push({
          id:            `${order.id}-cancelled`,
          eventType:     "ORDER_CANCELLED",
          eventLabel:    "Credit Order Cancelled — Stock Reversed",
          orderId:       order.id,
          orderNumber:   order.orderNumber,
          customerId:    order.customerId,
          customerName:  order.customer?.name  ?? "Walk-in",
          customerPhone: order.customer?.phone ?? null,
          locationName:  order.location?.name  ?? "N/A",
          date:          format(order.updatedAt, "dd MMM yyyy, hh:mm a"),
          rawDate:       order.updatedAt,
          orderTotal:    calcTotal(order),
          amountPaid:    0,
          amountOwing:   0,
          paymentMethod: null,
          reference:     null,
          paymentStatus: order.paymentStatus,
          orderStatus:   "CANCELLED",
          notes:         order.notes ?? null,
          recordedBy:    order.createdBy?.name ?? null,
        })
      }
    }

    // ── 5. Add manual debt events ─────────────────────────────────────
    for (const debt of manualDebts) {
      const totalAmount = debt.amountOwing + debt.amountPaid
      const amountOwing = debt.amountOwing
      const amountPaid  = debt.amountPaid

      entries.push({
        id:            `manual-${debt.id}`,
        eventType:     "ORDER_CREATED",
        eventLabel:    "Manual Debt Recorded",
        orderId:       `debt-${debt.id}`,
        orderNumber:   `DEBT-${debt.id.slice(-8)}`,
        customerId:    debt.customerId,
        customerName:  debt.customer.name,
        customerPhone: debt.customer.phone,
        locationName:  "Manual Entry",
        date:          format(debt.createdAt, "dd MMM yyyy, hh:mm a"),
        rawDate:       debt.createdAt,
        orderTotal:    totalAmount,
        amountPaid:    amountPaid,
        amountOwing:   amountOwing,
        paymentMethod: null,
        reference:     null,
        paymentStatus: debt.status === "PAID" ? "PAID" : (debt.amountPaid > 0 ? "PARTIAL" : "PENDING"),
        orderStatus:   "CONFIRMED",
        notes:         debt.notes,
        recordedBy: (debt as any).createdBy?.name ?? null,
      })

      for (const pay of debt.payments) {
        entries.push({
          id:            `manual-pay-${pay.id}`,
          eventType:     "PAYMENT_RECEIVED",
          eventLabel:    "Manual Debt Payment",
          orderId:       `debt-${debt.id}`,
          orderNumber:   `DEBT-${debt.id.slice(-8)}`,
          customerId:    debt.customerId,
          customerName:  debt.customer.name,
          customerPhone: debt.customer.phone,
          locationName:  "Manual Entry",
          date:          format(pay.paidAt, "dd MMM yyyy, hh:mm a"),
          rawDate:       pay.paidAt,
          orderTotal:    totalAmount,
          amountPaid:    pay.amount,
          amountOwing:   amountOwing,
          paymentMethod: pay.method,
          reference:     pay.reference,
          paymentStatus: debt.status === "PAID" ? "PAID" : (debt.amountPaid > 0 ? "PARTIAL" : "PENDING"),
          orderStatus:   "CONFIRMED",
          notes:         null,
          recordedBy:    pay.recordedBy?.name ?? null,
        })
      }
    }

    entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

    // ── 6. Summary statistics (including manual debts) ─────────────────
    const now = new Date()

    const totalCreditGiven = orders.reduce((s, o) => s + calcTotal(o), 0) +
      manualDebts.reduce((s, d) => s + (d.amountOwing + d.amountPaid), 0)

    const totalCollected = orders.reduce((s, o) => {
      const paymentsSum = (o.payments as any[]).reduce((ps: number, p: any) => ps + Number(p.amount), 0)
      return s + (Number(o.amountPaid ?? 0) > 0 ? Number(o.amountPaid) : paymentsSum)
    }, 0) + manualDebts.reduce((s, d) => s + d.amountPaid, 0)

    const totalOutstanding = orders.reduce((s, o) => s + computeOwing(o), 0) +
      manualDebts.filter(d => d.status !== "PAID" && d.status !== "CANCELLED").reduce((s, d) => s + d.amountOwing, 0)

    const totalCancelled = cancelledOrders.reduce((s, o) => s + calcTotal(o), 0)
    const totalRefunded  = cancelledOrders.reduce((s, o) => s + Number(o.amountPaid ?? 0), 0)

    const debtorSet = new Set(
      orders.filter(o => computeOwing(o) > 0).map(o => o.customerId).filter(Boolean)
    )
    manualDebts
      .filter(d => d.status !== "PAID" && d.status !== "CANCELLED" && d.amountOwing > 0)
      .forEach(d => debtorSet.add(d.customerId))

    const overdueCount = orders.filter(o => {
      if (!o.deliveryDate) return false
      if (o.paymentStatus === "PAID") return false
      return new Date(o.deliveryDate) < now
    }).length

    const summary: CreditLedgerSummary = {
      totalCreditGiven,
      totalCollected,
      totalOutstanding,
      totalCancelled,
      totalRefunded,
      activeDebtors: debtorSet.size,
      overdueCount,
      paidCount:    orders.filter(o => o.paymentStatus === "PAID").length + manualDebts.filter(d => d.status === "PAID").length,
      partialCount: orders.filter(o => o.paymentStatus === "PARTIAL").length + manualDebts.filter(d => d.status === "PARTIAL").length,
      pendingCount: orders.filter(o => o.paymentStatus === "PENDING").length + manualDebts.filter(d => d.status === "PENDING").length,
    }

    const exportRows: CsvRow[] = entries.map(e => ({
      "Date":            e.date,
      "Order #":         e.orderNumber,
      "Customer":        e.customerName,
      "Phone":           e.customerPhone ?? "",
      "Location":        e.locationName,
      "Event":           e.eventLabel,
      "Order Total":     `GHS ${e.orderTotal.toFixed(2)}`,
      "Amount Paid":     `GHS ${e.amountPaid.toFixed(2)}`,
      "Amount Owing":    `GHS ${e.amountOwing.toFixed(2)}`,
      "Payment Method":  e.paymentMethod ?? "",
      "Reference":       e.reference ?? "",
      "Payment Status":  e.paymentStatus,
      "Order Status":    e.orderStatus,
      "Notes":           e.notes ?? "",
      "Recorded By":     e.recordedBy ?? "",
    }))

    return { success: true, data: { entries, summary, exportRows } }
  } catch (error: any) {
    console.error("getCreditLedger error:", error)
    return { success: false, error: error.message || "Failed to load ledger" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getLedgerStats
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerStats(): Promise<{
  success: boolean
  data?: CreditLedgerSummary
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()
    const now  = new Date()

    // ── 1. Sales orders (unpaid/partial) ──────────────────────────────
    const unpaidOrders = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        { notIn: ["CANCELLED", "DRAFT"] },
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
      },
      select: {
        id: true,
        customerId: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
        amountPaid: true,
        amountOwing: true,
        paymentStatus: true,
        status: true,
        deliveryDate: true,
        payments: { where: { reference: { not: { contains: "VOIDED" } } }, select: { amount: true } },
      },
    })

    // ── 2. Manual debts (unpaid/partial) ──────────────────────────────
    const manualDebts = await db.manualDebt.findMany({
      where: {
        orgId: user.orgId,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        payments: true,
      },
    })

    // ── 3. Totals from sales orders ──────────────────────────────────
    let totalOutstanding = 0
    let totalCollected   = 0
    let activeDebtorsSet = new Set<string>()
    let paidCount        = 0
    let partialCount     = 0
    let pendingCount     = 0
    let totalCreditGiven = 0

    // Sales orders – calculate totals
    for (const o of unpaidOrders) {
      const paymentsSum = (o.payments as any[]).reduce((ps: number, p: any) => ps + Number(p.amount), 0) ?? 0
      const truePaid    = Math.max(Number(o.amountPaid ?? 0), paymentsSum)
      const trueOwing   = o.paymentStatus === "PAID" ? 0
        : Number(o.amountOwing ?? 0) > 0 ? Number(o.amountOwing)
        : Math.max(0, calcTotal(o) - truePaid)

      if (trueOwing > 0.01) {
        totalOutstanding += trueOwing
        if (o.customerId) activeDebtorsSet.add(o.customerId)
      }
      totalCollected += truePaid
      if (o.paymentStatus === "PAID") paidCount++
      else if (o.paymentStatus === "PARTIAL") partialCount++
      else pendingCount++
    }

    // Total credit given from all non-cancelled sales orders
    const allActiveOrders = await db.salesOrder.findMany({
      where: { orgId: user.orgId, source: "SALES_ORDER", status: { notIn: ["CANCELLED", "DRAFT"] } },
      select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true },
    })
    totalCreditGiven = allActiveOrders.reduce((s, o) => s + calcTotal(o), 0)

    // ── 4. Manual debts contributions ─────────────────────────────────
    let manualTotalOwing = 0
    let manualTotalPaid  = 0
    let manualPaidCount = 0
    let manualPartialCount = 0
    let manualPendingCount = 0

    for (const debt of manualDebts) {
      const totalAmount = debt.amountOwing + debt.amountPaid
      const truePaid    = debt.amountPaid
      const trueOwing   = debt.amountOwing

      if (trueOwing > 0.01) {
        manualTotalOwing += trueOwing
        activeDebtorsSet.add(debt.customerId)
      }
      manualTotalPaid += truePaid

      if (debt.status === "PAID") manualPaidCount++
      else if (debt.status === "PARTIAL") manualPartialCount++
      else manualPendingCount++

      totalCreditGiven += totalAmount
    }

    // Combine totals
    totalOutstanding += manualTotalOwing
    totalCollected   += manualTotalPaid
    paidCount        += manualPaidCount
    partialCount     += manualPartialCount
    pendingCount     += manualPendingCount

    // ── 5. Cancelled/refunded (sales orders only, manual debts are separate) ──
    const cancelledRefunded = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        "CANCELLED",
        paymentStatus: "REFUNDED",
      },
      select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true, amountPaid: true, amountOwing: true },
    })
    const totalCancelled = cancelledRefunded.reduce((s, o) => s + calcTotal(o), 0)
    const totalRefunded  = cancelledRefunded.reduce((s, o) => s + Number(o.amountPaid ?? 0), 0)

    // ── 6. Overdue count (sales orders only, manual debts have no delivery date) ──
    const overdueCount = unpaidOrders.filter(o => {
      if (!o.deliveryDate) return false
      return new Date(o.deliveryDate) < now
    }).length

    return {
      success: true,
      data: {
        totalCreditGiven,
        totalCollected,
        totalOutstanding,
        totalCancelled,
        totalRefunded,
        activeDebtors: activeDebtorsSet.size,
        overdueCount,
        paidCount,
        partialCount,
        pendingCount,
      },
    }
  } catch (error: any) {
    console.error("getLedgerStats error:", error)
    return { success: false, error: error.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getDebtorsList
// ─────────────────────────────────────────────────────────────────────────────
export async function getDebtorsList(): Promise<{
  success: boolean
  data?: DebtorSummary[]
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()
    const now  = new Date()

    const orders = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        { notIn: ["CANCELLED", "DRAFT", "RETURNED"] },
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const customerMap = new Map<string, DebtorSummary>()

    for (const order of orders) {
      const cid         = order.customerId ?? "walk-in"
      const orderTotal  = calcTotal(order)
      const amountPaid  = Number(order.amountPaid ?? 0)
      const amountOwing = computeOwing(order)
      const isOverdue   = !!order.deliveryDate && new Date(order.deliveryDate) < now

      if (amountOwing <= 0) continue  // skip if nothing owed

      const cur = customerMap.get(cid) ?? {
        customerId:    cid,
        customerName:  order.customer?.name  ?? "Walk-in",
        customerPhone: order.customer?.phone ?? null,
        customerEmail: order.customer?.email ?? null,
        totalOwing:    0,
        totalPaid:     0,
        orderCount:    0,
        overdueCount:  0,
        oldestDueDate: null as Date | null,
        orders:        [],
      }

      cur.totalOwing  += amountOwing
      cur.totalPaid   += amountPaid
      cur.orderCount  += 1
      if (isOverdue) cur.overdueCount += 1
      if (order.deliveryDate) {
        const d = new Date(order.deliveryDate)
        if (!cur.oldestDueDate || d < cur.oldestDueDate) cur.oldestDueDate = d
      }
      cur.orders.push({
        id:            order.id,
        orderNumber:   order.orderNumber,
        orderTotal,
        amountOwing,
        amountPaid,
        paymentStatus: order.paymentStatus,
        deliveryDate:  order.deliveryDate ? format(new Date(order.deliveryDate), "dd MMM yyyy") : null,
        location:      order.location?.name ?? "N/A",
        isOverdue,
      })

      customerMap.set(cid, cur)
    }

    const debtors = Array.from(customerMap.values()).sort((a, b) => {
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount
      return b.totalOwing - a.totalOwing
    })

    return { success: true, data: debtors }
  } catch (error: any) {
    console.error("getDebtorsList error:", error)
    return { success: false, error: error.message }
  }
}

export interface DebtorSummary {
  customerId:    string
  customerName:  string
  customerPhone: string | null
  customerEmail: string | null
  totalOwing:    number
  totalPaid:     number
  orderCount:    number
  overdueCount:  number
  oldestDueDate: Date | null
  orders: {
    id:            string
    orderNumber:   string
    orderTotal:    number
    amountOwing:   number
    amountPaid:    number
    paymentStatus: string
    deliveryDate:  string | null
    location:      string
    isOverdue:     boolean
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// getCustomerCreditHistory
// ─────────────────────────────────────────────────────────────────────────────
export async function getCustomerCreditHistory(customerId: string): Promise<{
  success: boolean
  data?: {
    customer:      { id: string; name: string; phone: string | null; email: string | null }
    orders:        CustomerOrderSummary[]
    totalOwing:    number
    totalPaid:     number
    totalOrders:   number
    overdueOrders: number
  }
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()

    const customer = await db.customer.findUnique({
      where: { id: customerId, orgId: user.orgId },
      select: { id: true, name: true, phone: true, email: true },
    })
    if (!customer) return { success: false, error: "Customer not found" }

    const orders = await db.salesOrder.findMany({
      where: { customerId, orgId: user.orgId, source: "SALES_ORDER" },
      include: {
        location: { select: { name: true } },
        lines:    { include: { item: { select: { name: true, sku: true } } } },
        payments: {
          orderBy: { paidAt: "asc" },
          include: { recordedBy: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const now = new Date()

    const orderSummaries: CustomerOrderSummary[] = orders.map(order => {
      const orderTotal  = calcTotal(order)
      const paymentsSum = (order.payments as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0)
      const amountPaid  = Number(order.amountPaid ?? 0) > 0 ? Number(order.amountPaid) : paymentsSum
      const amountOwing = computeOwing({ ...order, amountPaid })
      const isOverdue   = !!order.deliveryDate &&
                          new Date(order.deliveryDate) < now &&
                          order.paymentStatus !== "PAID" &&
                          order.status !== "CANCELLED"

      return {
        id:            order.id,
        orderNumber:   order.orderNumber,
        date:          format(order.createdAt, "dd MMM yyyy"),
        deliveryDate:  order.deliveryDate ? format(new Date(order.deliveryDate), "dd MMM yyyy") : null,
        location:      order.location?.name ?? "N/A",
        orderTotal,
        amountPaid,
        amountOwing,
        paymentStatus: order.paymentStatus,
        orderStatus:   order.status,
        isOverdue,
        payments: (order.payments as any[]).map(p => ({
          id:          p.id,
          amount:      Number(p.amount),
          method:      p.method,
          reference:   p.reference,
          date:        format(new Date(p.paidAt), "dd MMM yyyy, hh:mm a"),
          recordedBy:  p.recordedBy?.name ?? null,
          isVoided:    (p.reference ?? "").includes("VOIDED"),
        })),
        items: order.lines.map((l: any) => ({
          name:     l.item?.name ?? "Unknown",
          sku:      l.item?.sku  ?? "",
          quantity: l.quantity,
          total:    l.total,
        })),
      }
    })

    const totalOwing    = orderSummaries.reduce((s, o) => s + (o.orderStatus !== "CANCELLED" ? o.amountOwing : 0), 0)
    const totalPaid     = orderSummaries.reduce((s, o) => s + o.amountPaid, 0)
    const overdueOrders = orderSummaries.filter(o => o.isOverdue).length

    return {
      success: true,
      data: { customer, orders: orderSummaries, totalOwing, totalPaid, totalOrders: orders.length, overdueOrders },
    }
  } catch (error: any) {
    console.error("getCustomerCreditHistory error:", error)
    return { success: false, error: error.message }
  }
}

export interface CustomerOrderSummary {
  id:            string
  orderNumber:   string
  date:          string
  deliveryDate:  string | null
  location:      string
  orderTotal:    number
  amountPaid:    number
  amountOwing:   number
  paymentStatus: string
  orderStatus:   string
  isOverdue:     boolean
  payments: {
    id: string; amount: number; method: string; reference: string | null
    date: string; recordedBy: string | null; isVoided: boolean
  }[]
  items: { name: string; sku: string; quantity: number; total: number }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// getLedgerForOrder
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerForOrder(orderId: string): Promise<{
  success: boolean; data?: OrderLedger; error?: string
}> {
  try {
    const user  = await getAuthenticatedUser()
    const order = await db.salesOrder.findUnique({
      where: { id: orderId, orgId: user.orgId },
      include: {
        customer:  { select: { id: true, name: true, phone: true, email: true, address: true } },
        location:  { select: { id: true, name: true, address: true } },
        createdBy: { select: { id: true, name: true } },
        lines:     { include: { item: { select: { id: true, name: true, sku: true } } } },
        payments: {
          orderBy: { paidAt: "asc" },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
      },
    })

    if (!order) return { success: false, error: "Order not found" }

    const orderTotal  = calcTotal(order)
    const paymentsSum = (order.payments as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0)
    const amountPaid  = Number(order.amountPaid ?? 0) > 0 ? Number(order.amountPaid) : paymentsSum
    const amountOwing = computeOwing({ ...order, amountPaid })

    const isOverdue =
      !!order.deliveryDate &&
      new Date(order.deliveryDate) < new Date() &&
      order.paymentStatus !== "PAID" &&
      order.status !== "CANCELLED"

    const paymentHistory = (order.payments as any[]).map(p => ({
      id:          p.id,
      amount:      Number(p.amount),
      method:      p.method as string,
      methodLabel: p.method.replace("_", " "),
      reference:   p.reference ?? null,
      date:        format(new Date(p.paidAt), "dd MMM yyyy, hh:mm a"),
      rawDate:     new Date(p.paidAt),
      recordedBy:  p.recordedBy?.name ?? null,
      isVoided:    (p.reference ?? "").includes("VOIDED"),
    }))

    const result: OrderLedger = {
      orderId:      order.id,
      orderNumber:  order.orderNumber,
      customer: {
        id:      order.customer?.id      ?? "",
        name:    order.customer?.name    ?? "Walk-in",
        phone:   order.customer?.phone   ?? null,
        email:   order.customer?.email   ?? null,
        address: order.customer?.address ?? null,
      },
      location: {
        name:    order.location?.name    ?? "N/A",
        address: order.location?.address ?? null,
      },
      createdAt:     format(order.createdAt, "dd MMM yyyy, hh:mm a"),
      deliveryDate:  order.deliveryDate ? format(new Date(order.deliveryDate), "dd MMM yyyy") : null,
      orderTotal,
      subtotal:      Number(order.subtotal     || 0),
      taxAmount:     Number(order.taxAmount    || 0),
      shippingCost:  Number(order.shippingCost || 0),
      discount:      Number(order.discount     || 0),
      amountPaid,
      amountOwing,
      paymentStatus: order.paymentStatus,
      orderStatus:   order.status,
      paymentMethod: order.paymentMethod ?? null,
      isOverdue,
      paymentHistory,
      items: order.lines.map((l: any) => ({
        id:        l.id,
        name:      l.item?.name ?? "Unknown",
        sku:       l.item?.sku  ?? "",
        quantity:  l.quantity,
        unitPrice: Number(l.unitPrice),
        taxRate:   Number(l.taxRate ?? 0),
        total:     Number(l.total),
      })),
      notes:     order.notes     ?? null,
      createdBy: order.createdBy?.name ?? null,
    }

    return { success: true, data: result }
  } catch (error: any) {
    console.error("getLedgerForOrder error:", error)
    return { success: false, error: error.message }
  }
}

export interface OrderLedger {
  orderId:      string
  orderNumber:  string
  customer:     { id: string; name: string; phone: string | null; email: string | null; address: string | null }
  location:     { name: string; address: string | null }
  createdAt:    string
  deliveryDate: string | null
  orderTotal:   number
  subtotal:     number
  taxAmount:    number
  shippingCost: number
  discount:     number
  amountPaid:   number
  amountOwing:  number
  paymentStatus: string
  orderStatus:   string
  paymentMethod: string | null
  isOverdue:     boolean
  paymentHistory: {
    id: string; amount: number; method: string; methodLabel: string
    reference: string | null; date: string; rawDate: Date
    recordedBy: string | null; isVoided: boolean
  }[]
  items: {
    id: string; name: string; sku: string; quantity: number
    unitPrice: number; taxRate: number; total: number
  }[]
  notes:     string | null
  createdBy: string | null
}

export async function exportLedgerToCsv(rows: CsvRow[]): Promise<string> {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0]) as (keyof CsvRow)[]
  const escape  = (val: string) =>
    val.includes(",") || val.includes('"') || val.includes("\n")
      ? `"${val.replace(/"/g, '""')}"` : val
  return [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(String(row[h] ?? ""))).join(",")),
  ].join("\n")
}