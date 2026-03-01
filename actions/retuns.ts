"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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

    // Verify sales order if provided
    if (validated.salesOrderId) {
      const so = await db.salesOrder.findUnique({
        where: { id: validated.salesOrderId, orgId: user.orgId },
      })
      if (!so) return { success: false, error: "Sales order not found" }
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

// ─── Receive Return (restocks inventory) ─────────────────────────────────────

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
    if (ret.status !== "APPROVED")
      return { success: false, error: "Return must be approved before receiving" }

    await db.$transaction(async (tx) => {
      for (const recv of receivedLines) {
        const line = ret.lines.find((l) => l.id === recv.lineId)
        if (!line || recv.receivedQty <= 0) continue

        // Only restock restockable items
        if (line.restockable) {
          // Upsert inventory
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

          // Record stock movement transaction
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

      // Mark return as RECEIVED → COMPLETED
      await tx.salesReturn.update({
        where: { id },
        data: {
          status: "COMPLETED",
          receivedAt: new Date(),
        },
      })

      // Update linked sales order status if present
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
    revalidatePath("/dashboard/reports/stock-movement")
    return { success: true }
  } catch (error: any) {
    console.error("receiveSalesReturn error:", error)
    return { success: false, error: error.message }
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

    const totalReturns = all.length
    const totalRefundValue = all.reduce((s, r) => s + r.refundAmount, 0)
    const completedCount = all.filter((r) => r.status === "COMPLETED").length
    const pendingCount = all.filter((r) => r.status === "PENDING").length

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

// ─── Get Sales Orders for Return creation (only completed/delivered) ──────────

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