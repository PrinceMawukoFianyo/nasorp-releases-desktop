// actions/supplier-payables.ts
"use server"

import { db }                   from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath }       from "next/cache"
import { format }               from "date-fns"

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Before this file will compile you must:
//   1. npx prisma migrate dev --name add_supplier_payments
//   2. npx prisma generate
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type APPaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHEQUE"

export interface SupplierPaymentRecord {
  id:          string
  amount:      number
  method:      APPaymentMethod
  reference?:  string
  notes?:      string
  paidAt:      Date
  recordedBy?: string
}

export interface SupplierPayable {
  id:              string
  poNumber:        string
  supplierId:      string
  supplierName:    string
  supplierPhone?:  string
  supplierEmail?:  string
  totalAmount:     number
  amountPaid:      number
  amountOwing:     number
  orderDate:       Date
  expectedDate?:   Date | null
  paymentStatus:   "UNPAID" | "PARTIAL" | "PAID"
  payments:        SupplierPaymentRecord[]
  receiptNumbers:  string[]
}

export type APLedgerEventType =
  | "GOODS_RECEIVED"
  | "PAYMENT_MADE"
  | "PO_CANCELLED"
  | "PAYMENT_VOIDED"

export interface APLedgerEntry {
  id:             string
  eventType:      APLedgerEventType
  poId:           string
  poNumber:       string
  supplierId:     string | null
  supplierName:   string
  supplierPhone:  string | null
  date:           string
  rawDate:        Date
  poTotal:        number
  amountPaid:     number
  amountOwing:    number
  paymentMethod:  string | null
  reference:      string | null
  paymentStatus:  string
  notes:          string | null
  recordedBy:     string | null
  receiptNumber:  string | null
}

export interface APLedgerSummary {
  totalPayables:     number
  totalPaid:         number
  totalOutstanding:  number
  totalCancelled:    number
  activeCreditors:   number
  overdueCount:      number
  paidCount:         number
  partialCount:      number
  unpaidCount:       number
}

export interface CreditorSummary {
  supplierId:    string
  supplierName:  string
  supplierPhone: string | null
  supplierEmail: string | null
  totalOwing:    number
  totalPaid:     number
  orderCount:    number
  overdueCount:  number
  oldestDueDate: Date | null
  orders: Array<{
    id:           string
    poNumber:     string
    orderTotal:   number
    amountPaid:   number
    amountOwing:  number
    isOverdue:    boolean
    expectedDate: string | null
  }>
}

export interface APCsvRow {
  Date:              string
  "PO #":            string
  Supplier:          string
  Phone:             string
  Event:             string
  "PO Total":        string
  "Amount Paid":     string
  "Amount Owing":    string
  "Payment Method":  string
  Reference:         string
  "Payment Status":  string
  Notes:             string
  "Recorded By":     string
}

// ── Internal typed shape returned by findMany queries ────────────────────────
// These mirror exactly what Prisma returns after the migration + generate.

