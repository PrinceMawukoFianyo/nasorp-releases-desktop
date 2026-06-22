"use server";

import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { format, addDays, subDays, startOfDay, endOfDay } from "date-fns";

export async function getPurchaseOverviewData() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      console.log("No orgId found")
      return {
        totals: { totalInvoiced: 0, totalPaid: 0, totalOwing: 0 },
        aging: [],
        upcomingPayments: [],
        recentPayments: [],
        topCreditors: [],
      }
    }

    // Get ALL purchase orders (except cancelled and draft) – include all that have any activity
    const pos = await db.purchaseOrder.findMany({
      where: {
        orgId: user.orgId,
        status: { notIn: ["CANCELLED", "DRAFT"] }, // includes SUBMITTED, PARTIALLY_RECEIVED, RECEIVED, COMPLETED
      },
      include: {
        supplier: true,
        payments: true,
        goodsReceipts: true,
      },
    })

    console.log(`Found ${pos.length} POs for overview`)

    let totalInvoiced = 0
    let totalPaid = 0

    for (const po of pos) {
      const poTotal = Number(po.subtotal) + Number(po.taxAmount) + (Number(po.shippingCost) || 0)
      totalInvoiced += poTotal
      
      // Sum payments directly from the payments array
      const paidSum = po.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      totalPaid += paidSum
    }

    const totalOwing = totalInvoiced - totalPaid

    console.log(`Totals: invoiced=${totalInvoiced}, paid=${totalPaid}, owing=${totalOwing}`)

    // Aging analysis (only for POs with outstanding balance)
    const now = new Date()
    const agingBuckets = [
      { bucket: "0-30 days", amount: 0 },
      { bucket: "31-60 days", amount: 0 },
      { bucket: "61-90 days", amount: 0 },
      { bucket: "90+ days", amount: 0 },
    ]

    for (const po of pos) {
      const owing = Number(po.amountOwing) || 0
      if (owing <= 0.01) continue
      
      const dueDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : po.date
      const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 30) agingBuckets[0].amount += owing
      else if (daysDiff <= 60) agingBuckets[1].amount += owing
      else if (daysDiff <= 90) agingBuckets[2].amount += owing
      else agingBuckets[3].amount += owing
    }

    // Upcoming payments (next 7 days)
    const upcoming = []
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(now.getDate() + 7)
    for (const po of pos) {
      const dueDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null
      if (dueDate && dueDate >= now && dueDate <= sevenDaysLater && Number(po.amountOwing) > 0) {
        upcoming.push({
          poNumber: po.poNumber,
          supplierName: po.supplier?.name || "Unknown",
          amountOwing: Number(po.amountOwing),
          dueDate: dueDate,
        })
      }
    }

    // Recent payments (last 30 days)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const recentPayments = []
    for (const po of pos) {
      for (const p of po.payments) {
        if (p.paidAt >= thirtyDaysAgo) {
          recentPayments.push({
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || "Unknown",
            amount: Number(p.amount),
            paidAt: p.paidAt,
          })
        }
      }
    }
    recentPayments.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())

    // Top creditors (suppliers with outstanding balance)
    const creditorsMap = new Map()
    for (const po of pos) {
      const owing = Number(po.amountOwing)
      if (owing <= 0) continue
      const supplierId = po.supplierId
      if (!creditorsMap.has(supplierId)) {
        creditorsMap.set(supplierId, {
          supplierId,
          name: po.supplier?.name || "Unknown",
          totalOwing: 0,
          orderCount: 0,
        })
      }
      const entry = creditorsMap.get(supplierId)
      entry.totalOwing += owing
      entry.orderCount += 1
    }
    const topCreditors = Array.from(creditorsMap.values())
      .sort((a, b) => b.totalOwing - a.totalOwing)
      .slice(0, 5)

    return {
      totals: { totalInvoiced, totalPaid, totalOwing },
      aging: agingBuckets.filter(b => b.amount > 0),
      upcomingPayments: upcoming,
      recentPayments: recentPayments.slice(0, 5),
      topCreditors,
    }
  } catch (error) {
    console.error("getPurchaseOverviewData error:", error)
    return {
      totals: { totalInvoiced: 0, totalPaid: 0, totalOwing: 0 },
      aging: [],
      upcomingPayments: [],
      recentPayments: [],
      topCreditors: [],
    }
  }
}