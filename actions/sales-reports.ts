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
  /** Unit cost price from item master */
  costPrice: number;
  /** Cost of Goods Sold = totalQuantitySold × costPrice */
  totalCOGS: number;
  /** Gross Profit = totalRevenue − totalCOGS */
  grossProfit: number;
  /** Gross margin % = (grossProfit / totalRevenue) × 100 */
  grossMargin: number;
  /** Current stock remaining across all locations */
  stockRemaining: number;
  /** Inventory value of remaining stock = stockRemaining × costPrice */
  totalCostPrice: number;
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
  tierName:             string;
  packQuantity:         number;
  unitsPerPack:         number;
  totalUnits:           number;
  pricePerPack:         number;
  pricePerUnit:         number;
  singleUnitPrice:      number;
  savingsPerUnit:       number;
  totalSavings:         number;
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
  totalRevenue:            number;
  singleRevenue:           number;
  wholesaleRevenue:        number;
  singleRevenuePercent:    number;
  wholesaleRevenuePercent: number;
  totalUnitsSold:          number;
  singleUnitsSold:         number;
  wholesaleUnitsSold:      number;
  totalOrders:             number;
  singleOrders:            number;
  wholesaleOrders:         number;
  totalSavingsGiven:       number;
  packBreakdown: {
    tierName:   string;
    packsSold:  number;
    unitsSold:  number;
    revenue:    number;
    percentage: number;
  }[];
  topWholesaleItems: {
    itemName:  string;
    sku:       string;
    revenue:   number;
    unitsSold: number;
  }[];
}

export interface CreditPaymentBreakdown {
  cashRevenue:      number;
  momoRevenue:      number;
  cardRevenue:      number;
  creditRevenue:    number;
  paidOrders:       number;
  partialOrders:    number;
  pendingOrders:    number;
  cancelledOrders:  number;
  totalCollected:   number;
  totalOutstanding: number;
  totalCancelled:   number;
  topDebtors: {
    customerName: string;
    totalOwing:   number;
    orderCount:   number;
    isOverdue:    boolean;
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
    paymentStatus: string;
    amountPaid: number;
    amountOwing: number;
    itemCount: number;
  }>;
  wholesaleVsSingle: WholesaleVsSingleSummary;
  wholesaleDetails:  WholesaleSaleDetail[];
  singleDetails:     SingleSaleDetail[];
  creditPayment:     CreditPaymentBreakdown;
}

// ============================================
// MAIN SALES REPORT FUNCTION
// ============================================

