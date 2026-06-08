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
    const inventories = await db.inventory.findMany({
      where: { orgId, item: { isActive: true } },
      include: { item: { select: { costPrice: true, sellingPrice: true } } },
    });

    const inventoryValue = inventories
      .filter(inv => inv.quantity > 0)
      .reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).costPrice ?? 0), 0);

    const inventoryValueAtRetail = inventories
      .filter(inv => inv.quantity > 0)
      .reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).sellingPrice ?? 0), 0);

    const totalItems = await db.item.count({ where: { orgId, isActive: true } });

    // ── 2. Credit Saless ───────────────────────────────────────────────────────
    const salesOrders = await db.salesOrder.findMany({
      where: { orgId, createdAt: { gte: startDate, lte: endDate } },
      include: { customer: { select: { id: true, name: true } }, lines: { select: { quantity: true, unitPrice: true, total: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const activeSalesOrders   = salesOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DRAFT');
    const salesOrdersCount    = activeSalesOrders.length;
    const salesOrdersValue    = activeSalesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);
    const completedSalesCount = activeSalesOrders.filter(o => o.status === 'COMPLETED').length;
    const pendingSalesCount   = activeSalesOrders.filter(o => ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;

    // ── 3. Purchase Orders ────────────────────────────────────────────────────
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: { orgId, createdAt: { gte: startDate, lte: endDate }, status: { notIn: ['CANCELLED'] } },
      include: { supplier: true, lines: { select: { quantity: true, unitPrice: true, total: true } } },
    });

    const purchaseOrdersCount = purchaseOrders.length;
    const purchaseOrdersValue = purchaseOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0);

    // ── 4. Low Stock Items ──────────────────────────────────────────────────
    const lowStockInventories = await db.inventory.findMany({
      where: { orgId },
      include: { item: { select: { id: true, name: true, minStockLevel: true } }, location: true },
    });

    const lowStockItems = lowStockInventories
      .filter(inv => (inv.item.minStockLevel || 0) > 0 && inv.quantity <= inv.item.minStockLevel!)
      .slice(0, 5)
      .map(inv => ({
        id: inv.id,
        name: inv.item.name,
        currentQty: inv.quantity,
        minLevel: inv.item.minStockLevel || 0,
        location: inv.location.name,
      }));

    const lowStockCount = lowStockItems.length;

    // ── 5. Top Selling Products ───────────────────────────────────────────────
    const topSellingRaw = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true, name: true,
        salesOrderLines: {
          where: { salesOrders: { status: { notIn: ['DRAFT', 'CANCELLED'] } } },
          select: { quantity: true, total: true },
        },
      },
    });

    const topSellingProducts = topSellingRaw
      .map(item => ({
        id: item.id,
        name: item.name,
        salesCount: item.salesOrderLines.reduce((s, l) => s + l.quantity, 0),
        salesTotal: item.salesOrderLines.reduce((s, l) => s + Number(l.total), 0),
      }))
      .filter(item => item.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    // ── 6. Recent Customers ───────────────────────────────────────────────────
    const customers = await db.customer.findMany({
      where: { orgId, isActive: true },
      include: {
        salesOrders: {
          where: { createdAt: { gte: startDate, lte: endDate }, status: { notIn: ['CANCELLED', 'DRAFT'] } },
          select: { subtotal: true, taxAmount: true, shippingCost: true, discount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentCustomers = customers
      .map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        totalOrders: customer.salesOrders.length,
        totalSpent: customer.salesOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // ── 7. Recent Credit Saless ────────────────────────────────────────────────
    const recentSalesOrders = activeSalesOrders.slice(0, 8).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || 'Walk-in Customer',
      total: calcOrderTotal(order),
      status: order.status,
      date: order.createdAt.toISOString(),
    }));

    // ── 8. Recent Purchase Orders ───────────────────────────────────────────────
    const recentPurchaseOrders = await db.purchaseOrder.findMany({
      where: {
        orgId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { supplier: { select: { name: true } } },
    });

    const recentPurchaseOrdersMapped = recentPurchaseOrders.map(po => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier?.name ?? po.supplierName ?? 'Unknown Supplier',
      total: calcOrderTotal(po),
      status: po.status,
      date: po.createdAt,
    }));

    // ── 9. Inventory by Location ──────────────────────────────────────────────
    const locations = await db.location.findMany({ where: { orgId, isActive: true } });

    const inventoryByLocation = await Promise.all(
      locations.map(async (location) => {
        const locationInventories = await db.inventory.findMany({
          where: { locationId: location.id, orgId, item: { isActive: true } },
          include: { item: { select: { costPrice: true, sellingPrice: true } } },
        });
        return {
          location: location.name,
          locationId: location.id,
          value: locationInventories.reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).costPrice ?? 0), 0),
          valueAtRetail: locationInventories.reduce((sum, inv) => sum + inv.quantity * Number((inv.item as any).sellingPrice ?? 0), 0),
          itemCount: locationInventories.filter(inv => inv.quantity > 0).length,
        };
      })
    );

    // ── 10. Sales by Category ──────────────────────────────────────────────────
    const categories = await db.category.findMany({
      where: { orgId },
      include: { items: { where: { isActive: true }, select: { salesTotal: true } } },
    });

    let salesByCategory = categories
      .map(category => ({
        category: category.title,
        value: category.items.reduce((sum, item) => sum + Number(item.salesTotal || 0), 0),
        percentage: 0,
      }))
      .filter(cat => cat.value > 0);

    if (salesByCategory.length === 0) {
      const categorySales = await db.category.findMany({
        where: { orgId },
        include: { items: { where: { salesCount: { gt: 0 }, isActive: true }, select: { salesTotal: true } } },
      });
      salesByCategory = categorySales
        .map(cat => ({ category: cat.title, value: cat.items.reduce((sum, item) => sum + Number(item.salesTotal || 0), 0), percentage: 0 }))
        .filter(cat => cat.value > 0);
    }

    // ── 11. Sales Timeline ─────────────────────────────────────────────────────
    const timelineMap = new Map<string, { sales: number; orders: number }>();
    const msPerDay = 86_400_000;
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + msPerDay)) {
      const key = d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short' });
      if (!timelineMap.has(key)) timelineMap.set(key, { sales: 0, orders: 0 });
    }
    for (const o of activeSalesOrders) {
      const key = new Date(o.createdAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' });
      const existing = timelineMap.get(key) ?? { sales: 0, orders: 0 };
      existing.sales += calcOrderTotal(o);
      existing.orders += 1;
      timelineMap.set(key, existing);
    }
    const salesTimeline = Array.from(timelineMap.entries())
      .map(([label, v]) => ({ label, sales: v.sales, orders: v.orders }))
      .slice(-8);

    const result = {
      inventoryValue,
      inventoryValueAtRetail,
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
      recentPurchaseOrders: recentPurchaseOrdersMapped,
      inventoryByLocation,
      salesByCategory,
      salesTimeline,
    };

    console.log('✅ Dashboard data fetched successfully');
    return result;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardDataWithFallback — now always returns real data, no fallback mock
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardDataWithFallback(dateRange: string) {
  return await getDashboardData(dateRange);
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

