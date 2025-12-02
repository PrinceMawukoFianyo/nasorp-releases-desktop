// ============================================
// FILE: actions/sales-reports.ts
// COMPLETE FIXED VERSION - READY TO USE
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
}

// ============================================
// MAIN SALES REPORT FUNCTION
// ============================================

export async function getSalesReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<SalesReportData> {
  // Get authenticated user and extract orgId
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  // Use custom date range if provided, otherwise use days parameter
  const startDate = fromDate || startOfDay(subDays(new Date(), days));
  const endDate = toDate || endOfDay(new Date());

  // Fetch all sales orders with related data
  const salesOrders = await db.salesOrder.findMany({
    where: {
      orgId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        not: "CANCELLED",
      },
    },
    include: {
      customer: true,
      lines: {
        include: {
          item: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // ============================================
  // CALCULATE SALES SUMMARY
  // ============================================

  const totalRevenue = salesOrders.reduce(
    (sum, order) =>
      sum +
      (order.subtotal || 0) +
      (order.taxAmount || 0) +
      (order.shippingCost || 0) -
      (order.discount || 0),
    0
  );

  const totalTax = salesOrders.reduce(
    (sum, order) => sum + (order.taxAmount || 0),
    0
  );

  const totalDiscount = salesOrders.reduce(
    (sum, order) => sum + (order.discount || 0),
    0
  );

  const totalOrders = salesOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const netRevenue = totalRevenue - totalTax;

  const summary: SalesSummary = {
    totalSales: totalOrders,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalTax,
    totalDiscount,
    netRevenue,
  };

  // ============================================
  // CALCULATE SALES BY CUSTOMER
  // ============================================

  const customerMap = new Map<
    string,
    {
      customerName: string;
      customerEmail: string;
      totalOrders: number;
      totalQuantity: number;
      totalRevenue: number;
      lastOrderDate: Date;
    }
  >();

  salesOrders.forEach((order) => {
    const customerId = order.customerId?? "";
    const orderTotal =
      (order.subtotal || 0) +
      (order.taxAmount || 0) +
      (order.shippingCost || 0) -
      (order.discount || 0);

    const orderQuantity = order.lines.reduce(
      (sum: number, line: any) => sum + line.quantity,
      0
    );

    const current = customerMap.get(customerId) || {
      customerName: order.customer?.name || "Unknown",
      customerEmail: order.customer?.email || "",
      totalOrders: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      lastOrderDate: order.createdAt,
    };

    current.totalOrders += 1;
    current.totalQuantity += orderQuantity;
    current.totalRevenue += orderTotal;

    if (order.createdAt > current.lastOrderDate) {
      current.lastOrderDate = order.createdAt;
    }

    customerMap.set(customerId, current);
  });

  const salesByCustomer: SalesByCustomer[] = Array.from(customerMap.entries())
    .map(([customerId, data]) => ({
      customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      totalOrders: data.totalOrders,
      totalQuantity: data.totalQuantity,
      totalRevenue: data.totalRevenue,
      averageOrderValue: data.totalRevenue / data.totalOrders,
      lastOrderDate: format(data.lastOrderDate, "MMM dd, yyyy"),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // ============================================
  // CALCULATE SALES BY ITEM
  // ============================================

  const itemMap = new Map<
    string,
    {
      itemName: string;
      sku: string;
      category?: string;
      totalQuantity: number;
      totalRevenue: number;
      totalOrders: number;
      priceSum: number;
      priceCount: number;
    }
  >();

  salesOrders.forEach((order) => {
    order.lines.forEach((line: any) => {
      const itemId = line.itemId;
      const lineRevenue =
        line.quantity * line.unitPrice * (1 + (line.taxRate || 0) / 100);

      const current = itemMap.get(itemId) || {
        itemName: line.item?.name || "Unknown",
        sku: line.item?.sku || "",
        category: line.item?.category?.name,
        totalQuantity: 0,
        totalRevenue: 0,
        totalOrders: 0,
        priceSum: 0,
        priceCount: 0,
      };

      current.totalQuantity += line.quantity;
      current.totalRevenue += lineRevenue;
      current.totalOrders += 1;
      current.priceSum += line.unitPrice;
      current.priceCount += 1;

      itemMap.set(itemId, current);
    });
  });

  const salesByItem: SalesByItem[] = Array.from(itemMap.entries())
    .map(([itemId, data]) => ({
      itemId,
      itemName: data.itemName,
      sku: data.sku,
      category: data.category,
      totalQuantitySold: data.totalQuantity,
      totalRevenue: data.totalRevenue,
      averagePrice: data.priceSum / data.priceCount,
      totalOrders: data.totalOrders,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // ============================================
  // CALCULATE TIMELINE DATA
  // ============================================

  const timelineMap = new Map<string, { orders: number; revenue: number }>();

  salesOrders.forEach((order) => {
    const dateKey = format(order.createdAt, "MMM dd");
    const orderTotal =
      (order.subtotal || 0) +
      (order.taxAmount || 0) +
      (order.shippingCost || 0) -
      (order.discount || 0);

    const current = timelineMap.get(dateKey) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += orderTotal;
    timelineMap.set(dateKey, current);
  });

  const timeline: SalesTimeline[] = Array.from(timelineMap.entries())
    .map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.date + " 2024");
      const dateB = new Date(b.date + " 2024");
      return dateA.getTime() - dateB.getTime();
    });

  // ============================================
  // CALCULATE TOP PERFORMERS
  // ============================================

  const topCustomers: TopPerformer[] = salesByCustomer
    .slice(0, 5)
    .map((customer) => ({
      name: customer.customerName,
      value: customer.totalRevenue,
      percentage:
        totalRevenue > 0 ? (customer.totalRevenue / totalRevenue) * 100 : 0,
    }));

  const topItems: TopPerformer[] = salesByItem.slice(0, 5).map((item) => ({
    name: item.itemName,
    value: item.totalRevenue,
    percentage:
      totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0,
  }));

  // ============================================
  // GET RECENT ORDERS
  // ============================================

  const recentOrders = salesOrders.slice(0, 10).map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber || "N/A",
    customerName: order.customer?.name || "Unknown",
    date: format(order.createdAt, "MMM dd, yyyy"),
    total:
      (order.subtotal || 0) +
      (order.taxAmount || 0) +
      (order.shippingCost || 0) -
      (order.discount || 0),
    status: order.status,
    itemCount: order.lines.length,
  }));

  // ============================================
  // RETURN COMPLETE REPORT DATA
  // ============================================

  return {
    summary,
    salesByCustomer,
    salesByItem,
    timeline,
    topCustomers,
    topItems,
    recentOrders,
  };
}

// ============================================
// SALES BY CUSTOMER REPORT
// ============================================

export async function getSalesByCustomerReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<{ customers: SalesByCustomer[]; summary: SalesSummary }> {
  const fullReport = await getSalesReport(days, fromDate, toDate);
  return {
    customers: fullReport.salesByCustomer,
    summary: fullReport.summary,
  };
}

// ============================================
// SALES BY ITEM REPORT
// ============================================

export async function getSalesByItemReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<{ items: SalesByItem[]; summary: SalesSummary }> {
  const fullReport = await getSalesReport(days, fromDate, toDate);
  return {
    items: fullReport.salesByItem,
    summary: fullReport.summary,
  };
}

// ============================================
// SALES SUMMARY REPORT
// ============================================

export async function getSalesSummaryReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<{
  summary: SalesSummary;
  timeline: SalesTimeline[];
  topCustomers: TopPerformer[];
  topItems: TopPerformer[];
  recentOrders: any[];
}> {
  const fullReport = await getSalesReport(days, fromDate, toDate);
  return {
    summary: fullReport.summary,
    timeline: fullReport.timeline,
    topCustomers: fullReport.topCustomers,
    topItems: fullReport.topItems,
    recentOrders: fullReport.recentOrders,
  };
}

// ============================================
// END OF FILE
// ============================================

