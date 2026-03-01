// ============================================
// FILE: actions/sales-reports.ts
// ============================================
"use server";

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalDiscount: number;
  netRevenue: number;
}

export interface SalesByCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderDate: string;
}

export interface SalesByItem {
  itemId: string;
  itemName: string;
  sku: string;
  category?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  totalOrders: number;
}

export interface SalesTimeline {
  date: string;
  orders: number;
  revenue: number;
}

export interface TopPerformer {
  name: string;
  value: number;
  percentage: number;
}

// ── Wholesale-specific types ──────────────────────────────────────────────────

export interface WholesaleSaleDetail {
  orderId:              string;
  orderNumber:          string;
  orderDate:            string;
  locationName:         string;
  customerName:         string;
  itemId:               string;
  itemName:             string;
  sku:                  string;
  tierName:             string;          // "Box", "Half Sack" etc.
  packQuantity:         number;          // how many packs
  unitsPerPack:         number;          // units per pack
  totalUnits:           number;          // total units deducted
  pricePerPack:         number;          // GHS per pack
  pricePerUnit:         number;          // GHS per unit inside pack
  singleUnitPrice:      number;          // normal retail price per unit
  savingsPerUnit:       number;          // discount vs single
  totalSavings:         number;          // savingsPerUnit × totalUnits
  lineTotal:            number;
}

export interface SingleSaleDetail {
  orderId:      string;
  orderNumber:  string;
  orderDate:    string;
  locationName: string;
  customerName: string;
  itemId:       string;
  itemName:     string;
  sku:          string;
  quantity:     number;
  unitPrice:    number;
  lineTotal:    number;
}

export interface WholesaleVsSingleSummary {
  // Totals
  totalRevenue:         number;
  singleRevenue:        number;
  wholesaleRevenue:     number;
  singleRevenuePercent: number;
  wholesaleRevenuePercent: number;

  // Units
  totalUnitsSold:       number;
  singleUnitsSold:      number;
  wholesaleUnitsSold:   number;

  // Orders
  totalOrders:          number;
  singleOrders:         number;          // orders with at least one single line
  wholesaleOrders:      number;          // orders with at least one wholesale line

  // Savings customers got
  totalSavingsGiven:    number;

  // Pack type breakdown
  packBreakdown: {
    tierName:     string;
    packsSold:    number;
    unitsSold:    number;
    revenue:      number;
    percentage:   number;
  }[];

  // Top wholesale items
  topWholesaleItems: {
    itemName: string;
    sku:      string;
    revenue:  number;
    unitsSold: number;
  }[];
}

export interface SalesReportData {
  summary: SalesSummary;
  salesByCustomer: SalesByCustomer[];
  salesByItem: SalesByItem[];
  timeline: SalesTimeline[];
  topCustomers: TopPerformer[];
  topItems: TopPerformer[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    date: string;
    total: number;
    status: string;
    itemCount: number;
  }>;
  // NEW: wholesale vs single breakdown
  wholesaleVsSingle: WholesaleVsSingleSummary;
  wholesaleDetails:  WholesaleSaleDetail[];
  singleDetails:     SingleSaleDetail[];
}

// ============================================
// MAIN SALES REPORT FUNCTION
// ============================================

