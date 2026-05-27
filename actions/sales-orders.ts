// actions/sales-orders.ts - FIXED: Credit sales now always deduct stock
"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { SalesOrderStatus, PaymentStatus } from "@prisma/client"
import { Resend } from 'resend'
import SalesOrderEmail, { SalesOrderEmailProps } from "@/components/email-templates/sales-order-email"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function createSalesOrder(data: {
  orderNumber: string
  customerId: string
  locationId?: string | null
  orderDate: Date
  deliveryDate?: Date | null
  status: string
  paymentStatus: string
  paymentMethod?: string
  shippingCost: number
  discount: number
  notes?: string
  subtotal: number
  taxAmount: number
  lines: {
    create: Array<{
      itemId: string
      quantity: number
      unitPrice: number
      taxRate: number
      taxAmount: number
      total: number
      serialNumbers: string[]
    }>
  }
}) {
  try {
    const user = await getAuthenticatedUser()

    if (!user?.id) return { success: false, error: "Authentication required — please log in again" }
    if (!data.customerId) return { success: false, error: "Customer is required" }
    if (!data.lines.create || data.lines.create.length === 0)
      return { success: false, error: "At least one line item is required" }

    const existingOrder = await db.salesOrder.findFirst({
      where: { orderNumber: data.orderNumber, orgId: user.orgId },
    })
    if (existingOrder) return { success: false, error: "Order number already exists" }

    // ── FIX: Stock deduction for credit sales ─────────────────────────────────
    // Credit orders (PENDING/PARTIAL payment) must ALWAYS deduct stock immediately
    // so inventory is accurate. Previously only deducted when locationId was set
    // AND status != DRAFT — this left credit sales with no stock deduction at all.
    //
    // New rules:
    //  • status === DRAFT → never deduct (not confirmed yet)
    //  • status !== DRAFT (CONFIRMED, COMPLETED, etc.) → always deduct
    //    - locationId set → deduct from that specific location
    //    - no locationId   → deduct from best-stocked location per item
    const shouldDeductStock = data.status !== "DRAFT"

    const lineLocationMap = new Map<string, string>() // itemId → resolved locationId

    if (shouldDeductStock) {
      for (const line of data.lines.create) {
        if (data.locationId) {
          // Specific location: check availability
          const inventory = await db.inventory.findUnique({
            where: { itemId_locationId: { itemId: line.itemId, locationId: data.locationId } },
            select: { quantity: true, reservedQuantity: true },
          })
          const available = Math.max(0, (inventory?.quantity ?? 0) - (inventory?.reservedQuantity ?? 0))
          if (available < line.quantity) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return {
              success: false,
              error: `Insufficient stock for "${item?.name ?? line.itemId}" at this location. Available: ${available}, Requested: ${line.quantity}`,
            }
          }
          lineLocationMap.set(line.itemId, data.locationId)
        } else {
          // No location: find best-stocked location org-wide
          const inventories = await db.inventory.findMany({
            where: { itemId: line.itemId, orgId: user.orgId },
            select: { locationId: true, quantity: true, reservedQuantity: true },
            orderBy: { quantity: "desc" },
          })
          const totalAvailable = inventories.reduce(
            (s, i) => s + Math.max(0, i.quantity - (i.reservedQuantity ?? 0)), 0
          )
          if (totalAvailable < line.quantity) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return {
              success: false,
              error: `Insufficient stock for "${item?.name ?? line.itemId}". Total available: ${totalAvailable}, Requested: ${line.quantity}`,
            }
          }
          const best = inventories.find(i => Math.max(0, i.quantity - (i.reservedQuantity ?? 0)) >= line.quantity)
            ?? inventories.find(i => i.quantity - (i.reservedQuantity ?? 0) > 0)
          if (!best) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return { success: false, error: `No stock found for "${item?.name}"` }
          }
          lineLocationMap.set(line.itemId, best.locationId)
        }
      }
    }

    // Atomic transaction: create order + deduct stock together
    const salesOrder = await db.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          orderNumber:   data.orderNumber,
          customerId:    data.customerId,
          locationId:    data.locationId ?? undefined,
          status:        data.status as SalesOrderStatus,
          paymentStatus: data.paymentStatus as PaymentStatus,
          paymentMethod: data.paymentMethod,
          shippingCost:  data.shippingCost,
          discount:      data.discount,
          notes:         data.notes,
          subtotal:      data.subtotal,
          taxAmount:     data.taxAmount,
          orgId:         user.orgId,
          createdById:   user.id,
          lines: { create: data.lines.create },
        },
        include: {
          customer: true,
          location: true,
          createdBy: { select: { id: true, name: true, email: true } },
          lines: { include: { item: true } },
        },
      })

      if (shouldDeductStock) {
        for (const line of data.lines.create) {
          const resolvedLocationId = lineLocationMap.get(line.itemId)
          if (!resolvedLocationId) continue

          await tx.inventory.update({
            where: { itemId_locationId: { itemId: line.itemId, locationId: resolvedLocationId } },
            data: { quantity: { decrement: line.quantity } },
          })
          await tx.item.update({
            where: { id: line.itemId },
            data: {
              salesCount: { increment: line.quantity },
              salesTotal: { increment: line.total },
            },
          })
          await tx.inventoryTransaction.create({
            data: {
              itemId:          line.itemId,
              locationId:      resolvedLocationId,
              type:            "SALE",
              quantity:        -line.quantity,
              referenceNumber: data.orderNumber,
              notes:           `Credit Credit Sales ${data.orderNumber} — stock deducted on creation`,
              orgId:           user.orgId,
              userId:          user.id,
            },
          })
        }
      }

      return order
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath("/dashboard/sales/orders/create")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard")

    return { success: true, data: salesOrder }
  } catch (error: any) {
    console.error("Error creating Credit Sales:", error)
    if (error.code === 'P2002') return { success: false, error: "Order number already exists" }
    if (error.code === 'P2003') return { success: false, error: "Invalid customer or location" }
    return { success: false, error: error.message || "Failed to create Credit Sales" }
  }
}