type POWithRelations = {
  id:                   string
  poNumber:             string
  supplierId:           string
  status:               string
  subtotal:             number
  taxAmount:            number
  shippingCost:         number | null
  discount:             number | null
  notes:                string | null
  expectedDeliveryDate: Date | null
  createdAt:            Date
  // NEW fields — present after migration
  amountPaid:           number
  amountOwing:          number
  paymentStatus:        string
  // Relations
  supplier: {
    id:    string
    name:  string
    phone: string | null
    email: string | null
  } | null
  payments: Array<{
    id:          string
    amount:      number
    method:      string
    reference:   string | null
    notes:       string | null
    paidAt:      Date
    recordedBy:  { name: string } | null
  }>
  goodsReceipts: Array<{
    receiptNumber: string
    receivedDate:  Date
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcPOTotal(po: Pick<POWithRelations, "subtotal" | "taxAmount" | "shippingCost" | "discount">): number {
  return (
    Number(po.subtotal     ?? 0) +
    Number(po.taxAmount    ?? 0) +
    Number(po.shippingCost ?? 0) -
    Number(po.discount     ?? 0)
  )
}

function computeOwing(
  po: Pick<POWithRelations, "subtotal" | "taxAmount" | "shippingCost" | "discount" | "amountPaid" | "amountOwing" | "paymentStatus" | "status">
): number {
  if (po.status === "CANCELLED")       return 0
  if (po.paymentStatus === "PAID")     return 0
  const total = calcPOTotal(po)
  const paid  = Number(po.amountPaid ?? 0)
  if (Number(po.amountOwing ?? 0) > 0) return Number(po.amountOwing)
  return Math.max(0, total - paid)
}

function resolvePaymentStatus(owing: number, paid: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (owing <= 0.01) return "PAID"
  if (paid  >  0)    return "PARTIAL"
  return "UNPAID"
}

// ── Shared Prisma include shape ───────────────────────────────────────────────
// Written as a plain object so we get type inference on results.

const PO_AP_INCLUDE = {
  supplier: {
    select: { id: true, name: true, phone: true, email: true },
  },
  payments: {
    orderBy: { paidAt: "asc" as const },
    include: { recordedBy: { select: { name: true } } },
  },
  goodsReceipts: {
    select: { receiptNumber: true, receivedDate: true },
  },
} as const

// ── Record a payment to a supplier ───────────────────────────────────────────

export async function recordSupplierPayment(input: {
  purchaseOrderId: string
  amount:          number
  method:          APPaymentMethod
  reference?:      string
  notes?:          string
}) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    // Fetch PO with new fields — cast result since Prisma types update after generate
    const poRaw = await db.purchaseOrder.findUnique({
      where:   { id: input.purchaseOrderId, orgId: user.orgId },
      include: PO_AP_INCLUDE,
    })
    const po = poRaw as unknown as POWithRelations | null
    if (!po) return { success: false, error: "Purchase order not found" }

    const poTotal   = calcPOTotal(po)
    const paidSoFar = po.payments.reduce((s, p) => s + Number(p.amount), 0)
    const maxOwing  = Math.max(0, poTotal - paidSoFar)

    if (input.amount > maxOwing + 0.01) {
      return { success: false, error: `Cannot pay more than outstanding balance (${maxOwing.toFixed(2)})` }
    }

    const dbClient = db as any   // supplierPayment model — added after migration

    const payment = await db.$transaction(async (tx) => {
      const txClient = tx as any

      // Create the SupplierPayment row
      const pmt = await txClient.supplierPayment.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          amount:          input.amount,
          method:          input.method,
          reference:       input.reference ?? null,
          notes:           input.notes     ?? null,
          paidAt:          new Date(),
          recordedById:    user.id,
          orgId:           user.orgId,
        },
      })

      // Update running totals on PO
      const newPaid   = paidSoFar + input.amount
      const newOwing  = Math.max(0, poTotal - newPaid)
      const newStatus = resolvePaymentStatus(newOwing, newPaid)

      await tx.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data:  {
          amountPaid:    newPaid,
          amountOwing:   newOwing,
          paymentStatus: newStatus,
        } as any,    // paymentStatus field — added after migration
      })

      return pmt
    })

    revalidatePath("/dashboard/purchases/payables")
    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath("/dashboard")

    return { success: true, data: payment }
  } catch (err: any) {
    console.error("[recordSupplierPayment]", err)
    return { success: false, error: err?.message ?? "Failed to record payment" }
  }
}

// ── Get all payables ──────────────────────────────────────────────────────────

