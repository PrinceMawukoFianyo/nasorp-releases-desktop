"use server"

import { db } from "@/prisma/db"
import { PurchaseOrderStatus } from "@prisma/client"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import PurchaseOrderEmail, { PurchaseOrderEmailProps } from "@/components/email-templates/purchase-order-email"

const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================================
// TYPES
// ============================================================================

interface CreatePOLineItem {
  id?: string
  itemId: string
  quantity: number
  unitPrice: string | number
  taxRate: number
  locationId?: string
}

interface CreatePOData {
  poNumber: string
  supplierId: string
  deliveryLocationId: string
  orderDate: string
  expectedDeliveryDate?: string | null
  deliveryAddress?: string
  notes?: string | null
  shippingCost?: string | number
  taxPercentage?: number
  paymentTerms?: string | null
  status?: PurchaseOrderStatus
  lineItems: CreatePOLineItem[]
  paymentStatus?: "UNPAID" | "PARTIAL" | "PAID"
  amountPaid?: number
  amountOwing?: number
}

// ============================================================================
// HELPERS
// ============================================================================

async function generateUniquePONumber(orgId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const lastPO = await db.purchaseOrder.findFirst({
    where: { orgId, poNumber: { startsWith: `PO-${year}${month}` } },
    orderBy: { poNumber: 'desc' }
  })
  let sequence = 1
  if (lastPO) {
    const parts = lastPO.poNumber.split('-')
    if (parts.length === 3) sequence = parseInt(parts[2]) + 1
  }
  return `PO-${year}${month}-${String(sequence).padStart(4, '0')}`
}

async function isPONumberUnique(poNumber: string, orgId: string, excludeId?: string): Promise<boolean> {
  const existing = await db.purchaseOrder.findFirst({
    where: { poNumber, orgId, ...(excludeId ? { id: { not: excludeId } } : {}) }
  })
  return !existing
}

// ============================================================================
// CREATE
// ============================================================================

export async function createPurchaseOrder(data: CreatePOData) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const userId = user.id ?? ""

    let poNumber = data.poNumber?.trim()
    if (!poNumber) poNumber = await generateUniquePONumber(orgId)
    else {
      const isUnique = await isPONumberUnique(poNumber, orgId)
      if (!isUnique) return { success: false, error: `PO Number "${poNumber}" already exists.` }
    }

    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
    const taxAmount = data.lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * Number(item.unitPrice)
      return sum + (itemSubtotal * (item.taxRate / 100))
    }, 0)
    const shippingCost = Number(data.shippingCost) || 0
    const total = subtotal + taxAmount + shippingCost

    let amountPaid = data.amountPaid ?? 0
    let amountOwing = data.amountOwing ?? total
    const paymentStatus = data.paymentStatus ?? "UNPAID"

    if (paymentStatus === "PAID") {
      amountPaid = total
      amountOwing = 0
    } else if (paymentStatus === "PARTIAL" && amountPaid === 0) {
      amountPaid = total / 2
      amountOwing = total - amountPaid
    }

    // Auto‑promote workflow status when paid upfront
    let workflowStatus = data.status || "DRAFT"
    if (paymentStatus === "PAID" && workflowStatus === "DRAFT") {
      workflowStatus = "SUBMITTED"
    }

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        deliveryLocationId: data.deliveryLocationId,
        date: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        address: data.deliveryAddress || "",
        notes: data.notes || null,
        paymentTerms: data.paymentTerms || null,
        subtotal,
        taxAmount,
        shippingCost,
        status: workflowStatus,
        paymentStatus,
        amountPaid,
        amountOwing,
        orgId,
        createdById: userId,
        lines: {
          create: data.lineItems.map((item) => {
            const unitPrice = Number(item.unitPrice)
            const itemSubtotal = item.quantity * unitPrice
            const itemTax = itemSubtotal * (item.taxRate / 100)
            return {
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice,
              taxRate: item.taxRate,
              taxAmount: itemTax,
              total: itemSubtotal + itemTax,
              receivedQuantity: 0,
            }
          })
        }
      },
      include: { lines: { include: { item: true } }, supplier: true, deliveryLocation: true, createdBy: { select: { name: true } } }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath("/dashboard/purchases/payables")
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase order" }
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePurchaseOrder(id: string, data: CreatePOData) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const poNumber = data.poNumber?.trim()
    if (!poNumber) return { success: false, error: "PO Number is required" }
    const isUnique = await isPONumberUnique(poNumber, orgId, id)
    if (!isUnique) return { success: false, error: `PO Number "${poNumber}" already exists.` }

    const existingPO = await db.purchaseOrder.findUnique({
      where: { id, orgId },
      include: { lines: true }
    })
    if (!existingPO) return { success: false, error: "Purchase order not found" }

    const existingLineMap = new Map()
    existingPO.lines.forEach(line => existingLineMap.set(line.itemId, line))

    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
    const taxAmount = data.lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * Number(item.unitPrice)
      return sum + (itemSubtotal * (item.taxRate / 100))
    }, 0)
    const shippingCost = Number(data.shippingCost) || 0
    const total = subtotal + taxAmount + shippingCost

    let amountPaid = data.amountPaid ?? existingPO.amountPaid ?? 0
    let amountOwing = data.amountOwing ?? total - amountPaid
    const paymentStatus = data.paymentStatus ?? existingPO.paymentStatus ?? "UNPAID"

    if (paymentStatus === "PAID") {
      amountPaid = total
      amountOwing = 0
    } else if (paymentStatus === "PARTIAL" && amountPaid === 0) {
      amountPaid = total / 2
      amountOwing = total - amountPaid
    }

    // Auto‑promote if needed
    let workflowStatus = existingPO.status
    if (paymentStatus === "PAID" && workflowStatus === "DRAFT") {
      workflowStatus = "SUBMITTED"
    }

    await db.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } })

    const newLines = data.lineItems.map((item) => {
      const unitPrice = Number(item.unitPrice)
      const itemSubtotal = item.quantity * unitPrice
      const itemTax = itemSubtotal * (item.taxRate / 100)
      const existingLine = existingLineMap.get(item.itemId)
      const receivedQty = existingLine?.receivedQuantity || 0
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice,
        taxRate: item.taxRate,
        taxAmount: itemTax,
        total: itemSubtotal + itemTax,
        receivedQuantity: receivedQty
      }
    })

    const purchaseOrder = await db.purchaseOrder.update({
      where: { id, orgId },
      data: {
        poNumber,
        supplierId: data.supplierId,
        deliveryLocationId: data.deliveryLocationId,
        date: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        address: data.deliveryAddress || "",
        notes: data.notes || null,
        paymentTerms: data.paymentTerms || null,
        subtotal,
        taxAmount,
        shippingCost,
        status: workflowStatus,
        paymentStatus,
        amountPaid,
        amountOwing,
        lines: { create: newLines }
      },
      include: { lines: { include: { item: true } }, supplier: true, deliveryLocation: true, createdBy: { select: { name: true } } }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    revalidatePath("/dashboard/purchases/payables")
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update purchase order" }
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePurchaseOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    await db.purchaseOrder.delete({ where: { id, orgId } })
    revalidatePath("/dashboard/purchases/purchase-orders")
    return { success: true }
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete purchase order" }
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getPurchaseOrders(supplierFilter?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const whereClause: any = { orgId }
    if (supplierFilter) whereClause.supplierId = supplierFilter
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: { include: { item: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return purchaseOrders.map(po => ({ ...po, orderDate: po.date }))
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return []
  }
}

export async function getPurchaseOrderById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id, orgId },
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: { include: { item: true } },
        createdBy: { select: { name: true } }
      }
    })
    if (!purchaseOrder) return null
    return { ...purchaseOrder, orderDate: purchaseOrder.date }
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return null
  }
}