export async function getSalesOrders() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId

    // 1. Fetch normal Credit Saless (excluding POS)
    const salesOrders = await db.salesOrder.findMany({
      where: { orgId },
      include: {
        customer: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true } },
        payments: { orderBy: { paidAt: "desc" } },
        salesReturns: {
          orderBy: { createdAt: "desc" },
          include: {
            lines: {
              include: {
                item: { select: { id: true, name: true, sku: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    // 2. Fetch manual debts (from the new table)
    const manualDebts = await db.manualDebt.findMany({
      where: { orgId },
      include: { customer: true, payments: true },
    })

    // 3. Convert manual debts to a structure compatible with SalesOrder
    const manualOrders = manualDebts.map(debt => ({
      id: `debt-${debt.id}`,
      orderNumber: `DEBT-${debt.id.slice(-8)}`,
      customer: debt.customer,
      customerId: debt.customerId,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
      status: debt.status === "PAID" ? "COMPLETED" : debt.amountPaid > 0 ? "PARTIAL" : "PENDING",
      paymentStatus: debt.status === "PAID" ? "PAID" : debt.amountPaid > 0 ? "PARTIAL" : "PENDING",
      subtotal: debt.amountOwing + debt.amountPaid,
      taxAmount: 0,
      shippingCost: 0,
      discount: 0,
      amountPaid: debt.amountPaid,
      amountOwing: debt.amountOwing,
      payments: debt.payments,
      lines: [],  // manual debts have no items
      location: null,
      createdBy: null,
      salesReturns: [],
      notes: `Manual debt record (no items)`,
      orderDate: debt.createdAt,     // required by SalesOrder type
      deliveryDate: null,
      paymentMethod: null,
      source: "MANUAL_DEBT",
      organisation: null,
    }))

    // 4. Combine and sort (newest first)
    const allOrders = [...salesOrders, ...manualOrders].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return allOrders
  } catch (error: any) {
    console.error("Error fetching Credit Saless:", error)
    return []
  }
}

export async function getSalesOrderById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const salesOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, address: true },
        },
        location: {
          select: { id: true, name: true, address: true, phone: true, email: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, description: true, unit: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        organisation: {
          select: { id: true, name: true, address: true },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
        salesReturns: {
          include: {
            lines: { 
              include: { 
                item: { select: { id: true, name: true, sku: true } } 
              } 
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!salesOrder) return null

    // Return the order with salesReturns as is - don't rename to returns
    return salesOrder
  } catch (error) {
    console.error("Error fetching Credit Sales:", error)
    return null
  }
}

export async function cancelSalesOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()

    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) return { success: false, error: "Credit Sales not found" }
    if (existingOrder.status === "CANCELLED") return { success: false, error: "Order is already cancelled" }

    const wasStockDeducted = existingOrder.status !== "DRAFT"

    const salesOrder = await db.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id, orgId: user.orgId },
        data: { status: SalesOrderStatus.CANCELLED },
        include: {
          customer: true,
          location: true,
          createdBy: { select: { id: true, name: true, email: true } },
          lines: { include: { item: true } },
        },
      })

      if (wasStockDeducted) {
        for (const line of existingOrder.lines) {
          // Restore stock to the location (or the location stored on order)
          const resolvedLocationId = existingOrder.locationId
          if (!resolvedLocationId) continue

          await tx.inventory.update({
            where: { itemId_locationId: { itemId: line.itemId, locationId: resolvedLocationId } },
            data: { quantity: { increment: line.quantity } },
          })
          await tx.item.update({
            where: { id: line.itemId },
            data: {
              salesCount: { decrement: line.quantity },
              salesTotal: { decrement: line.total },
            },
          })
          await tx.inventoryTransaction.create({
            data: {
              itemId:          line.itemId,
              locationId:      resolvedLocationId,
              type:            "RETURN",
              quantity:        line.quantity,
              referenceNumber: existingOrder.orderNumber,
              notes:           `Cancelled Credit Sales ${existingOrder.orderNumber} — stock reversed`,
              orgId:           user.orgId,
              userId:          user.id,
            },
          })
        }
      }

      return updated
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard")

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error cancelling Credit Sales:", error)
    return { success: false, error: "Failed to cancel Credit Sales" }
  }
}

