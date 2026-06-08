"use server";

import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { format, addDays, subDays, startOfDay, endOfDay } from "date-fns";

export async function getPurchaseOverviewData() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  const now = new Date();

  // 1. Payables (from supplier-payables logic, but we'll fetch directly for consistency)
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: {
      orgId,
      status: { in: ["RECEIVED", "PARTIALLY_RECEIVED", "COMPLETED", "SUBMITTED"] },
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true } },
      payments: true,
    },
  });

  // Compute totals and aging
  let totalInvoiced = 0, totalPaid = 0, totalOwing = 0;
  const aging: { bucket: string; amount: number }[] = [
    { bucket: "0-30 days", amount: 0 },
    { bucket: "31-60 days", amount: 0 },
    { bucket: "61-90 days", amount: 0 },
    { bucket: "90+ days", amount: 0 },
  ];

  for (const po of purchaseOrders) {
    const poTotal = po.subtotal + po.taxAmount + (po.shippingCost || 0) - (po.discount || 0);
    const paid = po.payments.reduce((s, p) => s + p.amount, 0);
    const owing = Math.max(0, poTotal - paid);
    totalInvoiced += poTotal;
    totalPaid += paid;
    totalOwing += owing;

    // Aging based on expectedDeliveryDate or createdAt
    const dueDate = po.expectedDeliveryDate || po.createdAt;
    const daysDiff = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 3600 * 24));
    if (daysDiff <= 30) aging[0].amount += owing;
    else if (daysDiff <= 60) aging[1].amount += owing;
    else if (daysDiff <= 90) aging[2].amount += owing;
    else aging[3].amount += owing;
  }

  // 2. Upcoming payments (due in next 7 days)
  const upcomingCutoff = addDays(now, 7);
  const upcomingPOs = await db.purchaseOrder.findMany({
    where: {
      orgId,
      status: { not: "CANCELLED" },
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      expectedDeliveryDate: { gte: now, lte: upcomingCutoff },
    },
    include: {
      supplier: { select: { name: true } },
      payments: true, // Include payments
    },
  });

  const upcomingPayments = upcomingPOs.map(po => {
    const total = po.subtotal + po.taxAmount + (po.shippingCost || 0) - (po.discount || 0);
    const paid = po.payments.reduce((s, p) => s + p.amount, 0);
    const owing = Math.max(0, total - paid);
    return {
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || "Unknown",
      dueDate: po.expectedDeliveryDate,
      amountOwing: owing,
    };
  });

  // 3. Recent payments (last 5)
  const recentPayments = await db.supplierPayment.findMany({
    where: { orgId },
    orderBy: { paidAt: "desc" },
    take: 5,
    include: {
      purchaseOrder: { select: { poNumber: true, supplier: { select: { name: true } } } },
      recordedBy: { select: { name: true } },
    },
  });

  const recentPaymentsList = recentPayments.map(p => ({
    poNumber: p.purchaseOrder.poNumber,
    supplierName: p.purchaseOrder.supplier?.name || "Unknown",
    amount: p.amount,
    method: p.method,
    paidAt: p.paidAt,
    recordedBy: p.recordedBy?.name || "System",
  }));

  // 4. Supplier performance (top creditors)
  const creditors = await db.supplier.findMany({
    where: { orgId },
    include: {
      purchaseOrders: {
        where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
        include: { payments: true },
      },
    },
  });

  const creditorPerformance = creditors.map(supp => {
    let totalOwing = 0;
    for (const po of supp.purchaseOrders) {
      const poTotal = po.subtotal + po.taxAmount + (po.shippingCost || 0) - (po.discount || 0);
      const paid = po.payments.reduce((s, p) => s + p.amount, 0);
      totalOwing += Math.max(0, poTotal - paid);
    }
    return {
      id: supp.id,
      name: supp.name,
      totalOwing,
      orderCount: supp.purchaseOrders.length,
    };
  }).filter(c => c.totalOwing > 0).sort((a, b) => b.totalOwing - a.totalOwing).slice(0, 5);

  return {
    totals: { totalInvoiced, totalPaid, totalOwing },
    aging,
    upcomingPayments,
    recentPayments: recentPaymentsList,
    topCreditors: creditorPerformance,
  };
}