export async function getSupplierPayables(): Promise<{
  success: boolean
  data?:   SupplierPayable[]
  error?:  string
}> {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    const rawPOs = await db.purchaseOrder.findMany({
      where: {
        orgId:  user.orgId,
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED"] },
      },
      include: PO_AP_INCLUDE,
      orderBy: { createdAt: "desc" },
    })

    // Cast to our typed shape — safe once prisma generate has run
    const pos = rawPOs as unknown as POWithRelations[]

    const payables: SupplierPayable[] = pos.map(po => {
      const total      = calcPOTotal(po)
      const paidSum    = po.payments.reduce((s, p) => s + Number(p.amount), 0)
      const amountPaid = Number(po.amountPaid ?? 0) > 0 ? Number(po.amountPaid) : paidSum
      const rawOwing   = Number(po.amountOwing ?? 0)
      const amountOwing =
        po.status === "CANCELLED" ? 0
        : po.paymentStatus === "PAID" ? 0
        : rawOwing > 0 ? rawOwing
        : Math.max(0, total - amountPaid)

      return {
        id:             po.id,
        poNumber:       po.poNumber,
        supplierId:     po.supplierId ?? "",
        supplierName:   po.supplier?.name  ?? "Unknown Supplier",
        supplierPhone:  po.supplier?.phone  ?? undefined,
        supplierEmail:  po.supplier?.email  ?? undefined,
        totalAmount:    total,
        amountPaid,
        amountOwing,
        orderDate:      new Date(po.createdAt),
        expectedDate:   po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null,
        paymentStatus:  resolvePaymentStatus(amountOwing, amountPaid),
        payments:       po.payments.map(p => ({
          id:         p.id,
          amount:     Number(p.amount),
          method:     p.method as APPaymentMethod,
          reference:  p.reference  ?? undefined,
          notes:      p.notes      ?? undefined,
          paidAt:     new Date(p.paidAt),
          recordedBy: p.recordedBy?.name ?? undefined,
        })),
        receiptNumbers: po.goodsReceipts.map(gr => gr.receiptNumber),
      }
    })

    return { success: true, data: payables }
  } catch (err: any) {
    console.error("[getSupplierPayables]", err)
    return { success: false, error: err?.message ?? "Failed to fetch payables" }
  }
}

// ── Full AP Ledger ────────────────────────────────────────────────────────────