export async function cancelCreditOrder(id: string, reason?: string) {
  try {
    const user = await getAuthenticatedUser()

    const order = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: {
        lines: true,
        payments: true,
        customer: { select: { id: true, name: true } },
      },
    })

    if (!order) return { success: false, error: "Credit Sales not found" }
    if (order.status === "CANCELLED") return { success: false, error: "Order is already cancelled" }
    if (order.paymentStatus === "PAID") {
      return {
        success: false,
        error: "This order is fully paid. Use a Sales Return instead of cancelling.",
      }
    }

    const totalPaymentsRecorded = order.payments.reduce((s, p) => s + p.amount, 0)
    const wasStockDeducted = order.status !== "DRAFT"

    await db.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status:        SalesOrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
          amountPaid:    0,
          amountOwing:   0,
          notes: reason
            ? `${order.notes ? order.notes + "\n" : ""}CANCELLED: ${reason}`
            : order.notes,
        },
      })

      if (wasStockDeducted) {
        for (const line of order.lines) {
          const resolvedLocationId = order.locationId
          if (!resolvedLocationId) continue

          await tx.inventory.update({
            where: { itemId_locationId: { itemId: line.itemId, locationId: resolvedLocationId } },
            data: { quantity: { increment: line.quantity } },
          })
          await tx.item.update({
            where: { id: line.itemId },
            data: {
              salesCount: { decrement: line.quantity },
              salesTotal: { decrement: line.total },
            },
          })
          await tx.inventoryTransaction.create({
            data: {
              itemId:          line.itemId,
              locationId:      resolvedLocationId,
              type:            "RETURN",
              quantity:        line.quantity,
              referenceNumber: order.orderNumber,
              notes:           `Credit order cancelled — ${order.orderNumber}${reason ? ": " + reason : ""}`,
              orgId:           user.orgId,
              userId:          user.id,
            },
          })
        }
      }

      if (order.payments.length > 0) {
        await tx.salesOrderPayment.updateMany({
          where: { orderId: id },
          data: { reference: "VOIDED — credit order cancelled" },
        })
      }
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: {
        orderNumber:           order.orderNumber,
        customerName:          order.customer?.name,
        itemsRestocked:        wasStockDeducted ? order.lines.length : 0,
        paymentsVoided:        order.payments.length,
        totalPaymentsReversed: totalPaymentsRecorded,
      },
    }
  } catch (error: any) {
    console.error("cancelCreditOrder error:", error)
    return { success: false, error: error.message || "Failed to cancel credit order" }
  }
}