export async function getSalesReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<SalesReportData> {
  const user  = await getAuthenticatedUser();
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
          item: { include: { category: true } },
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
      customerName:      d.customerName,
      customerEmail:     d.customerEmail,
      totalOrders:       d.totalOrders,
      totalQuantity:     d.totalQuantity,
      totalRevenue:      d.totalRevenue,
      averageOrderValue: d.totalRevenue / d.totalOrders,
      lastOrderDate:     format(d.lastOrderDate, "MMM dd, yyyy"),
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
        itemName:      line.item?.name || "Unknown",
        sku:           line.item?.sku  || "",
        category:      line.item?.category?.name,
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

  // Fetch current stock levels for every item that appeared in orders
  const soldItemIds = Array.from(itemMap.keys());

  // Fetch stock entries + item cost prices in one query
  const stockEntries = soldItemIds.length > 0
    ? await db.inventory.findMany({
        where: { orgId, itemId: { in: soldItemIds } },
        select: { itemId: true, quantity: true },
      })
    : [];

  // Aggregate stock per item (multiple locations)
  const stockByItem = new Map<string, number>();
  for (const s of stockEntries) {
    stockByItem.set(s.itemId, (stockByItem.get(s.itemId) ?? 0) + s.quantity);
  }

  // Fetch cost prices for sold items
  const itemDetails = soldItemIds.length > 0
    ? await db.item.findMany({
        where: { id: { in: soldItemIds }, orgId },
        select: { id: true, costPrice: true },
      })
    : [];

  const costPriceByItem = new Map<string, number>();
  for (const it of itemDetails) {
    costPriceByItem.set(it.id, (it.costPrice as number) ?? 0);
  }

  const salesByItem: SalesByItem[] = Array.from(itemMap.entries())
    .map(([itemId, d]) => {
      const stockRemaining = stockByItem.get(itemId) ?? 0;
      const costPrice      = costPriceByItem.get(itemId) ?? 0;
      const totalCOGS      = d.totalQuantity * costPrice;
      const grossProfit    = d.totalRevenue - totalCOGS;
      const grossMargin    = d.totalRevenue > 0 ? (grossProfit / d.totalRevenue) * 100 : 0;
      return {
        itemId,
        itemName:          d.itemName,
        sku:               d.sku,
        category:          d.category,
        totalQuantitySold: d.totalQuantity,
        totalRevenue:      d.totalRevenue,
        averagePrice:      d.priceSum / d.priceCount,
        totalOrders:       d.totalOrders,
        costPrice,
        totalCOGS,
        grossProfit,
        grossMargin,
        stockRemaining,
        totalCostPrice:    stockRemaining * costPrice,
      };
    })
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
    name:       c.customerName,
    value:      c.totalRevenue,
    percentage: totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0,
  }));
  const topItems: TopPerformer[] = salesByItem.slice(0, 5).map((i) => ({
    name:       i.itemName,
    value:      i.totalRevenue,
    percentage: totalRevenue > 0 ? (i.totalRevenue / totalRevenue) * 100 : 0,
  }));

  // ── Recent orders ─────────────────────────────────────────────────────────

  const recentOrders = salesOrders.slice(0, 10).map((order) => {
    const orderTotal  = (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0);
    const amountPaid  = (order as any).amountPaid  ?? 0;
    const amountOwing = (order as any).amountOwing ?? Math.max(0, orderTotal - amountPaid);
    return {
      id:           order.id,
      orderNumber:  order.orderNumber || "N/A",
      customerName: order.customer?.name || "Unknown",
      date:         format(order.createdAt, "MMM dd, yyyy"),
      total:        orderTotal,
      status:       order.status,
      paymentStatus: order.paymentStatus,
      amountPaid,
      amountOwing,
      itemCount:    order.lines.length,
    };
  });

  // ── Wholesale vs Single breakdown ─────────────────────────────────────────

  const wholesaleDetails: WholesaleSaleDetail[] = [];
  const singleDetails:    SingleSaleDetail[]     = [];
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

      const isWholesale = !!tierId;
      const singlePrice = (line.item?.sellingPrice as number) || 0;

      if (isWholesale && tierName) {
        const pricePerUnit   = wholesalePricePerPack / unitsPerPack;
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

  // ── Credit & Payment breakdown ────────────────────────────────────────────

  const orderIds = salesOrders.map(o => o.id);
  const payments = orderIds.length > 0 ? await db.salesOrderPayment.findMany({
    where: { orderId: { in: orderIds } },
    select: { amount: true, method: true },
  }) : [];

  const cashRevenue = payments.filter((p: any) => p.method === "CASH").reduce((s: number, p: any) => s + p.amount, 0);
  const momoRevenue = payments.filter((p: any) => p.method === "MOMO").reduce((s: number, p: any) => s + p.amount, 0);
  const cardRevenue = payments.filter((p: any) => p.method === "CREDIT_CARD").reduce((s: number, p: any) => s + p.amount, 0);

  const totalCollected   = cashRevenue + momoRevenue + cardRevenue;
  const totalOutstanding = salesOrders.reduce((s, o) => s + ((o as any).amountOwing ?? 0), 0);

  const paidOrders    = salesOrders.filter(o => o.paymentStatus === "PAID").length;
  const partialOrders = salesOrders.filter(o => o.paymentStatus === "PARTIAL").length;
  const pendingOrders = salesOrders.filter(o => o.paymentStatus === "PENDING").length;

  const now = new Date();
  const debtorMap = new Map<string, { name: string; owing: number; count: number; overdue: boolean }>();
  for (const order of salesOrders) {
    if ((order as any).amountOwing > 0 && order.customerId) {
      const key = order.customerId;
      const cur = debtorMap.get(key) ?? { name: order.customer?.name ?? "Unknown", owing: 0, count: 0, overdue: false };
      cur.owing += (order as any).amountOwing ?? 0;
      cur.count += 1;
      if ((order as any).deliveryDate && new Date((order as any).deliveryDate) < now && order.paymentStatus !== "PAID") {
        cur.overdue = true;
      }
      debtorMap.set(key, cur);
    }
  }
  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.owing - a.owing)
    .slice(0, 5)
    .map(d => ({ customerName: d.name, totalOwing: d.owing, orderCount: d.count, isOverdue: d.overdue }));

  const creditPayment: CreditPaymentBreakdown = {
    cashRevenue, momoRevenue, cardRevenue,
    creditRevenue:   totalOutstanding,
    paidOrders, partialOrders, pendingOrders, cancelledOrders: 0,
    totalCollected, totalOutstanding, totalCancelled: 0,
    topDebtors,
  };

  return {
    summary, salesByCustomer, salesByItem, timeline,
    topCustomers, topItems, recentOrders,
    wholesaleVsSingle, wholesaleDetails, singleDetails, creditPayment,
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
    summary:      r.summary,
    timeline:     r.timeline,
    topCustomers: r.topCustomers,
    topItems:     r.topItems,
    recentOrders: r.recentOrders,
  };
}

export async function getSalesReportWithDateRange(fromDate?: Date, toDate?: Date) {
  return getSalesReport(30, fromDate, toDate);
}

// ============================================
// ITEM TRANSACTION STATEMENT (drop-down + print)
// ============================================