export async function getAPLedger(): Promise<{
  success: boolean
  data?:   { entries: APLedgerEntry[]; summary: APLedgerSummary; exportRows: APCsvRow[] }
  error?:  string
}> {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    const rawPOs = await db.purchaseOrder.findMany({
      where: {
        orgId:  user.orgId,
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"] },
      },
      include: PO_AP_INCLUDE,
      orderBy: { createdAt: "desc" },
    })

    const pos = rawPOs as unknown as POWithRelations[]

    const entries: APLedgerEntry[] = []

    for (const po of pos) {
      const poTotal = calcPOTotal(po)
      const paidSum = po.payments.reduce((s, p) => s + Number(p.amount), 0)
      const owing   = computeOwing({ ...po, amountPaid: paidSum, amountOwing: Math.max(0, poTotal - paidSum) })

      // One "GOODS_RECEIVED" entry per goods receipt
      const receipts = po.goodsReceipts
      if (receipts.length > 0) {
        for (const gr of receipts) {
          entries.push({
            id:            `gr-${po.id}-${gr.receiptNumber}`,
            eventType:     "GOODS_RECEIVED",
            poId:          po.id,
            poNumber:      po.poNumber,
            supplierId:    po.supplierId,
            supplierName:  po.supplier?.name  ?? "Unknown",
            supplierPhone: po.supplier?.phone ?? null,
            date:          format(new Date(gr.receivedDate), "dd MMM yyyy"),
            rawDate:       new Date(gr.receivedDate),
            poTotal,
            amountPaid:    0,
            amountOwing:   owing,
            paymentMethod: null,
            reference:     gr.receiptNumber,
            paymentStatus: po.paymentStatus ?? "UNPAID",
            notes:         `Goods received · Receipt: ${gr.receiptNumber}`,
            recordedBy:    null,
            receiptNumber: gr.receiptNumber,
          })
        }
      } else {
        entries.push({
          id:            `po-${po.id}`,
          eventType:     po.status === "CANCELLED" ? "PO_CANCELLED" : "GOODS_RECEIVED",
          poId:          po.id,
          poNumber:      po.poNumber,
          supplierId:    po.supplierId,
          supplierName:  po.supplier?.name  ?? "Unknown",
          supplierPhone: po.supplier?.phone ?? null,
          date:          format(new Date(po.createdAt), "dd MMM yyyy"),
          rawDate:       new Date(po.createdAt),
          poTotal,
          amountPaid:    0,
          amountOwing:   owing,
          paymentMethod: null,
          reference:     null,
          paymentStatus: po.paymentStatus ?? "UNPAID",
          notes:         po.notes ?? null,
          recordedBy:    null,
          receiptNumber: null,
        })
      }

      // One "PAYMENT_MADE" entry per payment
      for (const pmt of po.payments) {
        entries.push({
          id:            `pmt-${pmt.id}`,
          eventType:     "PAYMENT_MADE",
          poId:          po.id,
          poNumber:      po.poNumber,
          supplierId:    po.supplierId,
          supplierName:  po.supplier?.name  ?? "Unknown",
          supplierPhone: po.supplier?.phone ?? null,
          date:          format(new Date(pmt.paidAt), "dd MMM yyyy"),
          rawDate:       new Date(pmt.paidAt),
          poTotal,
          amountPaid:    Number(pmt.amount),
          amountOwing:   owing,
          paymentMethod: pmt.method,
          reference:     pmt.reference ?? null,
          paymentStatus: po.paymentStatus ?? "UNPAID",
          notes:         pmt.notes ?? null,
          recordedBy:    pmt.recordedBy?.name ?? null,
          receiptNumber: null,
        })
      }
    }

    entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

    // Summary
    const active    = pos.filter(p => p.status !== "CANCELLED")
    const cancelled = pos.filter(p => p.status === "CANCELLED")

    const totalPayables    = active.reduce((s, p) => s + calcPOTotal(p), 0)
    const totalPaid        = active.reduce((s, p) => s + p.payments.reduce((ps, pmt) => ps + Number(pmt.amount), 0), 0)
    const totalOutstanding = Math.max(0, totalPayables - totalPaid)
    const totalCancelled   = cancelled.reduce((s, p) => s + calcPOTotal(p), 0)

    const activeCreditors = new Set(
      active.filter(p => computeOwing(p) > 0).map(p => p.supplierId)
    ).size

    const paidCount    = active.filter(p => (p.paymentStatus ?? "") === "PAID").length
    const partialCount = active.filter(p => (p.paymentStatus ?? "") === "PARTIAL").length
    const unpaidCount  = active.filter(p => !["PAID", "PARTIAL"].includes(p.paymentStatus ?? "")).length
    const overdueCount = active.filter(p => {
      if (!p.expectedDeliveryDate) return false
      if ((p.paymentStatus ?? "") === "PAID") return false
      return new Date(p.expectedDeliveryDate) < new Date()
    }).length

    const summary: APLedgerSummary = {
      totalPayables, totalPaid, totalOutstanding, totalCancelled,
      activeCreditors, overdueCount, paidCount, partialCount, unpaidCount,
    }

    const exportRows: APCsvRow[] = entries.map(e => ({
      "Date":            e.date,
      "PO #":            e.poNumber,
      "Supplier":        e.supplierName,
      "Phone":           e.supplierPhone ?? "",
      "Event":           e.eventType.replace(/_/g, " "),
      "PO Total":        e.poTotal.toFixed(2),
      "Amount Paid":     e.amountPaid.toFixed(2),
      "Amount Owing":    e.amountOwing.toFixed(2),
      "Payment Method":  e.paymentMethod ?? "",
      "Reference":       e.reference ?? "",
      "Payment Status":  e.paymentStatus,
      "Notes":           e.notes ?? "",
      "Recorded By":     e.recordedBy ?? "",
    }))

    return { success: true, data: { entries, summary, exportRows } }
  } catch (err: any) {
    console.error("[getAPLedger]", err)
    return { success: false, error: err?.message ?? "Failed to fetch AP ledger" }
  }
}

// ── Creditors list ────────────────────────────────────────────────────────────

