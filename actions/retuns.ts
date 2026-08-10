"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { PaymentStatus } from "@prisma/client"

// ─── Validation ───────────────────────────────────────────────────────────────

const createReturnSchema = z.object({
  salesOrderId: z.string().optional(),
  customerId: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
  refundMethod: z.string().optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be positive"),
        unitPrice: z.number().min(0),
        condition: z.enum(["GOOD", "DAMAGED", "DEFECTIVE"]).default("GOOD"),
        restockable: z.boolean().default(true),
        notes: z.string().optional(),
        serialNumbers: z.array(z.string()).optional(),
      })
    )
    .min(1, "At least one line item is required"),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRMANumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `RET-${year}${month}${day}-${rand}`
}

// ─── Create Return ────────────────────────────────────────────────────────────

export async function createSalesReturn(
  input: z.infer<typeof createReturnSchema>
) {
  try {
    const user = await getAuthenticatedUser()
    const validated = createReturnSchema.parse(input)

    // Verify location
    const location = await db.location.findUnique({
      where: { id: validated.locationId, orgId: user.orgId },
    })
    if (!location) return { success: false, error: "Location not found" }

    // Verify Credit Sales if provided
    if (validated.salesOrderId) {
      const so = await db.salesOrder.findUnique({
        where: { id: validated.salesOrderId, orgId: user.orgId },
      })
      if (!so) return { success: false, error: "Credit Sales not found" }
    }

    // Verify all items exist
    for (const line of validated.lines) {
      const item = await db.item.findUnique({
        where: { id: line.itemId, orgId: user.orgId },
      })
      if (!item) return { success: false, error: `Item ${line.itemId} not found` }
    }

    // Calculate refund amount
    const refundAmount = validated.lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice,
      0
    )

    const salesReturn = await db.salesReturn.create({
      data: {
        rmaNumber: generateRMANumber(),
        salesOrderId: validated.salesOrderId || null,
        customerId: validated.customerId || null,
        locationId: validated.locationId,
        status: "PENDING",
        reason: validated.reason || null,
        notes: validated.notes || null,
        refundAmount,
        refundMethod: validated.refundMethod || null,
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          create: validated.lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            condition: l.condition,
            restockable: l.restockable,
            notes: l.notes || null,
            serialNumbers: l.serialNumbers || [],
          })),
        },
      },
      include: {
        lines: { include: { item: true } },
        customer: true,
        location: true,
        salesOrder: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    revalidatePath("/dashboard/sales/returns")
    if (validated.salesOrderId) {
      revalidatePath(`/dashboard/sales/orders/${validated.salesOrderId}`)
      revalidatePath(`/dashboard/sales/orders/${validated.salesOrderId}/details`)
    }
    return { success: true, data: salesReturn }
  } catch (error: any) {
    console.error("createSalesReturn error:", error)
    return { success: false, error: error.message || "Failed to create return" }
  }
}

// ─── Get Returns List ─────────────────────────────────────────────────────────

