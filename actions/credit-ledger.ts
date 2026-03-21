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

    const where: any = {
      orgId:  user.orgId,
      source: "SALES_ORDER",                         // never include POS
      status: { notIn: ["CANCELLED", "DRAFT"] },     // never include cancelled
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

    // ── Build ledger entries ──────────────────────────────────────────────────
    const entries: LedgerEntry[] = []

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
          amountOwing,
          notes:         payment.reference ?? null,
          recordedBy:    payment.recordedBy?.name ?? base.recordedBy,
        })
      }
    }

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
          amountOwing:   0,  // cancelled → owes nothing
          paymentMethod: null,
          reference:     null,
          paymentStatus: order.paymentStatus,
          orderStatus:   "CANCELLED",
          notes:         order.notes ?? null,
          recordedBy:    order.createdBy?.name ?? null,
        })
      }
    }

    entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

    // ── Summary ───────────────────────────────────────────────────────────────
    const now = new Date()

    const totalCreditGiven = orders.reduce((s, o) => s + calcTotal(o), 0)
    const totalCollected   = orders.reduce((s, o) => {
      const paymentsSum = (o.payments as any[]).reduce((ps: number, p: any) => ps + Number(p.amount), 0)
      return s + (Number(o.amountPaid ?? 0) > 0 ? Number(o.amountPaid) : paymentsSum)
    }, 0)
    const totalOutstanding = orders.reduce((s, o) => s + computeOwing(o), 0)
    const totalCancelled   = cancelledOrders.reduce((s, o) => s + calcTotal(o), 0)
    const totalRefunded    = cancelledOrders.reduce((s, o) => s + Number(o.amountPaid ?? 0), 0)

    // Active debtors = unique customers with computeOwing > 0
    const debtorSet = new Set(
      orders
        .filter(o => computeOwing(o) > 0)
        .map(o => o.customerId)
        .filter(Boolean)
    )

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
      paidCount:    orders.filter(o => o.paymentStatus === "PAID").length,
      partialCount: orders.filter(o => o.paymentStatus === "PARTIAL").length,
      pendingCount: orders.filter(o => o.paymentStatus === "PENDING").length,
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

    // Only PENDING and PARTIAL orders can have money owing
    // PAID orders owe nothing — exclude them from outstanding calculation
    // This is the key fix: we only query UNPAID orders for totalOutstanding
    const unpaidOrders = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        { notIn: ["CANCELLED", "DRAFT"] },
        paymentStatus: { in: ["PENDING", "PARTIAL"] },  // ← only unpaid/partial
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
        status:        true,   // ← required by computeOwing
        deliveryDate:  true,
        payments: { where: { reference: { not: { contains: "VOIDED" } } }, select: { amount: true } },
      },
    })

    // Separately count paid orders (for paidCount stat only)
    const paidCount = await db.salesOrder.count({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        { notIn: ["CANCELLED", "DRAFT"] },
        paymentStatus: "PAID",
      },
    })

    const cancelledRefunded = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        "CANCELLED",
        paymentStatus: "REFUNDED",
      },
      select: {
        subtotal: true, taxAmount: true,
        shippingCost: true, discount: true,
        amountPaid: true, amountOwing: true,
        paymentStatus: true, status: true,
      },
    })

    // totalOutstanding = sum of what PENDING/PARTIAL orders actually owe
    // Use paymentsSum for legacy rows where amountPaid column was never set
    const totalOutstanding = unpaidOrders.reduce((s, o) => {
      const paymentsSum = (o as any).payments?.reduce((ps: number, p: { amount: number }) => ps + Number(p.amount), 0) ?? 0
      const truePaid    = Math.max(Number(o.amountPaid ?? 0), paymentsSum)
      const trueOwing   = o.paymentStatus === "PAID" ? 0
        : Number(o.amountOwing ?? 0) > 0 ? Number(o.amountOwing)
        : Math.max(0, calcTotal(o) - truePaid)
      return s + trueOwing
    }, 0)

    // totalCollected = sum of payments actually received
    const totalCollected = unpaidOrders.reduce((s, o) => {
      const paymentsSum = (o as any).payments?.reduce((ps: number, p: { amount: number }) => ps + Number(p.amount), 0) ?? 0
      return s + Math.max(Number(o.amountPaid ?? 0), paymentsSum)
    }, 0)

    // totalCreditGiven = total value of all non-cancelled credit orders
    const allActive = await db.salesOrder.count({
      where: {
        orgId:  user.orgId,
        source: "SALES_ORDER",
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
    })

    const totalCreditGiven = await db.salesOrder.findMany({
      where: {
        orgId:  user.orgId,
        source: "SALES_ORDER",
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true },
    }).then(rows => rows.reduce((s, o) => s + calcTotal(o), 0))

    const totalCancelled = cancelledRefunded.reduce((s, o) => s + calcTotal(o), 0)
    const totalRefunded  = cancelledRefunded.reduce((s, o) => s + Number(o.amountPaid ?? 0), 0)

    // activeDebtors = unique customers with money actually owing right now
    // Use paymentsSum for legacy rows where amountPaid column was never set
    const debtorSet = new Set(
      unpaidOrders
        .filter(o => {
          const paymentsSum = (o as any).payments?.reduce((ps: number, p: { amount: number }) => ps + Number(p.amount), 0) ?? 0
          const truePaid    = Math.max(Number(o.amountPaid ?? 0), paymentsSum)
          const trueOwing   = o.paymentStatus === "PAID" ? 0
            : Number(o.amountOwing ?? 0) > 0 ? Number(o.amountOwing)
            : Math.max(0, calcTotal(o) - truePaid)
          return trueOwing > 0.01
        })
        .map(o => o.customerId)
        .filter(Boolean)
    )

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
        activeDebtors: debtorSet.size,
        overdueCount,
        paidCount,
        partialCount: unpaidOrders.filter(o => o.paymentStatus === "PARTIAL").length,
        pendingCount: unpaidOrders.filter(o => o.paymentStatus === "PENDING").length,
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