export async function updateSalesOrder(id: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    
    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) return { success: false, error: "Credit Sales not found" }
    if (existingOrder.status === "CANCELLED") return { success: false, error: "Cannot update a cancelled order" }
    if (!data.lines?.create || data.lines.create.length === 0)
      return { success: false, error: "At least one line item is required" }

    const salesOrder = await db.$transaction(async (tx) => {
      await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } })
      return tx.salesOrder.update({
        where: { id, orgId: user.orgId },
        data: {
          customerId: data.customerId || null,
          locationId: data.locationId,
          status: data.status,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          shippingCost: data.shippingCost,
          discount: data.discount,
          notes: data.notes,
          lines: { create: data.lines.create },
        },
        include: {
          customer: true,
          location: true,
          createdBy: { select: { id: true, name: true, email: true } },
          lines: { include: { item: true } },
        },
      })
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating Credit Sales:", error)
    return { success: false, error: "Failed to update Credit Sales" }
  }
}

export async function deleteSalesOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) return { success: false, error: "Credit Sales not found" }
    if (!["DRAFT", "CANCELLED"].includes(existingOrder.status))
      return { success: false, error: "Only DRAFT or CANCELLED orders can be deleted" }

    await db.$transaction(async (tx) => {
      await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } })
      await tx.salesOrder.delete({ where: { id, orgId: user.orgId } })
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting Credit Sales:", error)
    return { success: false, error: "Failed to delete Credit Sales" }
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.id) return { success: false, error: "Authentication required" }

    if (!Object.values(SalesOrderStatus).includes(status as SalesOrderStatus))
      return { success: false, error: "Invalid status" }

    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) return { success: false, error: "Credit Sales not found" }
    if (existingOrder.status === "CANCELLED")
      return { success: false, error: "Cannot change status of a cancelled order" }
    if (existingOrder.status === status)
      return { success: false, error: `Order is already ${status}` }

    // DRAFT → CONFIRMED: deduct stock now (was skipped at creation)
    const isConfirming = existingOrder.status === "DRAFT" && status === "CONFIRMED"

    if (isConfirming) {
      const lineLocationMap = new Map<string, string>()

      for (const line of existingOrder.lines) {
        if (existingOrder.locationId) {
          const inv = await db.inventory.findUnique({
            where: { itemId_locationId: { itemId: line.itemId, locationId: existingOrder.locationId } },
            select: { quantity: true, reservedQuantity: true },
          })
          const available = Math.max(0, (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0))
          if (available < line.quantity) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return { success: false, error: `Insufficient stock for "${item?.name}". Available: ${available}, Needed: ${line.quantity}` }
          }
          lineLocationMap.set(line.itemId, existingOrder.locationId)
        } else {
          // No specific location — search across ALL locations in this org.
          // Must include orgId filter (was missing, causing 0 results and false "Available: 0").
          // Use raw quantity column; reservedQuantity can be stale.
          const inventories = await db.inventory.findMany({
            where: {
              itemId:   line.itemId,
              orgId:    user.orgId,   // critical fix: scope to this org
              quantity: { gt: 0 },    // only locations with actual stock
            },
            select: { locationId: true, quantity: true },
            orderBy: { quantity: "desc" },
          })
          const totalAvailable = inventories.reduce((s, i) => s + i.quantity, 0)
          if (totalAvailable < line.quantity) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return { success: false, error: `Insufficient total stock for "${item?.name}". Available: ${totalAvailable}, Needed: ${line.quantity}` }
          }
          // Pick the best-stocked single location that can fulfil this line
          const best = inventories.find(i => i.quantity >= line.quantity) ?? inventories[0]
          if (!best) {
            const item = await db.item.findUnique({ where: { id: line.itemId }, select: { name: true } })
            return { success: false, error: `No stock found for "${item?.name}"` }
          }
          lineLocationMap.set(line.itemId, best.locationId)
        }
      }

      const salesOrder = await db.$transaction(async (tx) => {
        for (const line of existingOrder.lines) {
          const resolvedLocationId = lineLocationMap.get(line.itemId)
          if (!resolvedLocationId) continue
          await tx.inventory.update({
            where: { itemId_locationId: { itemId: line.itemId, locationId: resolvedLocationId } },
            data: { quantity: { decrement: line.quantity } },
          })
          await tx.item.update({
            where: { id: line.itemId },
            data: { salesCount: { increment: line.quantity }, salesTotal: { increment: line.total } },
          })
          await tx.inventoryTransaction.create({
            data: {
              itemId: line.itemId, locationId: resolvedLocationId, type: "SALE",
              quantity: -line.quantity, referenceNumber: existingOrder.orderNumber,
              notes: `Confirmed Credit Sales ${existingOrder.orderNumber}`,
              orgId: user.orgId, userId: user.id,
            },
          })
        }
        return tx.salesOrder.update({
          where: { id, orgId: user.orgId },
          data: { status: status as SalesOrderStatus },
          include: { customer: true, location: true, createdBy: { select: { id: true, name: true, email: true } }, lines: { include: { item: true } } },
        })
      })

      revalidatePath("/dashboard/sales/orders")
      revalidatePath(`/dashboard/sales/orders/${id}`)
      revalidatePath("/dashboard/inventory")
      return { success: true, data: salesOrder }
    }

    // All other status transitions — no stock change
    const salesOrder = await db.salesOrder.update({
      where: { id, orgId: user.orgId },
      data: { status: status as SalesOrderStatus },
      include: {
        customer: true, location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true } },
      },
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating order status:", error)
    return { success: false, error: "Failed to update order status" }
  }
}

