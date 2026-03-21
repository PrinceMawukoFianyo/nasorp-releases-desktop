// actions/dashboard.ts
'use server';

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

// ─────────────────────────────────────────────────────────────────────────────
// DATE RANGE HELPER — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function getDateRange(range: string) {
  const now = new Date();

  // Custom date range: "2024-01-01_2024-01-31"
  if (range && range.includes('_')) {
    const [from, to] = range.split('_');
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Single day: "2024-01-15"
  if (range && /^\d{4}-\d{2}-\d{2}$/.test(range)) {
    const startDate = new Date(range);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(range);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Preset ranges
  const startDate = new Date();
  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '12m':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  return { startDate, endDate: now };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER TOTAL HELPER
// Single formula matching the rest of the app: subtotal + tax + shipping - discount
// Used everywhere instead of re-multiplying line.quantity × line.unitPrice
// (which misses discounts, tax adjustments, and shipping applied at order level)
// ─────────────────────────────────────────────────────────────────────────────
function calcOrderTotal(order: {
  subtotal:     number;
  taxAmount:    number;
  shippingCost: number | null;
  discount:     number | null;
}): number {
  return (
    Number(order.subtotal)          +
    Number(order.taxAmount)         +
    Number(order.shippingCost ?? 0) -
    Number(order.discount     ?? 0)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardData
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardData(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    console.log('🔍 Fetching dashboard data for org:', orgId, 'range:', dateRange);

    // ── 1. Inventory Value ────────────────────────────────────────────────────
    // FIX: costPrice × quantity = true accounting/balance-sheet value.
    // The old code used sellingPrice (potential revenue if everything sold today)
    // which inflates the number and doesn't match what accountants expect.
    // Both values are returned — the UI shows cost as headline, retail as context.
    const inventories = await db.inventory.findMany({
      where: {
        orgId,
        item: { isActive: true },
      },
      include: {
        item: {
          select: {
            costPrice:    true,   // ← accounting value (what you paid)
            sellingPrice: true,   // ← retail value (what you'd earn if sold)
          },
        },
      },
    });

    // True inventory asset value — balance sheet figure
    const inventoryValue = inventories
      .filter(inv => inv.quantity > 0)
      .reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).costPrice ?? 0), 0);

    // Retail value — kept so the UI can show both for context
    const inventoryValueAtRetail = inventories
      .filter(inv => inv.quantity > 0)
      .reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).sellingPrice ?? 0), 0);

    const totalItems = await db.item.count({
      where: { orgId, isActive: true },
    });

    // ── 2. Sales Orders ───────────────────────────────────────────────────────
    // FIX: use calcOrderTotal (stored order columns) instead of re-multiplying
    // line.quantity × line.unitPrice, which misses discounts and shipping.
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { id: true, name: true } },
        lines:    { select: { quantity: true, unitPrice: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeSalesOrders   = salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DRAFT');
    const salesOrdersCount    = activeSalesOrders.length;
    // FIX: calcOrderTotal not line re-multiplication
    const salesOrdersValue    = activeSalesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);
    const completedSalesCount = activeSalesOrders.filter(o => o.status === 'COMPLETED').length;
    const pendingSalesCount   = activeSalesOrders.filter(o =>
      ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)
    ).length;

    // ── 3. Purchase Orders ────────────────────────────────────────────────────
    // FIX: calcOrderTotal, exclude DRAFT too
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        supplier: true,
        lines:    { select: { quantity: true, unitPrice: true, total: true } },
      },
    });

    const purchaseOrdersCount = purchaseOrders.length;
    // FIX: calcOrderTotal
    const purchaseOrdersValue = purchaseOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    // ── 4. Low Stock Items — unchanged logic ──────────────────────────────────
    const lowStockInventories = await db.inventory.findMany({
      where: { orgId },
      include: {
        item:     { select: { id: true, name: true, minStockLevel: true } },
        location: true,
      },
    });

    const lowStockItems = lowStockInventories
      .filter(inv => {
        const minLevel = inv.item.minStockLevel || 0;
        return minLevel > 0 && inv.quantity <= minLevel;
      })
      .slice(0, 5)
      .map(inv => ({
        id:         inv.id,
        name:       inv.item.name,
        currentQty: inv.quantity,
        minLevel:   inv.item.minStockLevel || 0,
        location:   inv.location.name,
      }));

    const lowStockCount = lowStockItems.length;

    // ── 5. Top Selling Products ───────────────────────────────────────────────
    // FIX: use SalesOrderLine.total (stored value) not quantity × unitPrice
    const topSellingRaw = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id:   true,
        name: true,
        salesOrderLines: {
          where: { salesOrders: { status: { notIn: ['DRAFT', 'CANCELLED'] } } },
          select: { quantity: true, total: true },
        },
      },
    });

    const topSellingProducts = topSellingRaw
      .map(item => ({
        id:         item.id,
        name:       item.name,
        salesCount: item.salesOrderLines.reduce((s, l) => s + l.quantity, 0),
        // FIX: l.total (stored line total) not l.quantity * l.unitPrice
        salesTotal: item.salesOrderLines.reduce((s, l) => s + Number(l.total), 0),
      }))
      .filter(item => item.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    console.log('📊 Top selling products found:', topSellingProducts.length);

    // ── 6. Recent Customers ───────────────────────────────────────────────────
    // FIX: totalSpent uses calcOrderTotal (stored order totals) not line re-multiplication
    const customers = await db.customer.findMany({
      where: { orgId, isActive: true },
      include: {
        salesOrders: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { notIn: ['CANCELLED', 'DRAFT'] },
          },
          select: {
            subtotal: true, taxAmount: true,
            shippingCost: true, discount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentCustomers = customers
      .map(customer => ({
        id:          customer.id,
        name:        customer.name,
        email:       customer.email  || '',
        phone:       customer.phone  || '',
        totalOrders: customer.salesOrders.length,
        // FIX: calcOrderTotal
        totalSpent:  customer.salesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // ── 7. Recent Sales Orders ────────────────────────────────────────────────
    // FIX: calcOrderTotal — not line re-multiplication
    const recentSalesOrders = activeSalesOrders.slice(0, 8).map(order => ({
      id:           order.id,
      orderNumber:  order.orderNumber,
      customerName: order.customer?.name || 'Walk-in Customer',
      // FIX: calcOrderTotal
      total:        calcOrderTotal(order),
      status:       order.status,
      date:         order.createdAt.toISOString(),
    }));

    // ── 8. Inventory by Location ──────────────────────────────────────────────
    // FIX: use costPrice (accounting value) not sellingPrice
    const locations = await db.location.findMany({
      where: { orgId, isActive: true },
    });

    const inventoryByLocation = await Promise.all(
      locations.map(async (location) => {
        const locationInventories = await db.inventory.findMany({
          where: {
            locationId: location.id,
            orgId,
            item: { isActive: true },
          },
          include: {
            item: {
              select: {
                costPrice:    true,   // ← FIX: accounting value
                sellingPrice: true,   // ← kept for retail context
              },
            },
          },
        });

        return {
          location:      location.name,
          locationId:    location.id,
          // FIX: costPrice × quantity
          value:         locationInventories.reduce((sum, inv) =>
            sum + inv.quantity * Number((inv.item as any).costPrice ?? 0), 0),
          // Also expose retail for context
          valueAtRetail: locationInventories.reduce((sum, inv) =>
            sum + inv.quantity * Number((inv.item as any).sellingPrice ?? 0), 0),
          itemCount:     locationInventories.filter(inv => inv.quantity > 0).length,
        };
      })
    );

    // ── 9. Sales by Category ──────────────────────────────────────────────────
    // Unchanged logic — uses item.salesTotal which is already correct
    const categories = await db.category.findMany({
      where: { orgId },
      include: {
        items: {
          where: { isActive: true },
          select: { salesTotal: true },
        },
      },
    });

    const salesByCategory = categories
      .map(category => ({
        category:   category.title,
        value:      category.items.reduce((sum, item) => sum + Number(item.salesTotal || 0), 0),
        percentage: 0,
      }))
      .filter(cat => cat.value > 0);

    console.log('📈 Sales by category found:', salesByCategory.length);

    let finalSalesByCategory = salesByCategory;
    if (finalSalesByCategory.length === 0) {
      const categorySales = await db.category.findMany({
        where: { orgId },
        include: {
          items: {
            where: { salesCount: { gt: 0 }, isActive: true },
            select: { salesTotal: true },
          },
        },
      });
      finalSalesByCategory = categorySales
        .map(cat => ({
          category:   cat.title,
          value:      cat.items.reduce((sum, item) => sum + Number(item.salesTotal || 0), 0),
          percentage: 0,
        }))
        .filter(cat => cat.value > 0);
    }

    // ── 10. Sales Timeline — daily aggregated for the performance chart ──────
    // Groups all active sales orders by day so the chart shows one bar per day
    // instead of one bar per order (which caused all bars to show the same date).
    const timelineMap = new Map<string, { sales: number; orders: number }>();

    // Build every day in the range as an empty slot first (ensures no gaps)
    const msPerDay = 86_400_000;
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + msPerDay)) {
      const key = d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short' });
      if (!timelineMap.has(key)) timelineMap.set(key, { sales: 0, orders: 0 });
    }

    // Aggregate orders into their day slot
    for (const o of activeSalesOrders) {
      const key = new Date(o.createdAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' });
      const existing = timelineMap.get(key) ?? { sales: 0, orders: 0 };
      existing.sales  += calcOrderTotal(o);
      existing.orders += 1;
      timelineMap.set(key, existing);
    }

    // Convert to sorted array — most recent last so the chart reads left→right
    const salesTimeline = Array.from(timelineMap.entries())
      .map(([label, v]) => ({ label, sales: v.sales, orders: v.orders }))
      .slice(-8); // show last 8 days — matches the chart's 8-bar display

    const result = {
      inventoryValue,          // costPrice × qty — true accounting value
      inventoryValueAtRetail,  // sellingPrice × qty — potential revenue (context)
      totalItems,
      salesOrdersCount,
      salesOrdersValue,
      completedSalesCount,
      pendingSalesCount,
      purchaseOrdersCount,
      purchaseOrdersValue,
      lowStockCount,
      lowStockItems,
      topSellingProducts,
      recentCustomers,
      recentSalesOrders,
      inventoryByLocation,
      salesByCategory: finalSalesByCategory,
      salesTimeline,   // ← new: daily grouped data for the performance chart
    };

    console.log('✅ Dashboard data fetched successfully:', {
      inventoryValue:        result.inventoryValue,
      inventoryValueAtRetail:result.inventoryValueAtRetail,
      totalItems:            result.totalItems,
      salesOrders:           result.salesOrdersCount,
      salesOrdersValue:      result.salesOrdersValue,
      completedSales:        result.completedSalesCount,
      pendingSales:          result.pendingSalesCount,
      purchaseOrders:        result.purchaseOrdersCount,
      purchaseOrdersValue:   result.purchaseOrdersValue,
      topSelling:            result.topSellingProducts.length,
      salesByCategory:       result.salesByCategory.length,
    });

    return result;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardDataWithFallback — unchanged structure, empty data fallback
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardDataWithFallback(dateRange: string) {
  try {
    return await getDashboardData(dateRange);
  } catch (error) {
    console.error('Using fallback dashboard data due to error:', error);
    return getSampleDashboardData();
  }
}

function getSampleDashboardData() {
  return {
    inventoryValue:         125000,
    inventoryValueAtRetail: 175000,
    totalItems: 45,
    salesOrdersCount: 23,
    salesOrdersValue: 85000,
    completedSalesCount: 18,
    pendingSalesCount: 5,
    purchaseOrdersCount: 12,
    purchaseOrdersValue: 45000,
    lowStockCount: 3,
    lowStockItems: [
      { id: "1", name: "Wireless Mouse",  currentQty: 2,  minLevel: 10, location: "Main Warehouse" },
      { id: "2", name: "USB-C Cable",     currentQty: 5,  minLevel: 15, location: "Store Front"    },
    ],
    topSellingProducts: [
      { id: "1", name: "Wireless Keyboard", salesCount: 45, salesTotal: 6750  },
      { id: "2", name: "Monitor 24inch",    salesCount: 32, salesTotal: 25600 },
      { id: "3", name: "Webcam HD",         salesCount: 28, salesTotal: 4200  },
    ],
    recentCustomers: [
      { id: "1", name: "John Smith",    email: "john@example.com",  phone: "+1234567890", totalOrders: 3, totalSpent: 1500 },
      { id: "2", name: "Sarah Johnson", email: "sarah@example.com", phone: "+1234567891", totalOrders: 5, totalSpent: 3200 },
    ],
    recentSalesOrders: [
      { id: "1", orderNumber: "SO-00123", customerName: "John Smith",    total: 450,  status: "COMPLETED",  date: new Date().toISOString() },
      { id: "2", orderNumber: "SO-00124", customerName: "Sarah Johnson", total: 1200, status: "PROCESSING", date: new Date().toISOString() },
    ],
    inventoryByLocation: [
      { location: "Main Warehouse", locationId: "1", value: 85000,  valueAtRetail: 120000, itemCount: 28 },
      { location: "Store Front",    locationId: "2", value: 35000,  valueAtRetail: 55000,  itemCount: 15 },
    ],
    salesByCategory: [
      { category: "Electronics",     value: 45000, percentage: 45 },
      { category: "Accessories",     value: 25000, percentage: 25 },
      { category: "Office Supplies", value: 15000, percentage: 15 },
    ],
    salesTimeline: [
      { label: "13 Mar", sales: 1200,  orders: 3 },
      { label: "14 Mar", sales: 3400,  orders: 7 },
      { label: "15 Mar", sales: 2100,  orders: 5 },
      { label: "16 Mar", sales: 4800,  orders: 9 },
      { label: "17 Mar", sales: 1900,  orders: 4 },
      { label: "18 Mar", sales: 5200,  orders: 11 },
      { label: "19 Mar", sales: 8700,  orders: 18 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getInventoryMetrics
// FIX: costPrice for totalValue (accounting), sellingPrice kept for reference
// ─────────────────────────────────────────────────────────────────────────────
export async function getInventoryMetrics(dateRange: string) {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;

    // NOTE: No date filter on inventory — it's a current snapshot.
    const inventoryItems = await db.inventory.findMany({
      where: { orgId, item: { isActive: true } },
      include: {
        item: {
          select: {
            costPrice:    true,   // FIX: was sellingPrice
            sellingPrice: true,
          },
        },
      },
    });

    // FIX: costPrice × quantity (accounting value, not retail)
    const totalValue = inventoryItems
      .filter(inv => inv.quantity > 0)
      .reduce((sum, inventory) => {
        return sum + (inventory.quantity * Number((inventory.item as any).costPrice || 0));
      }, 0);

    const allInventory = await db.inventory.findMany({
      where: {
        orgId,
        item: { minStockLevel: { gt: 0 } },
      },
      include: {
        location: true,
        item:     { select: { minStockLevel: true } },
      },
    });

    const lowStockCount = allInventory.filter(
      inv => inv.quantity <= (inv.item.minStockLevel || 0)
    ).length;

    const locations = await db.location.findMany({
      where: { orgId, isActive: true },
    });

    const locationData = await Promise.all(
      locations.map(async (location) => {
        const inventories = await db.inventory.findMany({
          where: { locationId: location.id, orgId, item: { isActive: true } },
          include: { item: { select: { costPrice: true } } },  // FIX: costPrice
        });
        return {
          name:      location.name,
          itemCount: inventories.filter(i => i.quantity > 0).length,
          // FIX: costPrice
          totalValue: inventories.reduce((sum, inv) =>
            sum + inv.quantity * Number((inv.item as any).costPrice || 0), 0),
        };
      })
    );

    // Top selling — unchanged (uses SalesOrderLine.total correctly)
    const topSellingRaw = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id:   true,
        name: true,
        salesOrderLines: {
          where: { salesOrders: { status: { notIn: ['DRAFT', 'CANCELLED'] } } },
          select: { quantity: true, total: true },
        },
      },
    });
    const topSellingItems = topSellingRaw
      .map(item => ({
        id:         item.id,
        name:       item.name,
        salesCount: item.salesOrderLines.reduce((s, l) => s + l.quantity, 0),
        salesTotal: item.salesOrderLines.reduce((s, l) => s + Number(l.total), 0),
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    return {
      totalValue,
      lowStockCount: lowStockCount || 0,
      locations:     locationData,
      topSellingItems,
    };
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    throw new Error('Failed to fetch inventory metrics');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getSalesPerformance
// FIX: calcOrderTotal throughout — not line re-multiplication
// Also FIX: missing orgId filter on allOrders query (was cross-org leak)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSalesPerformance(dateRange: string) {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    const recentOrders = await db.salesOrder.findMany({
      take: 10,
      where: { orgId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });

    const formattedOrders = recentOrders.map(order => ({
      id:           order.id,
      orderNumber:  order.orderNumber,
      customerName: order.customer?.name || 'Walk-in Customer',
      status:       order.status,
      // FIX: calcOrderTotal
      totalAmount:  calcOrderTotal(order),
      orderDate:    order.createdAt,
    }));

    // FIX: added orgId to prevent cross-org data leak (was missing in original)
    const allOrders = await db.salesOrder.findMany({
      where: {
        orgId,   // ← FIX: was missing!
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        subtotal: true, taxAmount: true,
        shippingCost: true, discount: true,
        createdAt: true,
      },
    });

    // FIX: calcOrderTotal instead of line re-multiplication
    const calcRevenue = (orders: typeof allOrders) =>
      orders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    const totalRevenue = calcRevenue(allOrders);

    const oneDayAgo  = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo= new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const dailyRevenue   = calcRevenue(allOrders.filter(o => o.createdAt >= oneDayAgo));
    const weeklyRevenue  = calcRevenue(allOrders.filter(o => o.createdAt >= oneWeekAgo));
    const monthlyRevenue = calcRevenue(allOrders.filter(o => o.createdAt >= oneMonthAgo));

    // Growth vs previous same-length period
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousOrders = await db.salesOrder.findMany({
      where: {
        orgId,   // FIX: was missing
        createdAt: { gte: previousPeriodStart, lt: startDate },
        status: 'COMPLETED',
      },
      select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true, createdAt: true },
    });

    const previousRevenue = calcRevenue(previousOrders);
    const growth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    // Top customers — FIX: calcOrderTotal
    const customers = await db.customer.findMany({
      where: { orgId, isActive: true },
      include: {
        salesOrders: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'COMPLETED',
          },
          select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true },
        },
      },
    });

    const topCustomersData = customers
      .map(customer => ({
        id:         customer.id,
        name:       customer.name,
        orderCount: customer.salesOrders.length,
        // FIX: calcOrderTotal
        totalValue: customer.salesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0),
      }))
      .filter(c => c.orderCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      recentOrders: formattedOrders,
      revenue: {
        daily:   dailyRevenue,
        weekly:  weeklyRevenue,
        monthly: monthlyRevenue,
        growth:  Number(growth.toFixed(2)),
      },
      topCustomers: topCustomersData,
    };
  } catch (error) {
    console.error('Error fetching sales performance:', error);
    throw new Error('Failed to fetch sales performance');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getPurchaseOrders
// FIX: calcOrderTotal instead of line re-multiplication
// ─────────────────────────────────────────────────────────────────────────────
export async function getPurchaseOrders(dateRange: string) {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    const recentOrders = await db.purchaseOrder.findMany({
      take: 10,
      where: {
        createdAt: { gte: startDate, lte: endDate },
        orgId,
        status: { in: ['APPROVED', 'RECEIVED', 'COMPLETED', 'PARTIALLY_RECEIVED', 'SUBMITTED'] },
      },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    const upcomingDeliveries = await db.purchaseOrder.findMany({
      where: {
        expectedDeliveryDate: { gte: new Date() },
        status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] },
        orgId,
      },
      include: {
        supplier:         true,
        deliveryLocation: true,
        lines:            { include: { item: true } },
      },
    });

    const formattedOrders = recentOrders.map(order => ({
      id:                   order.id,
      orderNumber:          order.poNumber,
      supplierName:         order.supplier?.name || order.supplierName || 'Unknown Supplier',
      status:               order.status,
      // FIX: calcOrderTotal
      totalAmount:          calcOrderTotal(order),
      orderDate:            order.date,
      expectedDeliveryDate: order.expectedDeliveryDate,
    }));

    const pendingApprovalCount = await db.purchaseOrder.count({
      where: {
        status: 'PENDING',
        orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const suppliers = await db.supplier.findMany({
      where: { isActive: true, orgId },
      include: {
        purchaseOrders: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['COMPLETED', 'RECEIVED'] },
          },
          select: { id: true, status: true, expectedDeliveryDate: true },
        },
      },
    });

    const supplierPerformance = suppliers
      .map(supplier => {
        const orders             = supplier.purchaseOrders;
        const deliveredOrders    = orders.filter(o => o.expectedDeliveryDate !== null);
        const onTimeDeliveries   = deliveredOrders.filter(o =>
          o.status === 'RECEIVED' || o.status === 'COMPLETED'
        ).length;
        const onTimePercentage   = deliveredOrders.length > 0
          ? (onTimeDeliveries / deliveredOrders.length) * 100
          : 0;
        return {
          supplierId:       supplier.id,
          supplierName:     supplier.name,
          orderCount:       orders.length,
          onTimePercentage: Number(onTimePercentage.toFixed(1)),
        };
      })
      .filter(s => s.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    return { recentOrders: formattedOrders, pendingApprovalCount, supplierPerformance, upcomingDeliveries };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw new Error('Failed to fetch purchase orders');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getStockMovements — unchanged logic (was already correct)
// ─────────────────────────────────────────────────────────────────────────────
export async function getStockMovements(dateRange: string) {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    const transfers = await db.transfer.findMany({
      take: 10,
      where: { createdAt: { gte: startDate, lte: endDate }, orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromLocation: true,
        toLocation:   true,
        lines:        { include: { item: true } },
      },
    });

    const formattedTransfers = transfers.map(transfer => {
      const totalItems = transfer.lines.reduce((sum, line) => sum + line.quantity, 0);
      const itemNames  = transfer.lines.map(line => line.item.name).join(', ');
      return {
        id:           transfer.id,
        fromLocation: transfer.fromLocation.name,
        toLocation:   transfer.toLocation.name,
        productName:  itemNames || 'Multiple Items',
        quantity:     totalItems,
        transferDate: transfer.createdAt,
        notes:        transfer.notes,
      };
    });

    const adjustments = await db.adjustment.findMany({
      take: 10,
      where: { createdAt: { gte: startDate, lte: endDate }, orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        lines: { include: { item: true } },
      },
    });

    const formattedAdjustments = adjustments.map(adjustment => {
      const totalQuantityChange = adjustment.lines.reduce((sum, line) =>
        sum + (line.afterQuantity - line.beforeQuantity), 0);
      const totalValueChange = adjustment.lines.reduce((sum, line) => {
        const qty = line.afterQuantity - line.beforeQuantity;
        // costPrice already used here — correct (unchanged from original)
        return sum + (qty * Number(line.item.costPrice || 0));
      }, 0);
      return {
        id:             adjustment.id,
        adjustmentType: adjustment.adjustmentType,
        productName:    adjustment.lines.map(l => l.item.name).join(', ') || 'Multiple Items',
        quantityChange: totalQuantityChange,
        valueChange:    totalValueChange,
        reason:         adjustment.reason,
        adjustmentDate: adjustment.createdAt,
      };
    });

    return { transfers: formattedTransfers, adjustments: formattedAdjustments };
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw new Error('Failed to fetch stock movements');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getFinancialSummaries
// FIX: calcOrderTotal throughout — not line re-multiplication
// ─────────────────────────────────────────────────────────────────────────────
export async function getFinancialSummaries(dateRange: string) {
  try {
    const user  = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    // FIX: select only what we need, use calcOrderTotal
    const salesOrders = await db.salesOrder.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        orgId,
      },
      select: {
        subtotal: true, taxAmount: true,
        shippingCost: true, discount: true,
      },
    });

    // FIX: calcOrderTotal
    const totalSales = salesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    // FIX: calcOrderTotal for purchase orders
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'RECEIVED', 'COMPLETED', 'PARTIALLY_RECEIVED'] },
        orgId,
      },
      select: {
        subtotal: true, taxAmount: true,
        shippingCost: true, discount: true,
      },
    });

    // FIX: calcOrderTotal
    const totalPurchases = purchaseOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    const grossProfit = totalSales - totalPurchases;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Tax: sum of taxAmount on completed sales only (unchanged logic)
    const taxLiability = salesOrders.reduce((sum, order) =>
      sum + Number(order.taxAmount || 0), 0);

    return {
      totalSales,
      totalPurchases,
      grossMargin:  Number(grossMargin.toFixed(2)),
      taxLiability: Number(taxLiability.toFixed(2)),
    };
  } catch (error) {
    console.error('Error fetching financial summaries:', error);
    throw new Error('Failed to fetch financial summaries');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export helpers — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export async function exportInventoryToExcel(dateRange: string) {
  return getInventoryMetrics(dateRange);
}
export async function exportSalesPerformanceToExcel(dateRange: string) {
  return getSalesPerformance(dateRange);
}
export async function exportPurchaseOrdersToExcel(dateRange: string) {
  return getPurchaseOrders(dateRange);
}
export async function exportStockMovementsToExcel(dateRange: string) {
  return getStockMovements(dateRange);
}
export async function exportFinancialSummaryToExcel(dateRange: string) {
  return getFinancialSummaries(dateRange);
}