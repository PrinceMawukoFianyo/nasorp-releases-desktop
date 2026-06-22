"use server";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

export async function checkNegativeMarginItems() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  // 1. Items where costPrice > sellingPrice
  const badItems = await db.item.findMany({
    where: {
      orgId,
      costPrice: { gt: 0 },
      sellingPrice: { gt: 0 },
      // costPrice > sellingPrice
    },
    select: {
      id: true,
      name: true,
      sku: true,
      costPrice: true,
      sellingPrice: true,
    },
  });
  const withNegativeMargin = badItems.filter(i => i.costPrice > i.sellingPrice);

  // 2. For the last 30 days, compute actual revenue & COGS per item
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesOrders = await db.salesOrder.findMany({
    where: {
      orgId,
      createdAt: { gte: thirtyDaysAgo },
      status: { not: "CANCELLED" },
    },
    include: {
      lines: {
        include: {
          item: { select: { costPrice: true, name: true, sku: true } },
        },
      },
    },
  });

  const itemStats: Record<string, { revenue: number; cogs: number; qty: number; name: string; sku: string }> = {};

  for (const order of salesOrders) {
    for (const line of order.lines) {
      const key = line.itemId;
      if (!itemStats[key]) {
        itemStats[key] = {
          revenue: 0,
          cogs: 0,
          qty: 0,
          name: line.item?.name || "Unknown",
          sku: line.item?.sku || "",
        };
      }
      const revenue = line.quantity * line.unitPrice * (1 + (line.taxRate || 0) / 100);
      const cogs = line.quantity * (line.item?.costPrice || 0);
      itemStats[key].revenue += revenue;
      itemStats[key].cogs += cogs;
      itemStats[key].qty += line.quantity;
    }
  }

  // Convert to array sorted by profit
  const result = Object.entries(itemStats)
    .map(([itemId, stats]) => ({
      itemId,
      ...stats,
      profit: stats.revenue - stats.cogs,
      margin: stats.revenue > 0 ? ((stats.revenue - stats.cogs) / stats.revenue) * 100 : 0,
    }))
    .sort((a, b) => a.profit - b.profit); // most negative first

  return {
    badItems: withNegativeMargin.map(i => ({
      name: i.name,
      sku: i.sku,
      costPrice: i.costPrice,
      sellingPrice: i.sellingPrice,
      diff: i.costPrice - i.sellingPrice,
    })),
    worstPerformers: result.slice(0, 10), // top 10 worst
    summary: {
      totalItems: withNegativeMargin.length,
      totalRevenue30d: result.reduce((s, r) => s + r.revenue, 0),
      totalCOGS30d: result.reduce((s, r) => s + r.cogs, 0),
    },
  };
}