export async function updatePaymentStatus(id: string, paymentStatus: string) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus))
      return { success: false, error: "Invalid payment status" }

    const salesOrder = await db.salesOrder.update({
      where: { id, orgId: user.orgId },
      data: { paymentStatus: paymentStatus as PaymentStatus },
      include: {
        customer: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true } },
      },
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: "Failed to update payment status" }
  }
}

export async function recordPayment(data: {
  orderId: string
  amount: number
  method: "CASH" | "MOMO" | "CREDIT_CARD"
  reference?: string
}) {
  try {
    const user = await getAuthenticatedUser()

    if (!data.orderId)    return { success: false, error: "Order ID is required" }
    if (data.amount <= 0) return { success: false, error: "Amount must be greater than zero" }

    // ✅ FIX: Handle manual debt FIRST – before any Credit Sales lookup
    if (data.orderId.startsWith("debt-")) {
      const debtId = data.orderId.replace("debt-", "");
      const { recordManualDebtPayment } = await import("./manual-debt");
      return await recordManualDebtPayment({ debtId, amount: data.amount, method: data.method, reference: data.reference });
    }

    // Now safe to query Credit Sales
    const order = await db.salesOrder.findUnique({
      where: { id: data.orderId, orgId: user.orgId },
      include: { payments: true },
    })

    if (!order) return { success: false, error: "Credit Sales not found" }
    if (order.status === "CANCELLED") return { success: false, error: "Cannot record payment on a cancelled order" }

    const orderTotal = (
      Number(order.subtotal     ?? 0) +
      Number(order.taxAmount    ?? 0) +
      Number(order.shippingCost ?? 0) -
      Number(order.discount     ?? 0)
    )

    const paymentsSum = order.payments
      .filter((p: any) => !(p.reference ?? "").includes("VOIDED"))
      .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
    const currentPaid = Math.max(Number(order.amountPaid ?? 0), paymentsSum)
    const remaining   = Math.max(0, orderTotal - currentPaid)

    if (remaining < 0.01) {
      return { success: false, error: "This order is already fully paid" }
    }

    if (data.amount > remaining + 0.01) {
      return { success: false, error: `Amount of GHS ${data.amount.toFixed(2)} exceeds remaining balance of GHS ${remaining.toFixed(2)}` }
    }

    // Round to avoid floating point drift
    const newAmountPaid  = Math.round((currentPaid + data.amount) * 100) / 100
    const newAmountOwing = Math.round(Math.max(0, orderTotal - newAmountPaid) * 100) / 100

    let newPaymentStatus: PaymentStatus
    if (newAmountOwing < 0.01) {
      newPaymentStatus = PaymentStatus.PAID
    } else if (newAmountPaid > 0) {
      newPaymentStatus = PaymentStatus.PARTIAL
    } else {
      newPaymentStatus = PaymentStatus.PENDING
    }

    const [payment] = await db.$transaction([
      db.salesOrderPayment.create({
        data: {
          orderId:      data.orderId,
          amount:       data.amount,
          method:       data.method,
          reference:    data.reference ?? null,
          paidAt:       new Date(),
          recordedById: user.id,
          orgId:        user.orgId,
        },
      }),
      db.salesOrder.update({
        where: { id: data.orderId, orgId: user.orgId },
        data: {
          amountPaid:    newAmountPaid,
          amountOwing:   newAmountOwing,
          paymentStatus: newPaymentStatus,
        },
      }),
    ])

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${data.orderId}`)
    revalidatePath("/dashboard")

    return { success: true, data: payment }
  } catch (error: any) {
    console.error("Error recording payment:", error)
    if (error.code === "P2003") return { success: false, error: "Invalid order reference" }
    return { success: false, error: error.message || "Failed to record payment" }
  }
}

 
export async function getCreditOrders(showPaid = false) {
  try {
    const user = await getAuthenticatedUser()
 
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId: user.orgId,
        // ← FIX 1: POS orders are always immediately PAID and are never credit.
        // Without this filter, POS orders leaked into the credit tracker
        // when showPaid=true was passed.
        source: "SALES_ORDER",
 
        // ← FIX 2: exclude drafts — they are not confirmed credit orders
        status: { notIn: ["DRAFT"] },
 
        // Payment status filter — unchanged logic
        ...(showPaid
          ? {}  // all statuses when showPaid=true
          : { paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] } }
        ),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
 
    return { success: true, data: salesOrders }
  } catch (error: any) {
    console.error("Error fetching credit orders:", error)
    return { success: false, error: "Failed to load credit orders", data: [] }
  }
}

export async function sendSalesOrderEmail(orderId: string, recipientEmail: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const order = await db.salesOrder.findUnique({
      where: { id: orderId, orgId: user.orgId },
      include: {
        customer: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true } },
      },
    })

    if (!order) return { success: false, error: "Credit Sales not found" }
    if (!order.customer) return { success: false, error: "Customer not found for this order" }

    const subtotal     = order.subtotal || 0
    const taxAmount    = order.taxAmount || 0
    const shippingCost = order.shippingCost || 0
    const discount     = order.discount || 0
    const total        = subtotal + taxAmount + shippingCost - discount

    const emailHtml = `
      <!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .line-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .line-items th, .line-items td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .totals { background: white; padding: 20px; border-radius: 8px; }
      </style></head><body>
        <div class="container">
          <div class="header">
            <h1>Credit Sales Confirmation</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          <div class="order-details">
            <h2>Order Details</h2>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment:</strong> ${order.paymentStatus}</p>
          </div>
          <div class="order-details">
            <h2>Items</h2>
            <table class="line-items">
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                ${order.lines?.map((line: any) => `
                  <tr>
                    <td>${line.item?.name || 'Unknown'}</td>
                    <td>${line.quantity}</td>
                    <td>GHS ${line.unitPrice.toFixed(2)}</td>
                    <td>GHS ${(line.quantity * line.unitPrice).toFixed(2)}</td>
                  </tr>`).join('') || ''}
              </tbody>
            </table>
          </div>
          <div class="totals">
            <p><strong>Subtotal:</strong> GHS ${subtotal.toFixed(2)}</p>
            <p><strong>Tax:</strong> GHS ${taxAmount.toFixed(2)}</p>
            <p><strong>Shipping:</strong> GHS ${shippingCost.toFixed(2)}</p>
            ${discount > 0 ? `<p><strong>Discount:</strong> -GHS ${discount.toFixed(2)}</p>` : ''}
            <p><strong>Total:</strong> GHS ${total.toFixed(2)}</p>
          </div>
        </div>
      </body></html>`

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Credit Saless <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Credit Sales Confirmation - ${order.orderNumber}`,
      html: emailHtml,
    })

    if (error) return { success: false, error: 'Failed to send email' }
    return { success: true, data: { emailId: data?.id } }
  } catch (error) {
    console.error('Error in sendSalesOrderEmail:', error)
    return { success: false, error: 'An error occurred while sending the email' }
  }
}