export interface ItemStatementLine {
  orderId:       string;
  orderNumber:   string;
  date:          string;   // "6 Oct 2026"
  time:          string;   // "14:32"
  customerName:  string;
  soldBy:        string;
  locationName:  string;
  saleType:      "SINGLE" | "WHOLESALE";
  tierName:      string | null;
  packQuantity:  number;
  unitsPerPack:  number;
  quantity:      number;   // actual units deducted from stock
  unitPrice:     number;   // price per unit charged
  lineTotal:     number;
  paymentStatus: string;
}

export interface ItemStatement {
  item: {
    id:           string;
    name:         string;
    sku:          string;
    category?:    string;
    costPrice:    number;
    sellingPrice: number;
    dateAdded:    string;   // when the item was first inputted
  };
  lines: ItemStatementLine[];
  totals: {
    orders:           number;
    totalQuantity:    number;
    singleQuantity:   number;
    wholesaleQuantity: number;
    totalRevenue:     number;
    singleRevenue:    number;
    wholesaleRevenue: number;
    firstSale:        string | null;
    lastSale:         string | null;
  };
  rangeLabel: string;
}

/**
 * Full sales record for ONE item.
 * days = null  → all time
 */
export async function getItemTransactionStatement(
  itemId: string,
  days: number | null = 30
): Promise<ItemStatement | null> {
  const user  = await getAuthenticatedUser();
  const orgId = user.orgId;

  const item = await db.item.findFirst({
    where: { id: itemId, orgId },
    include: { category: true },
  });
  if (!item) return null;

  const startDate = days ? startOfDay(subDays(new Date(), days)) : undefined;

  const orders = await db.salesOrder.findMany({
    where: {
      orgId,
      status: { not: "CANCELLED" },
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
      lines: { some: { itemId } },
    },
    include: {
      customer: true,
      location: { select: { name: true } },
      // ⚠️ "Sold by" — rename `createdBy` if your SalesOrder uses a different
      // relation name (e.g. `user`, `soldBy`, `cashier`).
      createdBy: { select: { name: true } },
      // only this item's lines
      lines: { where: { itemId } },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines: ItemStatementLine[] = [];

  for (const order of orders as any[]) {
    for (const line of order.lines as any[]) {
      let tierName: string | null = null;
      let tierId:   string | null = null;
      let packQty      = 1;
      let unitsPerPack = 1;
      let packPrice    = line.unitPrice as number;

      try {
        if (line.notes) {
          const meta = JSON.parse(line.notes as string);
          tierName     = meta.tierName              ?? null;
          tierId       = meta.tierId                ?? null;
          packQty      = meta.packQty               ?? 1;
          unitsPerPack = meta.unitsPerPack          ?? 1;
          packPrice    = meta.wholesalePricePerPack ?? line.unitPrice;
        }
      } catch { /* plain-text notes → single sale */ }

      const isWholesale = !!tierId;

      lines.push({
        orderId:       order.id,
        orderNumber:   order.orderNumber || order.id,
        date:          format(order.createdAt, "d MMM yyyy"),
        time:          format(order.createdAt, "HH:mm"),
        customerName:  order.customer?.name || "Walk-in",
        soldBy:        order.createdBy?.name || "—",
        locationName:  order.location?.name || "N/A",
        saleType:      isWholesale ? "WHOLESALE" : "SINGLE",
        tierName:      isWholesale ? tierName : null,
        packQuantity:  isWholesale ? packQty : line.quantity,
        unitsPerPack:  isWholesale ? unitsPerPack : 1,
        quantity:      line.quantity,
        unitPrice:     isWholesale ? packPrice / unitsPerPack : line.unitPrice,
        lineTotal:     line.total ?? line.quantity * line.unitPrice,
        paymentStatus: order.paymentStatus,
      });
    }
  }

  const sum = (arr: ItemStatementLine[], k: "quantity" | "lineTotal") =>
    arr.reduce((s, l) => s + l[k], 0);

  const single    = lines.filter((l) => l.saleType === "SINGLE");
  const wholesale = lines.filter((l) => l.saleType === "WHOLESALE");

  return {
    item: {
      id:           item.id,
      name:         item.name,
      sku:          item.sku,
      category:     (item as any).category?.title,
      costPrice:    ((item as any).costPrice as number) ?? 0,
      sellingPrice: ((item as any).sellingPrice as number) ?? 0,
      dateAdded:    format((item as any).createdAt, "d MMM yyyy, HH:mm"),
    },
    lines,
    totals: {
      orders:            new Set(lines.map((l) => l.orderId)).size,
      totalQuantity:     sum(lines, "quantity"),
      singleQuantity:    sum(single, "quantity"),
      wholesaleQuantity: sum(wholesale, "quantity"),
      totalRevenue:      sum(lines, "lineTotal"),
      singleRevenue:     sum(single, "lineTotal"),
      wholesaleRevenue:  sum(wholesale, "lineTotal"),
      firstSale:         lines.length ? lines[lines.length - 1].date : null,
      lastSale:          lines.length ? lines[0].date : null,
    },
    rangeLabel: days ? `Last ${days} days` : "All time",
  };
}