export async function getCreditorsList(): Promise<{
  success: boolean
  data?:   CreditorSummary[]
  error?:  string
}> {
  try {
    const result = await getSupplierPayables()
    if (!result.success || !result.data) return { success: false, error: result.error }

    const owing = result.data.filter(p => p.amountOwing > 0.01)
    const bySupplier = new Map<string, CreditorSummary>()

    for (const p of owing) {
      if (!bySupplier.has(p.supplierId)) {
        bySupplier.set(p.supplierId, {
          supplierId:    p.supplierId,
          supplierName:  p.supplierName,
          supplierPhone: p.supplierPhone ?? null,
          supplierEmail: p.supplierEmail ?? null,
          totalOwing:    0,
          totalPaid:     0,
          orderCount:    0,
          overdueCount:  0,
          oldestDueDate: null,
          orders:        [],
        })
      }
      const s = bySupplier.get(p.supplierId)!
      const isOverdue = p.expectedDate
        ? p.expectedDate < new Date() && p.amountOwing > 0
        : false

      s.totalOwing  += p.amountOwing
      s.totalPaid   += p.amountPaid
      s.orderCount  += 1
      if (isOverdue) s.overdueCount += 1
      if (p.expectedDate && (!s.oldestDueDate || p.expectedDate < s.oldestDueDate)) {
        s.oldestDueDate = p.expectedDate
      }
      s.orders.push({
        id:           p.id,
        poNumber:     p.poNumber,
        orderTotal:   p.totalAmount,
        amountPaid:   p.amountPaid,
        amountOwing:  p.amountOwing,
        isOverdue,
        expectedDate: p.expectedDate ? format(p.expectedDate, "dd MMM yyyy") : null,
      })
    }

    return {
      success: true,
      data: Array.from(bySupplier.values()).sort((a, b) => b.totalOwing - a.totalOwing),
    }
  } catch (err: any) {
    console.error("[getCreditorsList]", err)
    return { success: false, error: err?.message ?? "Failed to fetch creditors" }
  }
}

// ── Stats for accounting dashboard ───────────────────────────────────────────

export async function getAPStats(): Promise<{
  success: boolean
  data?:   {
    totalOutstanding:   number
    totalPaidThisMonth: number
    activeCreditors:    number
    overdueCount:       number
    paidCount:          number
    partialCount:       number
    unpaidCount:        number
  }
  error?: string
}> {
  try {
    const ledger = await getAPLedger()
    if (!ledger.success || !ledger.data) return { success: false, error: ledger.error }

    const s          = ledger.data.summary
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const paidThisMonth = ledger.data.entries
      .filter(e => e.eventType === "PAYMENT_MADE" && e.rawDate >= monthStart)
      .reduce((s, e) => s + e.amountPaid, 0)

    return {
      success: true,
      data: {
        totalOutstanding:   s.totalOutstanding,
        totalPaidThisMonth: paidThisMonth,
        activeCreditors:    s.activeCreditors,
        overdueCount:       s.overdueCount,
        paidCount:          s.paidCount,
        partialCount:       s.partialCount,
        unpaidCount:        s.unpaidCount,
      },
    }
  } catch (err: any) {
    console.error("[getAPStats]", err)
    return { success: false, error: err?.message ?? "Failed to fetch AP stats" }
  }
}

// ── Export CSV helper ─────────────────────────────────────────────────────────

export async function exportAPLedgerToCsv(rows: APCsvRow[]): Promise<string> {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0]) as (keyof APCsvRow)[]
  const esc = (v: string) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.map(esc).join(","),
    ...rows.map(r => headers.map(h => esc(r[h])).join(",")),
  ].join("\n")
}

export async function createManualSupplierDebt(data: {
  supplierId: string;
  amountOwing: number;
  notes?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    const supplier = await db.supplier.findFirst({
      where: { id: data.supplierId, orgId: user.orgId },
    });
    if (!supplier) return { success: false, error: "Supplier not found" };

    const debt = await db.manualSupplierDebt.create({
      data: {
        orgId: user.orgId,
        supplierId: data.supplierId,
        amountOwing: data.amountOwing,
        amountPaid: 0,
        status: data.amountOwing > 0 ? "PENDING" : "PAID",
        notes: data.notes,
      },
    });
    return { success: true, data: debt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}