export async function getSalesReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<SalesReportData> {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  const startDate = fromDate || startOfDay(subDays(new Date(), days));
  const endDate   = toDate   || endOfDay(new Date());

  const salesOrders = await db.salesOrder.findMany({
    where: {
      orgId,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    },
    include: {
      customer: true,
      location: { select: { id: true, name: true } },
      lines: {
        include: {
          item: {
            include: { category: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  const totalRevenue = salesOrders.reduce(
    (sum, o) =>
      sum + (o.subtotal || 0) + (o.taxAmount || 0) + (o.shippingCost || 0) - (o.discount || 0),
    0
  );
  const totalTax      = salesOrders.reduce((s, o) => s + (o.taxAmount  || 0), 0);
  const totalDiscount = salesOrders.reduce((s, o) => s + (o.discount   || 0), 0);
  const totalOrders   = salesOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const summary: SalesSummary = {
    totalSales: totalOrders,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalTax,
    totalDiscount,
    netRevenue: totalRevenue - totalTax,
  };

  // ── Sales by customer ─────────────────────────────────────────────────────

  const customerMap = new Map<string, {
    customerName: string; customerEmail: string;
    totalOrders: number; totalQuantity: number; totalRevenue: number; lastOrderDate: Date;
  }>();

  salesOrders.forEach((order) => {
    const cid = order.customerId ?? "";
    const orderTotal =
      (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0);
    const orderQty = order.lines.reduce((s: number, l: any) => s + l.quantity, 0);
    const cur = customerMap.get(cid) || {
      customerName: order.customer?.name || "Unknown",
      customerEmail: order.customer?.email || "",
      totalOrders: 0, totalQuantity: 0, totalRevenue: 0, lastOrderDate: order.createdAt,
    };
    cur.totalOrders   += 1;
    cur.totalQuantity += orderQty;
    cur.totalRevenue  += orderTotal;
    if (order.createdAt > cur.lastOrderDate) cur.lastOrderDate = order.createdAt;
    customerMap.set(cid, cur);
  });

  const salesByCustomer: SalesByCustomer[] = Array.from(customerMap.entries())
    .map(([customerId, d]) => ({
      customerId,
      customerName:     d.customerName,
      customerEmail:    d.customerEmail,
      totalOrders:      d.totalOrders,
      totalQuantity:    d.totalQuantity,
      totalRevenue:     d.totalRevenue,
      averageOrderValue: d.totalRevenue / d.totalOrders,
      lastOrderDate:    format(d.lastOrderDate, "MMM dd, yyyy"),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // ── Sales by item ─────────────────────────────────────────────────────────

  const itemMap = new Map<string, {
    itemName: string; sku: string; category?: string;
    totalQuantity: number; totalRevenue: number; totalOrders: number;
    priceSum: number; priceCount: number;
  }>();

  salesOrders.forEach((order) => {
    order.lines.forEach((line: any) => {
      const cur = itemMap.get(line.itemId) || {
        itemName: line.item?.name || "Unknown", sku: line.item?.sku || "",
        category: line.item?.category?.name,
        totalQuantity: 0, totalRevenue: 0, totalOrders: 0, priceSum: 0, priceCount: 0,
      };
      cur.totalQuantity += line.quantity;
      cur.totalRevenue  += line.quantity * line.unitPrice * (1 + (line.taxRate || 0) / 100);
      cur.totalOrders   += 1;
      cur.priceSum      += line.unitPrice;
      cur.priceCount    += 1;
      itemMap.set(line.itemId, cur);
    });
  });

  const salesByItem: SalesByItem[] = Array.from(itemMap.entries())
    .map(([itemId, d]) => ({
      itemId, itemName: d.itemName, sku: d.sku, category: d.category,
      totalQuantitySold: d.totalQuantity, totalRevenue: d.totalRevenue,
      averagePrice: d.priceSum / d.priceCount, totalOrders: d.totalOrders,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // ── Timeline ──────────────────────────────────────────────────────────────

  const timelineMap = new Map<string, { orders: number; revenue: number }>();
  salesOrders.forEach((order) => {
    const key = format(order.createdAt, "MMM dd");
    const orderTotal =
      (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0);
    const cur = timelineMap.get(key) || { orders: 0, revenue: 0 };
    cur.orders  += 1;
    cur.revenue += orderTotal;
    timelineMap.set(key, cur);
  });

  const timeline: SalesTimeline[] = Array.from(timelineMap.entries())
    .map(([date, d]) => ({ date, orders: d.orders, revenue: d.revenue }))
    .sort((a, b) => new Date(a.date + " 2024").getTime() - new Date(b.date + " 2024").getTime());

  // ── Top performers ────────────────────────────────────────────────────────

  const topCustomers: TopPerformer[] = salesByCustomer.slice(0, 5).map((c) => ({
    name: c.customerName, value: c.totalRevenue,
    percentage: totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0,
  }));
  const topItems: TopPerformer[] = salesByItem.slice(0, 5).map((i) => ({
    name: i.itemName, value: i.totalRevenue,
    percentage: totalRevenue > 0 ? (i.totalRevenue / totalRevenue) * 100 : 0,
  }));

  // ── Recent orders ─────────────────────────────────────────────────────────

  const recentOrders = salesOrders.slice(0, 10).map((order) => ({
    id:           order.id,
    orderNumber:  order.orderNumber || "N/A",
    customerName: order.customer?.name || "Unknown",
    date:         format(order.createdAt, "MMM dd, yyyy"),
    total: (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0),
    status:    order.status,
    itemCount: order.lines.length,
  }));

  // ── Wholesale vs Single breakdown ─────────────────────────────────────────
  //
  // We detect wholesale lines by checking whether line.notes contains a JSON
  // payload with a tierId field (the same convention used everywhere else).

  const wholesaleDetails: WholesaleSaleDetail[] = [];
  const singleDetails:    SingleSaleDetail[]     = [];

  // Sets of orderIds that have at least one wholesale / single line
  const wholesaleOrderIds = new Set<string>();
  const singleOrderIds    = new Set<string>();

  for (const order of salesOrders) {
    for (const line of order.lines as any[]) {
      let tierName:             string | null = null;
      let tierId:               string | null = null;
      let packQty               = 1;
      let unitsPerPack          = 1;
      let wholesalePricePerPack = line.unitPrice as number;

      try {
        if (line.notes) {
          const meta = JSON.parse(line.notes as string);
          tierName              = meta.tierName              ?? null;
          tierId                = meta.tierId                ?? null;
          packQty               = meta.packQty               ?? 1;
          unitsPerPack          = meta.unitsPerPack          ?? 1;
          wholesalePricePerPack = meta.wholesalePricePerPack ?? line.unitPrice;
        }
      } catch { /* plain-text notes */ }

      const isWholesale  = !!tierId;
      const singlePrice  = (line.item?.sellingPrice as number) || 0;

      if (isWholesale && tierName) {
        const pricePerUnit  = wholesalePricePerPack / unitsPerPack;
        const savingsPerUnit = Math.max(0, singlePrice - pricePerUnit);
        wholesaleOrderIds.add(order.id);
        wholesaleDetails.push({
          orderId:         order.id,
          orderNumber:     (order as any).orderNumber || order.id,
          orderDate:       format(order.createdAt, "MMM dd, yyyy"),
          locationName:    (order as any).location?.name || "N/A",
          customerName:    order.customer?.name || "Walk-in",
          itemId:          line.itemId,
          itemName:        line.item?.name || "Unknown",
          sku:             line.item?.sku  || "",
          tierName,
          packQuantity:    packQty,
          unitsPerPack,
          totalUnits:      line.quantity,
          pricePerPack:    wholesalePricePerPack,
          pricePerUnit,
          singleUnitPrice: singlePrice,
          savingsPerUnit,
          totalSavings:    savingsPerUnit * line.quantity,
          lineTotal:       line.total || line.quantity * line.unitPrice,
        });
      } else {
        singleOrderIds.add(order.id);
        singleDetails.push({
          orderId:      order.id,
          orderNumber:  (order as any).orderNumber || order.id,
          orderDate:    format(order.createdAt, "MMM dd, yyyy"),
          locationName: (order as any).location?.name || "N/A",
          customerName: order.customer?.name || "Walk-in",
          itemId:       line.itemId,
          itemName:     line.item?.name || "Unknown",
          sku:          line.item?.sku  || "",
          quantity:     line.quantity,
          unitPrice:    line.unitPrice,
          lineTotal:    line.total || line.quantity * line.unitPrice,
        });
      }
    }
  }

  const wholesaleRevenue = wholesaleDetails.reduce((s, l) => s + l.lineTotal, 0);
  const singleRevenue    = singleDetails.reduce((s, l) => s + l.lineTotal, 0);
  const grandTotal       = wholesaleRevenue + singleRevenue;

  const wholesaleUnitsSold = wholesaleDetails.reduce((s, l) => s + l.totalUnits, 0);
  const singleUnitsSold    = singleDetails.reduce((s, l) => s + l.quantity, 0);
  const totalUnitsSold     = wholesaleUnitsSold + singleUnitsSold;

  const totalSavingsGiven  = wholesaleDetails.reduce((s, l) => s + l.totalSavings, 0);

  // Pack type breakdown
  const packMap = new Map<string, { packsSold: number; unitsSold: number; revenue: number }>();
  for (const l of wholesaleDetails) {
    const cur = packMap.get(l.tierName) || { packsSold: 0, unitsSold: 0, revenue: 0 };
    cur.packsSold += l.packQuantity;
    cur.unitsSold += l.totalUnits;
    cur.revenue   += l.lineTotal;
    packMap.set(l.tierName, cur);
  }
  const packBreakdown = Array.from(packMap.entries()).map(([tierName, v]) => ({
    tierName, ...v,
    percentage: wholesaleRevenue > 0 ? (v.revenue / wholesaleRevenue) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Top wholesale items
  const wItemMap = new Map<string, { itemName: string; sku: string; revenue: number; unitsSold: number }>();
  for (const l of wholesaleDetails) {
    const cur = wItemMap.get(l.itemId) || { itemName: l.itemName, sku: l.sku, revenue: 0, unitsSold: 0 };
    cur.revenue   += l.lineTotal;
    cur.unitsSold += l.totalUnits;
    wItemMap.set(l.itemId, cur);
  }
  const topWholesaleItems = Array.from(wItemMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const wholesaleVsSingle: WholesaleVsSingleSummary = {
    totalRevenue:            grandTotal,
    singleRevenue,
    wholesaleRevenue,
    singleRevenuePercent:    grandTotal > 0 ? (singleRevenue    / grandTotal) * 100 : 0,
    wholesaleRevenuePercent: grandTotal > 0 ? (wholesaleRevenue / grandTotal) * 100 : 0,
    totalUnitsSold,
    singleUnitsSold,
    wholesaleUnitsSold,
    totalOrders:     salesOrders.length,
    singleOrders:    singleOrderIds.size,
    wholesaleOrders: wholesaleOrderIds.size,
    totalSavingsGiven,
    packBreakdown,
    topWholesaleItems,
  };

  return {
    summary,
    salesByCustomer,
    salesByItem,
    timeline,
    topCustomers,
    topItems,
    recentOrders,
    wholesaleVsSingle,
    wholesaleDetails,
    singleDetails,
  };
}

export async function getSalesByCustomerReport(days = 30, fromDate?: Date, toDate?: Date) {
  const r = await getSalesReport(days, fromDate, toDate);
  return { customers: r.salesByCustomer, summary: r.summary };
}

export async function getSalesByItemReport(days = 30, fromDate?: Date, toDate?: Date) {
  const r = await getSalesReport(days, fromDate, toDate);
  return { items: r.salesByItem, summary: r.summary };
}

export async function getSalesSummaryReport(days = 30, fromDate?: Date, toDate?: Date) {
  const r = await getSalesReport(days, fromDate, toDate);
  return {
    summary:        r.summary,
    timeline:       r.timeline,
    topCustomers:   r.topCustomers,
    topItems:       r.topItems,
    recentOrders:   r.recentOrders,
  };
}