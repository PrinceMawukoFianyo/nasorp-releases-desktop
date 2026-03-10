// actions/credit-ledger.ts
// ─────────────────────────────────────────────────────────────────────────────
// Complete credit & payment ledger for sales orders.
//
// Every event that touches money is automatically recorded here:
//   • Order created on credit (PENDING / PARTIAL)
//   • Payment received (cash / MoMo / card) — partial or full
//   • Credit order cancelled (customer cannot pay) → stock reversed
//   • Sales return approved → refund recorded
//   • Payment status auto-updates (PENDING → PARTIAL → PAID → REFUNDED)
//
// All ledger data can be:
//   • Queried per customer, per order, or org-wide
//   • Exported to CSV
//   • Printed via the invoice/receipt pages
// ─────────────────────────────────────────────────────────────────────────────
"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { PaymentStatus, SalesOrderStatus } from "@prisma/client"
import { format } from "date-fns"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | "ORDER_CREATED"       // credit order placed
  | "PAYMENT_RECEIVED"    // cash / MoMo / card payment recorded
  | "ORDER_CANCELLED"     // credit order cancelled — stock reversed
  | "RETURN_REFUND"       // sales return approved — refund issued
  | "PAYMENT_VOIDED"      // payment reversed (linked to cancellation)
  | "STATUS_CHANGE"       // payment status changed manually

export interface LedgerEntry {
  id:            string
  eventType:     LedgerEventType
  eventLabel:    string            // human-readable label for display
  orderId:       string
  orderNumber:   string
  customerId:    string | null
  customerName:  string
  customerPhone: string | null
  locationName:  string
  date:          string            // formatted date string
  rawDate:       Date
  // Amounts
  orderTotal:    number
  amountPaid:    number
  amountOwing:   number
  paymentMethod: string | null
  reference:     string | null
  // Status
  paymentStatus: string
  orderStatus:   string
  // Meta
  notes:         string | null
  recordedBy:    string | null
}

export interface CreditLedgerSummary {
  totalCreditGiven:    number   // total value of credit orders
  totalCollected:      number   // total payments received
  totalOutstanding:    number   // total still owed
  totalCancelled:      number   // value of cancelled/voided orders
  totalRefunded:       number   // value of returns/refunds
  activeDebtors:       number   // customers with outstanding balance
  overdueCount:        number   // orders past delivery date still unpaid
  paidCount:           number   // fully paid orders
  partialCount:        number   // partially paid orders
  pendingCount:        number   // unpaid orders
}

export interface CreditLedgerData {
  entries:    LedgerEntry[]
  summary:    CreditLedgerSummary
  exportRows: CsvRow[]           // pre-built for CSV export
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
// getCreditLedger
// Returns the full ledger for all credit orders in the org, optionally
// filtered by date range, customer, status, or a single order.
// ─────────────────────────────────────────────────────────────────────────────
export async function getCreditLedger(filters?: {
  fromDate?:     Date
  toDate?:       Date
  customerId?:   string
  orderId?:      string
  paymentStatus?: string   // "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "ALL"
  includeFullyPaid?: boolean
}): Promise<{ success: boolean; data?: CreditLedgerData; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    const from  = filters?.fromDate
    const to    = filters?.toDate
    const showPaid = filters?.includeFullyPaid ?? true

    // Build the where clause
    const where: any = {
      orgId: user.orgId,
      // Only credit-related orders: exclude POS (always PAID on creation)
      // We include orders that ever had a credit payment status
      OR: [
        { paymentStatus: "PENDING"  },
        { paymentStatus: "PARTIAL"  },
        { paymentStatus: "PAID"     },
        { paymentStatus: "REFUNDED" },
      ],
    }

    if (!showPaid) {
      where.OR = [
        { paymentStatus: "PENDING" },
        { paymentStatus: "PARTIAL" },
      ]
    }

    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
      where.OR = undefined
      where.paymentStatus = filters.paymentStatus
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId
    }