export async function getSalesOrderItems() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return []

    const items = await db.item.findMany({
      where: { orgId: user.orgId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        sellingPrice: true,
        tax: true,
        inventories: {
          select: {
            locationId: true,
            quantity: true,
            reservedQuantity: true,
          },
        },
      },
    })

    return items
  } catch (error) {
    console.error("getSalesOrderItems error:", error)
    return []
  }
}

export async function checkItemAvailability(itemId: string, quantity: number) {
  try {
    const user = await getAuthenticatedUser()
    
    const item = await db.item.findUnique({
      where: { id: itemId, orgId: user.orgId },
      select: { id: true, name: true, sku: true },
    })

    if (!item) return { available: false, message: "Item not found" }
    return { available: true, currentStock: 0, requestedQuantity: quantity, isLowStock: false, message: "Item available" }
  } catch (error) {
    console.error("Error checking item availability:", error)
    return { available: false, message: "Failed to check availability" }
  }
}

async function prepareSalesOrderEmailData(orderNumber: string) {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId ?? ""

  const salesOrder = await db.salesOrder.findUnique({
    where: { orderNumber, orgId },
    include: {
      customer: true,
      lines: { include: { item: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!salesOrder) throw new Error("Credit Sales not found")

  const companyInfo = {
    name: "Business Inventory",
    address: "Sunyani, USana",
    phone: "+233 5698734",
    email: "info@businessinventory.com",
  }

  const calculatedTotal =
    salesOrder.subtotal +
    salesOrder.taxAmount +
    (salesOrder.shippingCost || 0) -
    (salesOrder.discount || 0)

  const emailData: SalesOrderEmailProps = {
    salesOrder: {
      id: salesOrder.id,
      orderNumber: salesOrder.orderNumber,
      date: salesOrder.createdAt,
      customerId: salesOrder.customerId,
      customer: {
        id: salesOrder.customer?.id || '',
        name: salesOrder.customer?.name || '',
        phone: salesOrder.customer?.phone || null,
        email: salesOrder.customer?.email || null,
        address: salesOrder.customer?.address || null,
      },
      status: salesOrder.status,
      subtotal: salesOrder.subtotal,
      taxAmount: salesOrder.taxAmount,
      shippingCost: salesOrder.shippingCost || 0,
      discount: salesOrder.discount || 0,
      total: calculatedTotal,
      notes: salesOrder.notes,
      paymentTerms: salesOrder.paymentMethod || 'N/A',
      expectedDeliveryDate: null,
      createdBy: { name: salesOrder.createdBy?.name || null },
      createdAt: salesOrder.createdAt,
    },
    customer: {
      id: salesOrder.customer?.id || '',
      name: salesOrder.customer?.name || '',
      phone: salesOrder.customer?.phone || null,
      email: salesOrder.customer?.email || null,
      address: salesOrder.customer?.address || null,
    },
    lineItems: salesOrder.lines.map((line: any) => ({
      id: line.id,
      quantity: line.quantity,
      itemId: line.itemId,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate || 0,
      taxAmount: line.taxAmount || 0,
      discount: line.discount || 0,
      total: line.total,
      shippedQuantity: 0,
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
    shippingAddress: salesOrder.customer?.address || companyInfo.address,
  }

  return emailData
}

export async function sendSOToCustomer(orderNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const emailData = await prepareSalesOrderEmailData(orderNumber)

    if (!emailData.customer.email) throw new Error("Customer email address is not available")

    await resend.emails.send({
      from: "Business Inventory <noreply@rich83ventures.inventpmf.com>",
      to: emailData.customer.email ?? "",
      subject: `Credit Sales Confirmation ${emailData.salesOrder.orderNumber}`,
      react: SalesOrderEmail(emailData),
    })

    await db.salesOrder.update({
      where: { orderNumber, orgId },
      data: { status: SalesOrderStatus.CONFIRMED },
    })

    revalidatePath("/dashboard/sales/sales-orders")
    revalidatePath(`/dashboard/sales/sales-orders/${emailData.salesOrder.id}`)

    return { success: true }
  } catch (error) {
    console.error("Error sending SO to customer:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// repairPaymentStatuses
// One-time repair action to fix orders stuck as PARTIAL when they should be PAID.
// Caused by floating-point drift before the rounding fix above was applied.
// Call once from a button or API route to clean up existing stale data.
// Safe to call multiple times — it only updates orders where owing < 0.01.
// ─────────────────────────────────────────────────────────────────────────────
export async function repairPaymentStatuses() {
  try {
    const user = await getAuthenticatedUser()

    const partialOrders = await db.salesOrder.findMany({
      where: {
        orgId:         user.orgId,
        source:        "SALES_ORDER",
        status:        { notIn: ["CANCELLED", "DRAFT"] },
        paymentStatus: "PARTIAL",
      },
      include: {
        payments: {
          where: { reference: { not: { contains: "VOIDED" } } },
        },
      },
    })

    let fixed = 0
    for (const order of partialOrders) {
      const orderTotal  = Math.round((
        Number(order.subtotal     ?? 0) +
        Number(order.taxAmount    ?? 0) +
        Number(order.shippingCost ?? 0) -
        Number(order.discount     ?? 0)
      ) * 100) / 100

      const paymentsSum = Math.round(
        order.payments.reduce((s, p) => s + Number(p.amount), 0) * 100
      ) / 100

      const amountPaid  = Math.max(Number(order.amountPaid ?? 0), paymentsSum)
      const amountOwing = Math.round(Math.max(0, orderTotal - amountPaid) * 100) / 100

      if (amountOwing < 0.01) {
        await db.salesOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            amountPaid:    orderTotal,
            amountOwing:   0,
          },
        })
        fixed++
      }
    }

    revalidatePath("/dashboard/sales/orders")
    revalidatePath("/dashboard/accounting")

    return { success: true, fixed, message: `Fixed ${fixed} order(s) stuck as PARTIAL` }
  } catch (error: any) {
    console.error("repairPaymentStatuses error:", error)
    return { success: false, error: error.message }
  }
}