export async function getPurchaseOrder(id: string) {
  return getPurchaseOrderById(id)
}

export async function getSuppliers() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    return await db.supplier.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, contactPerson: true, phone: true, address: true }
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return []
  }
}

export async function getLocations() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    return await db.location.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true }
    })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

export async function getItems() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    return await db.item.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, description: true }
    })
  } catch (error) {
    console.error("Error fetching items:", error)
    return []
  }
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const purchaseOrder = await db.purchaseOrder.update({
      where: { id, orgId },
      data: { status },
      include: { supplier: true, deliveryLocation: true, lines: { include: { item: true } } }
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error updating purchase order status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" }
  }
}

export async function receivePOGoods(id: string, receivedDate?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const purchaseOrder = await db.purchaseOrder.update({
      where: { id, orgId },
      data: { status: "RECEIVED" },
      include: { supplier: true, deliveryLocation: true, lines: { include: { item: true } } }
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error receiving goods:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive goods" }
  }
}

export async function cancelPurchaseOrder(id: string, reason?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const currentPO = await db.purchaseOrder.findUnique({ where: { id, orgId }, select: { notes: true } })
    let updatedNotes = reason ? `CANCELLED: ${reason}` : 'CANCELLED'
    if (currentPO?.notes) updatedNotes += `\n\nOriginal notes: ${currentPO.notes}`
    const purchaseOrder = await db.purchaseOrder.update({
      where: { id, orgId },
      data: { status: "CANCELLED", notes: updatedNotes },
      include: { supplier: true, deliveryLocation: true, lines: { include: { item: true } } }
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error cancelling purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel purchase order" }
  }
}

export async function completePurchaseOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const purchaseOrder = await db.purchaseOrder.update({
      where: { id, orgId },
      data: { status: PurchaseOrderStatus.COMPLETED },
      include: { supplier: true, lines: { include: { item: true } } }
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    return { success: true, data: purchaseOrder }
  } catch (error) {
    console.error("Error completing purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete purchase order" }
  }
}

export async function generatePONumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))
  try {
    const todayPOCount = await db.purchaseOrder.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } })
    const sequence = String(todayPOCount + 1).padStart(4, '0')
    const poNumber = `PO-${datePrefix}-${sequence}`
    const existing = await db.purchaseOrder.findUnique({ where: { poNumber } })
    if (existing) return generatePONumber()
    return poNumber
  } catch (error) {
    console.error("Error generating PO number:", error)
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PO-${datePrefix}-${random}${timestamp.toString().slice(-4)}`
  }
}

export async function getPurchaseOrderLineItems(purchaseOrderId: string) {
  try {
    return await db.purchaseOrderLine.findMany({
      where: { purchaseOrderId },
      include: { item: true }
    })
  } catch (error) {
    console.error("Error fetching line items:", error)
    throw error
  }
}

export async function getRecentPurchaseOrders(limit = 5) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const orders = await db.purchaseOrder.findMany({
      where: { orgId, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        poNumber: true,
        supplier: { select: { name: true } },
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
        status: true,
        createdAt: true,
      },
    })
    const mapped = orders.map(po => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier?.name ?? "Unknown",
      total: po.subtotal + po.taxAmount + (po.shippingCost || 0) - (po.discount || 0),
      status: po.status,
      date: po.createdAt,
    }))
    return { success: true, data: mapped }
  } catch (error) {
    console.error("getRecentPurchaseOrders error:", error)
    return { success: false, data: [], error: String(error) }
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

async function preparePurchaseOrderEmailData(poNumber: string) {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId ?? ""
  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { poNumber, orgId },
    include: {
      supplier: true,
      deliveryLocation: true,
      lines: { include: { item: true } },
      createdBy: { select: { name: true } }
    }
  })
  if (!purchaseOrder) throw new Error("Purchase order not found")
  const companyInfo = {
    name: "Business Inventory",
    address: "Sunyani, USana",
    phone: "+233 5698734",
    email: "info@businessinventory.com",
  }
  const emailData: PurchaseOrderEmailProps = {
    purchaseOrder: {
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      date: purchaseOrder.date,
      supplierId: purchaseOrder.supplierId,
      supplier: {
        id: purchaseOrder.supplier.id,
        name: purchaseOrder.supplier.name,
        phone: purchaseOrder.supplier.phone,
        email: purchaseOrder.supplier.email,
        address: purchaseOrder.supplier.address,
      },
      status: purchaseOrder.status,
      subtotal: purchaseOrder.subtotal,
      taxAmount: purchaseOrder.taxAmount,
      shippingCost: purchaseOrder.shippingCost || 0,
      discount: purchaseOrder.discount || 0,
      total: purchaseOrder.subtotal + purchaseOrder.taxAmount + (purchaseOrder.shippingCost || 0),
      notes: purchaseOrder.notes,
      paymentTerms: purchaseOrder.paymentTerms,
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
      createdBy: { name: purchaseOrder.createdBy?.name || null },
      createdAt: purchaseOrder.createdAt,
    },
    lineItems: purchaseOrder.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      itemId: line.itemId,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
      discount: line.discount || 0,
      total: line.total,
      receivedQuantity: line.receivedQuantity,
      item: {
        id: line.item.id,
        name: line.item.name,
        sku: line.item.sku,
        description: line.item.description || "",
      },
    })),
    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
    companyPhone: companyInfo.phone,
    companyEmail: companyInfo.email,
    deliveryAddress: purchaseOrder.address || companyInfo.address,
  }
  return emailData
}

export async function sendPOToSupplier(poNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const emailData = await preparePurchaseOrderEmailData(poNumber)
    if (!emailData.purchaseOrder.supplier.email) throw new Error("Supplier email address is not available")
    await resend.emails.send({
      from: "Business Inventory <noreply@rich83ventures.inventpmf.com>",
      to: emailData.purchaseOrder.supplier.email,
      subject: `Purchase Order ${emailData.purchaseOrder.poNumber}`,
      react: PurchaseOrderEmail(emailData),
    })
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    await db.purchaseOrder.update({
      where: { poNumber, orgId },
      data: { status: PurchaseOrderStatus.SUBMITTED },
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    return { success: true }
  } catch (error) {
    console.error("Error sending PO to supplier:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" }
  }
}

export async function sendPOEmailToRecipient(poNumber: string, recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const emailData = await preparePurchaseOrderEmailData(poNumber)
    await resend.emails.send({
      from: "Business Inventory <noreply@rich83ventures.inventpmf.com>",
      to: recipientEmail,
      subject: `Purchase Order ${emailData.purchaseOrder.poNumber} from ${emailData.companyName}`,
      react: PurchaseOrderEmail(emailData),
    })
    revalidatePath("/dashboard/purchases/purchase-orders")
    return { success: true }
  } catch (error) {
    console.error("Error sending purchase order email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" }
  }
}