    if (filters?.orderId) {
      where.id = filters.orderId
    }

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: from }),
        ...(to   && { lte: to   }),
      }
    }

    // Fetch orders with all related data
    const orders = await db.salesOrder.findMany({
      where,
      include: {
        customer:  { select: { id: true, name: true, phone: true, email: true } },
        location:  { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        lines:     { include: { item: { select: { id: true, name: true, sku: true } } } },
        payments: {
          orderBy: { paidAt: "asc" },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Also fetch cancelled orders that had payments (voided)
    const cancelledWithPayments = await db.salesOrder.findMany({
      where: {
        orgId:  user.orgId,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
        ...(from || to ? { createdAt: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        }} : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      },
      include: {
        customer:  { select: { id: true, name: true, phone: true } },
        location:  { select: { id: true, name: true } },
        payments:  { include: { recordedBy: { select: { id: true, name: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // ── Build ledger entries ──────────────────────────────────────────────────

    const entries: LedgerEntry[] = []

    for (const order of orders) {
      const orderTotal =
        (order.subtotal     || 0) +
        (order.taxAmount    || 0) +
        (order.shippingCost || 0) -
        (order.discount     || 0)

      const amountPaid  = order.amountPaid  ?? order.payments.reduce((s: number, p: any) => s + p.amount, 0)
      const amountOwing = order.amountOwing ?? Math.max(0, orderTotal - amountPaid)

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

      // 1. ORDER_CREATED entry
      entries.push({
        ...base,
        id:            `${order.id}-created`,
        eventType:     "ORDER_CREATED",
        eventLabel:    order.status === "CANCELLED" ? "Order Cancelled" : "Credit Order Created",
        date:          format(order.createdAt, "dd MMM yyyy, hh:mm a"),
        rawDate:       order.createdAt,
        paymentMethod: order.paymentMethod ?? null,
        reference:     null,
        notes:         order.notes ?? null,
      })

      // 2. PAYMENT_RECEIVED entries — one per payment
      for (const payment of (order.payments as any[])) {
        const isVoided = payment.reference?.includes("VOIDED")
        entries.push({
          ...base,
          id:            payment.id,
          eventType:     isVoided ? "PAYMENT_VOIDED" : "PAYMENT_RECEIVED",
          eventLabel:    isVoided
            ? "Payment Voided (Order Cancelled)"
            : `Payment Received — ${payment.method.replace("_", " ")}`,
          date:          format(new Date(payment.paidAt), "dd MMM yyyy, hh:mm a"),
          rawDate:       new Date(payment.paidAt),
          paymentMethod: payment.method,
          reference:     payment.reference ?? null,
          amountPaid:    payment.amount,   // this entry shows just this payment
          amountOwing:   amountOwing,
          notes:         payment.reference ?? null,
          recordedBy:    payment.recordedBy?.name ?? base.recordedBy,
        })
      }
    }

    // Add cancellation entries for voided orders (may not be in main list)
    for (const order of cancelledWithPayments) {
      const orderTotal =
        (order.subtotal     || 0) +
        (order.taxAmount    || 0) +
        (order.shippingCost || 0) -
        (order.discount     || 0)

      // Only add if not already in entries
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
          orderTotal,
          amountPaid:    0,
          amountOwing:   0,
          paymentMethod: null,
          reference:     null,
          paymentStatus: order.paymentStatus,
          orderStatus:   order.status,
          notes:         order.notes ?? null,
          recordedBy:    order.createdBy?.name ?? null,
        })
      }
    }

    // Sort all entries newest first
    entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

    // ── Summary ───────────────────────────────────────────────────────────────

    const now = new Date()

    // Use original orders list (not entries) for summary calculations
    const creditOrders = orders.filter(o => o.status !== "CANCELLED")

    const totalCreditGiven = creditOrders.reduce((s, o) => {
      return s + (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0)
    }, 0)

    const totalCollected = creditOrders.reduce((s, o) => {
      return s + (o.amountPaid ?? (o.payments as any[]).reduce((ps: number, p: any) => ps + p.amount, 0))
    }, 0)

    const totalOutstanding = creditOrders.reduce((s, o) => {
      const total = (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0)
      const paid  = o.amountPaid ?? (o.payments as any[]).reduce((ps: number, p: any) => ps + p.amount, 0)
      return s + Math.max(0, total - paid)
    }, 0)

    const cancelledOrders = [...orders, ...cancelledWithPayments].filter(o => o.status === "CANCELLED")
    const totalCancelled  = cancelledOrders.reduce((s, o) => {
      return s + (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0)
    }, 0)

    const totalRefunded = orders
      .filter(o => o.paymentStatus === "REFUNDED")
      .reduce((s, o) => {
        return s + (o.amountPaid ?? 0)
      }, 0)

    // Unique customers with outstanding balance
    const debtorSet = new Set(
      creditOrders
        .filter(o => (o.amountOwing ?? 0) > 0)
        .map(o => o.customerId)
        .filter(Boolean)
    )

    const overdueCount = creditOrders.filter(o => {
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
      activeDebtors:  debtorSet.size,
      overdueCount,
      paidCount:    creditOrders.filter(o => o.paymentStatus === "PAID").length,
      partialCount: creditOrders.filter(o => o.paymentStatus === "PARTIAL").length,
      pendingCount: creditOrders.filter(o => o.paymentStatus === "PENDING").length,
    }

    // ── CSV export rows ───────────────────────────────────────────────────────

    const exportRows: CsvRow[] = entries.map(e => ({
      "Date":             e.date,
      "Order #":          e.orderNumber,
      "Customer":         e.customerName,
      "Phone":            e.customerPhone ?? "",
      "Location":         e.locationName,
      "Event":            e.eventLabel,
      "Order Total":      `GHS ${e.orderTotal.toFixed(2)}`,
      "Amount Paid":      `GHS ${e.amountPaid.toFixed(2)}`,
      "Amount Owing":     `GHS ${e.amountOwing.toFixed(2)}`,
      "Payment Method":   e.paymentMethod ?? "",
      "Reference":        e.reference ?? "",
      "Payment Status":   e.paymentStatus,
      "Order Status":     e.orderStatus,
      "Notes":            e.notes ?? "",
      "Recorded By":      e.recordedBy ?? "",
    }))

    return { success: true, data: { entries, summary, exportRows } }

  } catch (error: any) {
    console.error("getCreditLedger error:", error)
    return { success: false, error: error.message || "Failed to load ledger" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCustomerCreditHistory
// All credit activity for a single customer — for a "Customer Account" view.
// ─────────────────────────────────────────────────────────────────────────────
export async function getCustomerCreditHistory(customerId: string): Promise<{
  success: boolean
  data?: {
    customer:       { id: string; name: string; phone: string | null; email: string | null }
    orders:         CustomerOrderSummary[]
    totalOwing:     number
    totalPaid:      number
    totalOrders:    number
    overdueOrders:  number
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
      where: { customerId, orgId: user.orgId },
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
      const orderTotal =
        (order.subtotal     || 0) +
        (order.taxAmount    || 0) +
        (order.shippingCost || 0) -
        (order.discount     || 0)
      const amountPaid  = order.amountPaid  ?? (order.payments as any[]).reduce((s: number, p: any) => s + p.amount, 0)
      const amountOwing = order.amountOwing ?? Math.max(0, orderTotal - amountPaid)
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
          id:            p.id,
          amount:        p.amount,
          method:        p.method,
          reference:     p.reference,
          date:          format(new Date(p.paidAt), "dd MMM yyyy, hh:mm a"),
          recordedBy:    p.recordedBy?.name ?? null,
          isVoided:      p.reference?.includes("VOIDED") ?? false,
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
      data: {
        customer,
        orders: orderSummaries,
        totalOwing,
        totalPaid,
        totalOrders: orders.length,
        overdueOrders,
      },
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
    id:         string
    amount:     number
    method:     string
    reference:  string | null
    date:       string
    recordedBy: string | null
    isVoided:   boolean
  }[]
  items: {
    name:     string
    sku:      string
    quantity: number
    total:    number
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// getDebtorsList
// Returns a ranked list of all customers with outstanding balances,
// grouped by urgency (overdue first).
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
        orgId: user.orgId,
        status: { notIn: ["CANCELLED", "RETURNED"] },
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Group by customer
    const customerMap = new Map<string, DebtorSummary>()

    for (const order of orders) {
      const cid = order.customerId ?? "walk-in"
      const orderTotal =
        (order.subtotal     || 0) +
        (order.taxAmount    || 0) +
        (order.shippingCost || 0) -
        (order.discount     || 0)
      const amountPaid  = order.amountPaid  ?? 0
      const amountOwing = order.amountOwing ?? Math.max(0, orderTotal - amountPaid)
      const isOverdue   = !!order.deliveryDate &&
                          new Date(order.deliveryDate) < now

      const cur = customerMap.get(cid) ?? {
        customerId:    cid,
        customerName:  order.customer?.name  ?? "Walk-in",
        customerPhone: order.customer?.phone ?? null,
        customerEmail: order.customer?.email ?? null,
        totalOwing:    0,
        totalPaid:     0,
        orderCount:    0,
        overdueCount:  0,
        oldestDueDate: null,
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

    // Sort: overdue customers first, then by amount owing desc
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
// getLedgerForOrder
// Returns full payment history for a single order — used on the invoice page
// and the order detail view.
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerForOrder(orderId: string): Promise<{
  success: boolean
  data?: OrderLedger
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()

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

    const orderTotal =
      (order.subtotal     || 0) +
      (order.taxAmount    || 0) +
      (order.shippingCost || 0) -
      (order.discount     || 0)

    const amountPaid  = order.amountPaid  ?? (order.payments as any[]).reduce((s: number, p: any) => s + p.amount, 0)
    const amountOwing = order.amountOwing ?? Math.max(0, orderTotal - amountPaid)

    const paymentHistory = (order.payments as any[]).map(p => ({
      id:          p.id,
      amount:      p.amount,
      method:      p.method as string,
      methodLabel: p.method.replace("_", " "),
      reference:   p.reference ?? null,
      date:        format(new Date(p.paidAt), "dd MMM yyyy, hh:mm a"),
      rawDate:     new Date(p.paidAt),
      recordedBy:  p.recordedBy?.name ?? null,
      isVoided:    (p.reference ?? "").includes("VOIDED"),
    }))

    const isOverdue =
      !!order.deliveryDate &&
      new Date(order.deliveryDate) < new Date() &&
      order.paymentStatus !== "PAID" &&
      order.status !== "CANCELLED"

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
      subtotal:      order.subtotal     || 0,
      taxAmount:     order.taxAmount    || 0,
      shippingCost:  order.shippingCost || 0,
      discount:      order.discount     || 0,
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
        unitPrice: l.unitPrice,
        taxRate:   l.taxRate ?? 0,
        total:     l.total,
      })),
      notes:      order.notes    ?? null,
      createdBy:  order.createdBy?.name ?? null,
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
  customer: {
    id:      string
    name:    string
    phone:   string | null
    email:   string | null
    address: string | null
  }
  location: {
    name:    string
    address: string | null
  }
  createdAt:     string
  deliveryDate:  string | null
  orderTotal:    number
  subtotal:      number
  taxAmount:     number
  shippingCost:  number
  discount:      number
  amountPaid:    number
  amountOwing:   number
  paymentStatus: string
  orderStatus:   string
  paymentMethod: string | null
  isOverdue:     boolean
  paymentHistory: {
    id:          string
    amount:      number
    method:      string
    methodLabel: string
    reference:   string | null
    date:        string
    rawDate:     Date
    recordedBy:  string | null
    isVoided:    boolean
  }[]
  items: {
    id:        string
    name:      string
    sku:       string
    quantity:  number
    unitPrice: number
    taxRate:   number
    total:     number
  }[]
  notes:     string | null
  createdBy: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// exportLedgerToCsv
// Converts ledger entries to a CSV string ready to download from the browser.
// Usage in your component:
//   const { data } = await getCreditLedger(...)
//   const csv = exportLedgerToCsv(data.exportRows)
//   downloadCsv(csv, "credit-ledger.csv")
// ─────────────────────────────────────────────────────────────────────────────
export function exportLedgerToCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return ""

  const headers = Object.keys(rows[0]) as (keyof CsvRow)[]

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvLines = [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(String(row[h] ?? ""))).join(",")),
  ]

  return csvLines.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// getLedgerStats
// Lightweight stats for dashboard cards — no full data load.
// ─────────────────────────────────────────────────────────────────────────────
export async function getLedgerStats(): Promise<{
  success: boolean
  data?: CreditLedgerSummary
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()
    const now  = new Date()

    const [creditOrders, cancelledRefunded] = await Promise.all([
      db.salesOrder.findMany({
        where: {
          orgId: user.orgId,
          status: { notIn: ["CANCELLED"] },
          paymentStatus: { in: ["PENDING", "PARTIAL", "PAID"] },
        },
        select: {
          id:            true,
          customerId:    true,
          subtotal:      true,
          taxAmount:     true,
          shippingCost:  true,
          discount:      true,
          amountPaid:    true,
          amountOwing:   true,
          paymentStatus: true,
          deliveryDate:  true,
        },
      }),
      db.salesOrder.findMany({
        where: {
          orgId:         user.orgId,
          status:        "CANCELLED",
          paymentStatus: "REFUNDED",
        },
        select: {
          subtotal: true, taxAmount: true, shippingCost: true, discount: true, amountPaid: true,
        },
      }),
    ])

    const totalCreditGiven = creditOrders.reduce((s, o) => {
      return s + (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0)
    }, 0)
    const totalCollected   = creditOrders.reduce((s, o) => s + (o.amountPaid ?? 0), 0)
    const totalOutstanding = creditOrders.reduce((s, o) => s + (o.amountOwing ?? 0), 0)
    const totalCancelled   = cancelledRefunded.reduce((s, o) => {
      return s + (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0)
    }, 0)
    const totalRefunded    = cancelledRefunded.reduce((s, o) => s + (o.amountPaid ?? 0), 0)

    const debtorSet = new Set(
      creditOrders.filter(o => (o.amountOwing ?? 0) > 0).map(o => o.customerId).filter(Boolean)
    )

    const overdueCount = creditOrders.filter(o => {
      if (!o.deliveryDate) return false
      if (o.paymentStatus === "PAID") return false
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
        activeDebtors:  debtorSet.size,
        overdueCount,
        paidCount:    creditOrders.filter(o => o.paymentStatus === "PAID").length,
        partialCount: creditOrders.filter(o => o.paymentStatus === "PARTIAL").length,
        pendingCount: creditOrders.filter(o => o.paymentStatus === "PENDING").length,
      },
    }
  } catch (error: any) {
    console.error("getLedgerStats error:", error)
    return { success: false, error: error.message }
  }
}