export async function getSalesReturns(
  page = 1,
  limit = 20,
  search = "",
  status?: string
) {
  try {
    const user = await getAuthenticatedUser()
    const skip = (page - 1) * limit

    const where: any = {
      orgId: user.orgId,
      ...(search && {
        OR: [
          { rmaNumber: { contains: search, mode: "insensitive" } },
          { reason: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(status && status !== "ALL" && { status }),
    }

    const [returns, total] = await Promise.all([
      db.salesReturn.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          location: { select: { id: true, name: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
          createdBy: { select: { id: true, name: true } },
          lines: { select: { id: true, quantity: true, unitPrice: true, condition: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.salesReturn.count({ where }),
    ])

    return { success: true, data: returns, total, page, limit }
  } catch (error: any) {
    console.error("getSalesReturns error:", error)
    return { success: false, error: error.message, data: [], total: 0 }
  }
}

// ─── Get Single Return ────────────────────────────────────────────────────────

export async function getSalesReturnById(id: string) {
  try {
    const user = await getAuthenticatedUser()

    const ret = await db.salesReturn.findUnique({
      where: { id, orgId: user.orgId },
      include: {
        customer: true,
        location: true,
        salesOrder: {
          include: {
            lines: { include: { item: { select: { id: true, name: true, sku: true } } } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                thumbnail: true,
                sellingPrice: true,
                category: { select: { title: true } },
              },
            },
          },
        },
      },
    })

    if (!ret) return { success: false, error: "Return not found" }
    return { success: true, data: ret }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Approve Return ───────────────────────────────────────────────────────────

export async function approveSalesReturn(id: string) {
  try {
    const user = await getAuthenticatedUser()

    const ret = await db.salesReturn.findUnique({
      where: { id, orgId: user.orgId },
    })
    if (!ret) return { success: false, error: "Return not found" }
    if (ret.status !== "PENDING")
      return { success: false, error: "Only pending returns can be approved" }

    await db.salesReturn.update({
      where: { id },
      data: { status: "APPROVED", approvedById: user.id },
    })

    revalidatePath("/dashboard/sales/returns")
    revalidatePath(`/dashboard/sales/returns/${id}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Decline Return ───────────────────────────────────────────────────────────

export async function declineSalesReturn(id: string, reason?: string) {
  try {
    const user = await getAuthenticatedUser()

    const ret = await db.salesReturn.findUnique({
      where: { id, orgId: user.orgId },
    })
    if (!ret) return { success: false, error: "Return not found" }
    if (!["PENDING", "APPROVED"].includes(ret.status))
      return { success: false, error: "Cannot decline a return in this state" }

    await db.salesReturn.update({
      where: { id },
      data: {
        status: "DECLINED",
        notes: reason
          ? `${ret.notes ? ret.notes + "\n" : ""}Declined: ${reason}`
          : ret.notes,
      },
    })

    revalidatePath("/dashboard/sales/returns")
    revalidatePath(`/dashboard/sales/returns/${id}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Receive Return (restocks inventory + updates order + processes refund) ───
// FIX: Now also updates the linked Credit Sales's amountPaid, amountOwing,
// salesTotal on the item, and sets paymentStatus to REFUNDED if applicable.

export async function receiveSalesReturn(
  id: string,
  receivedLines: { lineId: string; receivedQty: number }[]
) {
  try {
    const user = await getAuthenticatedUser()

    const ret = await db.salesReturn.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: { include: { item: true } } },
    })
    if (!ret) return { success: false, error: "Return not found" }
    if (!["APPROVED", "RECEIVED"].includes(ret.status))
      return { success: false, error: "Return must be approved before receiving" }

    // Fetch linked order to compute refund impact
    let linkedOrder: any = null
    if (ret.salesOrderId) {
      linkedOrder = await db.salesOrder.findUnique({
        where: { id: ret.salesOrderId },
        include: { payments: true },
      })
    }

    await db.$transaction(async (tx) => {
      let totalRefundValue = 0

      for (const recv of receivedLines) {
        const line = ret.lines.find((l) => l.id === recv.lineId)
        if (!line || recv.receivedQty <= 0) continue

        const lineRefundValue = recv.receivedQty * line.unitPrice
        totalRefundValue += lineRefundValue

        // ── Restock inventory ──────────────────────────────────────────────
        if (line.restockable) {
          const existing = await tx.inventory.findFirst({
            where: {
              itemId: line.itemId,
              locationId: ret.locationId,
              orgId: user.orgId,
            },
          })

          if (existing) {
            await tx.inventory.update({
              where: { id: existing.id },
              data: { quantity: { increment: recv.receivedQty } },
            })
          } else {
            await tx.inventory.create({
              data: {
                itemId: line.itemId,
                locationId: ret.locationId,
                quantity: recv.receivedQty,
                reservedQuantity: 0,
                orgId: user.orgId,
              },
            })
          }

          // ── FIX: Reverse item-level sales counters ──────────────────────
          await tx.item.update({
            where: { id: line.itemId },
            data: {
              salesCount: { decrement: recv.receivedQty },
              salesTotal: { decrement: lineRefundValue },
            },
          })

          // Audit trail
          await tx.inventoryTransaction.create({
            data: {
              itemId: line.itemId,
              locationId: ret.locationId,
              type: "RETURN",
              quantity: recv.receivedQty,
              referenceNumber: ret.rmaNumber,
              notes: `Sales return received — ${ret.rmaNumber}${line.condition !== "GOOD" ? ` (${line.condition})` : ""}`,
              orgId: user.orgId,
              userId: user.id,
            },
          })
        }

        // Update serial numbers if tracked
        if (line.serialNumbers.length > 0) {
          await tx.serialNumber.updateMany({
            where: { serialNumber: { in: line.serialNumbers } },
            data: {
              status: line.condition === "GOOD" ? "IN_STOCK" : "DAMAGED",
              locationId: ret.locationId,
            },
          })
        }
      }

      // ── FIX: Update linked Credit Sales financials ──────────────────────
      if (linkedOrder && totalRefundValue > 0) {
        const orderTotal =
          (linkedOrder.subtotal ?? 0) +
          (linkedOrder.taxAmount ?? 0) +
          (linkedOrder.shippingCost ?? 0) -
          (linkedOrder.discount ?? 0)

        const currentPaid   = linkedOrder.amountPaid ?? linkedOrder.payments.reduce((s: number, p: any) => s + p.amount, 0)
        // Refund reduces what was paid
        const newAmountPaid  = Math.max(0, currentPaid - totalRefundValue)
        // The returned items are no longer part of what's owed — shrink the
        // order's effective total by the refunded value before comparing
        // against what's been paid. Without this, a fully-refunded order
        // (amountPaid -> 0) looks like it still owes its full original total.
        const effectiveTotal = Math.max(0, orderTotal - totalRefundValue)
        const newAmountOwing = Math.max(0, effectiveTotal - newAmountPaid)

        // Determine new payment status after refund — compare against the
        // shrunk effective total, not the pre-refund total, so a fully-paid
        // partial refund reads as PAID rather than incorrectly PARTIAL.
        let newPaymentStatus: PaymentStatus
        if (newAmountPaid <= 0) {
          newPaymentStatus = PaymentStatus.REFUNDED
        } else if (newAmountPaid < effectiveTotal) {
          newPaymentStatus = PaymentStatus.PARTIAL
        } else {
          newPaymentStatus = PaymentStatus.PAID
        }

        await tx.salesOrder.update({
          where: { id: ret.salesOrderId! },
          data: {
            amountPaid:    newAmountPaid,
            amountOwing:   newAmountOwing,
            paymentStatus: newPaymentStatus,
            // Append a note about the refund
            notes: linkedOrder.notes
              ? `${linkedOrder.notes}\nRefund processed: GHS ${totalRefundValue.toFixed(2)} via ${ret.rmaNumber}`
              : `Refund processed: GHS ${totalRefundValue.toFixed(2)} via ${ret.rmaNumber}`,
          },
        })

        // Record a negative payment entry so the ledger shows the refund
        await tx.salesOrderPayment.create({
          data: {
            orderId:      ret.salesOrderId!,
            amount:       -totalRefundValue, // negative = money going out
            method:       (ret.refundMethod ?? "CASH") as any,
            reference:    `REFUND — ${ret.rmaNumber}`,
            paidAt:       new Date(),
            recordedById: user.id,
            orgId:        user.orgId,
          },
        })
      }

      // Mark return as COMPLETED
      await tx.salesReturn.update({
        where: { id },
        data: {
          status:     "COMPLETED",
          receivedAt: new Date(),
        },
      })

      // Update linked Credit Sales status
      if (ret.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: ret.salesOrderId },
          data: { status: "RETURNED" },
        })
      }
    })

    revalidatePath("/dashboard/sales/returns")
    revalidatePath(`/dashboard/sales/returns/${id}`)
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard/reports/stock-movement")
    if (ret.salesOrderId) {
      revalidatePath(`/dashboard/sales/orders/${ret.salesOrderId}`)
      revalidatePath(`/dashboard/sales/orders/${ret.salesOrderId}/details`)
    }
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("receiveSalesReturn error:", error)
    return { success: false, error: error.message }
  }
}

// ─── Quick Return from Order (one-step approve + receive) ────────────────────
// Called from the "Return" button on the order detail / receipt page.
// Creates, auto-approves, and receives the return in one action so staff
// don't need to navigate to the returns module.

export async function quickReturnFromOrder(data: {
  salesOrderId: string
  locationId: string
  customerId?: string
  reason?: string
  refundMethod?: string
  lines: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    condition?: "GOOD" | "DAMAGED" | "DEFECTIVE"
    restockable?: boolean
  }>
}) {
  try {
    const user = await getAuthenticatedUser()

    // Validate order exists and belongs to this org
    const order = await db.salesOrder.findUnique({
      where: { id: data.salesOrderId, orgId: user.orgId },
      include: { payments: true },
    })
    if (!order) return { success: false, error: "Credit Sales not found" }
    if (order.status === "CANCELLED") return { success: false, error: "Cannot return a cancelled order" }

    const refundAmount = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)

    const result = await db.$transaction(async (tx) => {
      // 1. Create return record (auto COMPLETED)
      const salesReturn = await tx.salesReturn.create({
        data: {
          rmaNumber:    generateRMANumber(),
          salesOrderId: data.salesOrderId,
          customerId:   data.customerId || order.customerId,
          locationId:   data.locationId,
          status:       "COMPLETED",
          reason:       data.reason || "Customer return",
          refundAmount,
          refundMethod: data.refundMethod || null,
          receivedAt:   new Date(),
          orgId:        user.orgId,
          createdById:  user.id,
          approvedById: user.id,
          lines: {
            create: data.lines.map((l) => ({
              itemId:      l.itemId,
              quantity:    l.quantity,
              unitPrice:   l.unitPrice,
              condition:   l.condition ?? "GOOD",
              restockable: l.restockable ?? true,
            })),
          },
        },
        include: { lines: { include: { item: true } } },
      })

      // 2. Restock items + reverse sales counters
      let totalRefundValue = 0
      for (const line of salesReturn.lines) {
        const lineRefundValue = line.quantity * line.unitPrice
        totalRefundValue += lineRefundValue

        if (line.restockable) {
          const existing = await tx.inventory.findFirst({
            where: { itemId: line.itemId, locationId: data.locationId, orgId: user.orgId },
          })
          if (existing) {
            await tx.inventory.update({
              where: { id: existing.id },
              data: { quantity: { increment: line.quantity } },
            })
          } else {
            await tx.inventory.create({
              data: {
                itemId: line.itemId,
                locationId: data.locationId,
                quantity: line.quantity,
                reservedQuantity: 0,
                orgId: user.orgId,
              },
            })
          }

          await tx.item.update({
            where: { id: line.itemId },
            data: {
              salesCount: { decrement: line.quantity },
              salesTotal: { decrement: lineRefundValue },
            },
          })

          await tx.inventoryTransaction.create({
            data: {
              itemId:          line.itemId,
              locationId:      data.locationId,
              type:            "RETURN",
              quantity:        line.quantity,
              referenceNumber: salesReturn.rmaNumber,
              notes:           `Quick return from order — ${salesReturn.rmaNumber}`,
              orgId:           user.orgId,
              userId:          user.id,
            },
          })
        }
      }

      // 3. Update order financials & payment status
      const orderTotal =
        (order.subtotal ?? 0) +
        (order.taxAmount ?? 0) +
        (order.shippingCost ?? 0) -
        (order.discount ?? 0)

      const currentPaid   = order.amountPaid ?? order.payments.reduce((s: number, p: any) => s + p.amount, 0)
      const newAmountPaid  = Math.max(0, currentPaid - totalRefundValue)
      // Same fix as receiveSalesReturn: shrink the order's effective total
      // by the refunded value before comparing against what's been paid, so
      // a fully-refunded order doesn't come out looking like it's still owed.
      const effectiveTotal = Math.max(0, orderTotal - totalRefundValue)
      const newAmountOwing = Math.max(0, effectiveTotal - newAmountPaid)

      let newPaymentStatus: PaymentStatus
      if (newAmountPaid <= 0) {
        newPaymentStatus = PaymentStatus.REFUNDED
      } else if (newAmountPaid < effectiveTotal) {
        newPaymentStatus = PaymentStatus.PARTIAL
      } else {
        newPaymentStatus = PaymentStatus.PAID
      }

      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: {
          status:        "RETURNED",
          amountPaid:    newAmountPaid,
          amountOwing:   newAmountOwing,
          paymentStatus: newPaymentStatus,
          notes: order.notes
            ? `${order.notes}\nRefund processed: GHS ${totalRefundValue.toFixed(2)} via ${salesReturn.rmaNumber}`
            : `Refund processed: GHS ${totalRefundValue.toFixed(2)} via ${salesReturn.rmaNumber}`,
        },
      })

      // 4. Record negative payment entry (refund in ledger)
      await tx.salesOrderPayment.create({
        data: {
          orderId:      data.salesOrderId,
          amount:       -totalRefundValue,
          method:       (data.refundMethod ?? "CASH") as any,
          reference:    `REFUND — ${salesReturn.rmaNumber}`,
          paidAt:       new Date(),
          recordedById: user.id,
          orgId:        user.orgId,
        },
      })

      return { salesReturn, refundAmount: totalRefundValue }
    })

    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${data.salesOrderId}`)
    revalidatePath(`/dashboard/sales/orders/${data.salesOrderId}/details`)
    revalidatePath("/dashboard/sales/returns")
    revalidatePath("/dashboard/inventory")
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard")

    return { success: true, data: result }
  } catch (error: any) {
    console.error("quickReturnFromOrder error:", error)
    return { success: false, error: error.message || "Failed to process return" }
  }
}

// ─── Cancel Return ────────────────────────────────────────────────────────────

export async function cancelSalesReturn(id: string) {
  try {
    const user = await getAuthenticatedUser()

    const ret = await db.salesReturn.findUnique({
      where: { id, orgId: user.orgId },
    })
    if (!ret) return { success: false, error: "Return not found" }
    if (["COMPLETED", "CANCELLED"].includes(ret.status))
      return { success: false, error: "Cannot cancel a completed or already cancelled return" }

    await db.salesReturn.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/dashboard/sales/returns")
    revalidatePath(`/dashboard/sales/returns/${id}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Get Returns Summary Stats ────────────────────────────────────────────────

export async function getReturnsSummaryStats(dateRange = "30d") {
  try {
    const user = await getAuthenticatedUser()

    const now = new Date()
    let startDate = new Date()
    switch (dateRange) {
      case "7d":  startDate.setDate(now.getDate() - 7); break
      case "30d": startDate.setDate(now.getDate() - 30); break
      case "90d": startDate.setDate(now.getDate() - 90); break
      default:    startDate.setDate(now.getDate() - 30)
    }

    const [all, byStatus, recentReturns] = await Promise.all([
      db.salesReturn.findMany({
        where: { orgId: user.orgId, createdAt: { gte: startDate } },
        select: { status: true, refundAmount: true },
      }),
      db.salesReturn.groupBy({
        by: ["status"],
        where: { orgId: user.orgId, createdAt: { gte: startDate } },
        _count: { id: true },
        _sum: { refundAmount: true },
      }),
      db.salesReturn.findMany({
        where: { orgId: user.orgId },
        include: {
          customer: { select: { name: true } },
          lines: { select: { quantity: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

    const totalReturns      = all.length
    const totalRefundValue  = all.reduce((s, r) => s + r.refundAmount, 0)
    const completedCount    = all.filter((r) => r.status === "COMPLETED").length
    const pendingCount      = all.filter((r) => r.status === "PENDING").length

    return {
      success: true,
      data: {
        totalReturns,
        totalRefundValue,
        completedCount,
        pendingCount,
        byStatus,
        recentReturns,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Get Credit Saless for Return creation ────────────────────────────────────

export async function getEligibleSalesOrders() {
  try {
    const user = await getAuthenticatedUser()

    const orders = await db.salesOrder.findMany({
      where: {
        orgId: user.orgId,
        status: { in: ["COMPLETED", "DELIVERED", "SHIPPED"] },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, name: true, sku: true, thumbnail: true, sellingPrice: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return { success: true, data: orders }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getEligibleCreditOrders() {
  try {
    const user = await getAuthenticatedUser()

    const orders = await db.salesOrder.findMany({
      where: {
        orgId: user.orgId,
        status: { notIn: ["CANCELLED", "RETURNED"] },
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        deliveryDate: true,
        amountPaid: true,
        amountOwing: true,
        paymentStatus: true,
        customer: { select: { id: true, name: true, phone: true } },
        location:  { select: { id: true, name: true } },
        lines: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, thumbnail: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: orders }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}