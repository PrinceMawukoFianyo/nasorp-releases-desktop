// actions/dashboard.ts - FIXED VERSION
'use server';

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

// Helper function to calculate date range.
// Supports:
//   preset strings : 'today' | '7d' | '30d' | '90d' | '12m'
//   single date    : 'YYYY-MM-DD'
//   date range     : 'YYYY-MM-DD_YYYY-MM-DD'
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

// Main Dashboard Data Function - FIXED
export async function getDashboardData(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    const { startDate, endDate } = getDateRange(dateRange);

    console.log('🔍 Fetching dashboard data for org:', orgId, 'range:', dateRange);

    // 1. Get Inventory Value and Total Items - FIXED
    const inventories = await db.inventory.findMany({
      where: {
        orgId,
      },
      include: {
        item: true,
        location: true,
      },
    });

    const inventoryValue = inventories.reduce((sum, inv) => {
      return sum + (inv.quantity * (inv.item.costPrice || 0));
    }, 0);

    const totalItems = await db.item.count({
      where: { orgId, isActive: true },
    });

    // 2. Get Sales Orders Count and Value - FIXED
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    const salesOrdersCount = salesOrders.length;
    
    // Calculate sales value from ALL orders in the date range (exclude CANCELLED)
    const activeSalesOrders = salesOrders.filter(order => order.status !== 'CANCELLED');
    const salesOrdersValue = activeSalesOrders.reduce((sum, order) => {
      // Use lines for accurate calculation, fallback to order totals
      if (order.lines && order.lines.length > 0) {
        const orderTotal = order.lines.reduce((lineSum: number, line) => {
          return lineSum + (line.quantity * line.unitPrice);
        }, 0);
        return sum + orderTotal;
      }
      return sum + (order.subtotal + order.taxAmount - (order.discount || 0));
    }, 0);

    // Breakdown by status for the stat card subtitle (optional enrichment)
    const completedSalesCount = salesOrders.filter(o => o.status === 'COMPLETED').length;
    const pendingSalesCount = salesOrders.filter(o => ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DRAFT'].includes(o.status)).length;

    // 3. Get Purchase Orders Count and Value - ALL statuses except CANCELLED
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        // Include all active statuses - exclude only CANCELLED
        status: {
          notIn: ['CANCELLED'],
        },
      },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    const purchaseOrdersCount = purchaseOrders.length;
    const purchaseOrdersValue = purchaseOrders.reduce((sum, order) => {
      // Use lines for accurate calculation
      if (order.lines && order.lines.length > 0) {
        const orderTotal = order.lines.reduce((lineSum: number, line) => {
          return lineSum + (line.quantity * line.unitPrice);
        }, 0);
        return sum + orderTotal;
      }
      return sum + (order.subtotal + order.taxAmount - (order.discount || 0));
    }, 0);

    // 4. Get Low Stock Items - FIXED
    const lowStockInventories = await db.inventory.findMany({
      where: {
        orgId,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            minStockLevel: true,
          },
        },
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
        id: inv.id,
        name: inv.item.name,
        currentQty: inv.quantity,
        minLevel: inv.item.minStockLevel || 0,
        location: inv.location.name,
      }));

    const lowStockCount = lowStockItems.length;

    // 5. Get Top Selling Products — computed live from SalesOrderLines (excludes CANCELLED/DRAFT)
    const topSellingRaw = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        name: true,
        salesOrderLines: {
          where: {
            salesOrders: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
          },
          select: { quantity: true, total: true },
        },
      },
    });
    const topSellingProducts = topSellingRaw
      .map(item => ({
        id: item.id,
        name: item.name,
        salesCount: item.salesOrderLines.reduce((s, l) => s + l.quantity, 0),
        salesTotal: item.salesOrderLines.reduce((s, l) => s + l.total, 0),
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    console.log('📊 Top selling products found:', topSellingProducts.length);

    // 6. Get Recent Customers - FIXED
    const customers = await db.customer.findMany({
      where: {
        orgId,
        isActive: true,
      },
      include: {
        salesOrders: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            lines: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const recentCustomers = customers.map(customer => {
      const totalSpent = customer.salesOrders.reduce((sum: number, order) => {
        if (order.lines && order.lines.length > 0) {
          return order.lines.reduce((lineSum: number, line) => {
            return lineSum + (line.quantity * line.unitPrice);
          }, 0);
        }
        return sum + (order.subtotal + order.taxAmount - (order.discount || 0));
      }, 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        totalOrders: customer.salesOrders.length,
        totalSpent,
      };
    });

    // 7. Get Recent Sales Orders - FIXED
    const recentSalesOrders = salesOrders
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Walk-in Customer',
        total: order.lines?.reduce((sum: number, line) => sum + (line.quantity * line.unitPrice), 0) || 
               (order.subtotal + order.taxAmount - (order.discount || 0)),
        status: order.status,
        date: order.createdAt.toISOString(),
      }));

    // 8. Get Inventory by Location (for bar chart) - FIXED
    const locations = await db.location.findMany({
      where: {
        orgId,
        isActive: true,
      },
    });

    const inventoryByLocation = await Promise.all(
      locations.map(async (location) => {
        const locationInventories = await db.inventory.findMany({
          where: {
            locationId: location.id,
            orgId,
          },
          include: {
            item: true,
          },
        });

        const value = locationInventories.reduce((sum, inv) => {
          return sum + (inv.quantity * (inv.item.costPrice || 0));
        }, 0);

        return {
          location: location.name,
          locationId: location.id,   // ← FIX: required by DashboardMain
          value,
          itemCount: locationInventories.length,
        };
      })
    );

    // 9. Get Sales by Category (for donut chart) - SIMPLIFIED & FIXED
    const categories = await db.category.findMany({
      where: {
        orgId,
      },
      include: {
        items: {
          where: {
            isActive: true,
          },
          include: {
            // Get sales data directly from items
          },
        },
      },
    });

    // Calculate sales by category using item sales data
    const salesByCategory = categories.map(category => {
      const value = category.items.reduce((sum: number, item) => {
        return sum + (item.salesTotal || 0);
      }, 0);

      return {
        category: category.title,
        value,
        percentage: 0, // Will be calculated on frontend
      };
    }).filter(cat => cat.value > 0);

    console.log('📈 Sales by category found:', salesByCategory.length);

    // If no sales by category, create some sample data from items
    let finalSalesByCategory = salesByCategory;
    if (finalSalesByCategory.length === 0) {
      // Fallback: use categories with items that have sales
      const categorySales = await db.category.findMany({
        where: { orgId },
        include: {
          items: {
            where: {
              salesCount: { gt: 0 },
              isActive: true,
            },
          },
        },
      });

      finalSalesByCategory = categorySales.map(cat => ({
        category: cat.title,
        value: cat.items.reduce((sum: number, item) => sum + (item.salesTotal || 0), 0),
        percentage: 0,
      })).filter(cat => cat.value > 0);
    }

    const result = {
      inventoryValue,
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
    };

    console.log('✅ Dashboard data fetched successfully:', {
      inventoryValue: result.inventoryValue,
      totalItems: result.totalItems,
      salesOrders: result.salesOrdersCount,
      salesOrdersValue: result.salesOrdersValue,
      completedSales: result.completedSalesCount,
      pendingSales: result.pendingSalesCount,
      purchaseOrders: result.purchaseOrdersCount,
      purchaseOrdersValue: result.purchaseOrdersValue,
      topSelling: result.topSellingProducts.length,
      salesByCategory: result.salesByCategory.length,
    });

    return result;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

// Enhanced version with fallback
export async function getDashboardDataWithFallback(dateRange: string) {
  try {
    return await getDashboardData(dateRange);
  } catch (error) {
    console.error('Using fallback dashboard data due to error:', error);
    return getSampleDashboardData();
  }
}

// Sample data generator for fallback
function getSampleDashboardData() {
  return {
    inventoryValue: 125000,
    totalItems: 45,
    salesOrdersCount: 23,
    salesOrdersValue: 85000,
    completedSalesCount: 18,
    pendingSalesCount: 5,
    purchaseOrdersCount: 12,
    purchaseOrdersValue: 45000,
    lowStockCount: 3,
    lowStockItems: [
      {
        id: "1",
        name: "Wireless Mouse",
        currentQty: 2,
        minLevel: 10,
        location: "Main Warehouse",
      },
      {
        id: "2", 
        name: "USB-C Cable",
        currentQty: 5,
        minLevel: 15,
        location: "Store Front",
      },
    ],
    topSellingProducts: [
      {
        id: "1",
        name: "Wireless Keyboard",
        salesCount: 45,
        salesTotal: 6750,
      },
      {
        id: "2",
        name: "Monitor 24inch",
        salesCount: 32,
        salesTotal: 25600,
      },
      {
        id: "3",
        name: "Webcam HD",
        salesCount: 28,
        salesTotal: 4200,
      },
    ],
    recentCustomers: [
      {
        id: "1",
        name: "John Smith",
        email: "john@example.com",
        phone: "+1234567890",
        totalOrders: 3,
        totalSpent: 1500,
      },
      {
        id: "2",
        name: "Sarah Johnson",
        email: "sarah@example.com", 
        phone: "+1234567891",
        totalOrders: 5,
        totalSpent: 3200,
      },
    ],
    recentSalesOrders: [
      {
        id: "1",
        orderNumber: "SO-00123",
        customerName: "John Smith",
        total: 450,
        status: "COMPLETED",
        date: new Date().toISOString(),
      },
      {
        id: "2",
        orderNumber: "SO-00124", 
        customerName: "Sarah Johnson",
        total: 1200,
        status: "PROCESSING",
        date: new Date().toISOString(),
      },
    ],
    inventoryByLocation: [
      {
        location: "Main Warehouse",
        value: 85000,
        itemCount: 28,
      },
      {
        location: "Store Front", 
        value: 35000,
        itemCount: 15,
      },
    ],
    salesByCategory: [
      {
        category: "Electronics",
        value: 45000,
        percentage: 45,
      },
      {
        category: "Accessories",
        value: 25000,
        percentage: 25,
      },
      {
        category: "Office Supplies",
        value: 15000,
        percentage: 15,
      },
    ],
  };
}

// Keep all your existing functions below (getInventoryMetrics, getSalesPerformance, etc.)


// 1. Inventory Metrics - UPDATED
export async function getInventoryMetrics(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId
    const { startDate } = getDateRange(dateRange);

    // Get all inventory items with their item details
    // NOTE: No date filter here — Inventory is a current snapshot.
    // Filtering by createdAt would exclude items whose quantities were updated (not re-created).
    const inventoryItems = await db.inventory.findMany({
      where: { orgId },
      include: { item: true },
    });

    // Calculate total inventory value
    const totalValue = inventoryItems.reduce((sum: number, inventory) => {
      return sum + (inventory.quantity * (inventory.item.costPrice || 0));
    }, 0);

    // Count low stock items (based on item's minStockLevel)
    const allInventory = await db.inventory.findMany({
      where: {
        orgId,
        item: {
          minStockLevel: {
            gt: 0,
          },
        },
      },
      include: {
        location: true,
        item: {
          select: {
            minStockLevel: true,
          },
        },
      },
    });

    const lowStockCount = allInventory.filter(
      inv => inv.quantity <= (inv.item.minStockLevel || 0)
    ).length;

    // Get inventory distribution by location
    const locations = await db.location.findMany({
      where: {
        orgId, 
        isActive: true,
      },
    });

    const locationData = await Promise.all(
      locations.map(async (location) => {
        const inventories = await db.inventory.findMany({
          where: {
            locationId: location.id,
          },
          include: {
            item: true,
          },
        });

        const totalValue = inventories.reduce((sum: number, inv) => {
          return sum + (inv.quantity * (inv.item.costPrice || 0));
        }, 0);

        return {
          name: location.name,
          itemCount: inventories.length,
          totalValue,
        };
      })
    );

    // Get top selling items — live from SalesOrderLines so new stock/sales reflect immediately
    const topSellingRaw = await db.item.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        name: true,
        salesOrderLines: {
          where: { salesOrders: { status: { notIn: ['DRAFT', 'CANCELLED'] } } },
          select: { quantity: true, total: true },
        },
      },
    });
    const topSellingItems = topSellingRaw
      .map(item => ({
        id: item.id,
        name: item.name,
        salesCount: item.salesOrderLines.reduce((s, l) => s + l.quantity, 0),
        salesTotal: item.salesOrderLines.reduce((s, l) => s + l.total, 0),
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    return {
      totalValue,
      lowStockCount: lowStockCount || 0,
      locations: locationData,
      topSellingItems,
    };
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    throw new Error('Failed to fetch inventory metrics');
  }
}

// 2. Sales Performance - UPDATED
export async function getSalesPerformance(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId
    const { startDate, endDate } = getDateRange(dateRange);

    // Recent sales orders
    const recentOrders = await db.salesOrder.findMany({
      take: 10,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    const formattedOrders = recentOrders.map(order => {
      // Use lines for accurate calculation
      const totalAmount = order.lines?.reduce((sum: number, line) => sum + (line.quantity * line.unitPrice), 0) ||
                         (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Walk-in Customer',
        status: order.status,
        totalAmount,
        orderDate: order.createdAt,
      };
    });

    // Get all completed sales for revenue calculation
    const allOrders = await db.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        lines: true,
      },
    });

    const calculateRevenue = (orders: typeof allOrders) => {
      return orders.reduce((sum: number, order) => {
        const orderTotal = order.lines?.reduce((lineSum: number, line) => {
          return lineSum + (line.quantity * line.unitPrice);
        }, 0) || (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
        return sum + orderTotal;
      }, 0);
    };

    const totalRevenue = calculateRevenue(allOrders);

    // Daily revenue (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const dailyOrders = allOrders.filter(o => o.createdAt >= oneDayAgo);
    const dailyRevenue = calculateRevenue(dailyOrders);

    // Weekly revenue (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyOrders = allOrders.filter(o => o.createdAt >= oneWeekAgo);
    const weeklyRevenue = calculateRevenue(weeklyOrders);

    // Monthly revenue (last 30 days)
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const monthlyOrders = allOrders.filter(o => o.createdAt >= oneMonthAgo);
    const monthlyRevenue = calculateRevenue(monthlyOrders);

    // Calculate growth
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setTime(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    
    const previousOrders = await db.salesOrder.findMany({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
        status: 'COMPLETED',
      },
      include: {
        lines: true,
      },
    });

    const previousRevenue = calculateRevenue(previousOrders);
    const growth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Top customers
    const customers = await db.customer.findMany({
      where: {
        orgId,
        isActive: true,
      },
      include: {
        salesOrders: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: 'COMPLETED',
          },
          include: {
            lines: true,
          },
        },
      },
    });

    const topCustomersData = customers
      .map(customer => {
        const totalValue = customer.salesOrders.reduce((sum: number, order) => {
          const orderTotal = order.lines?.reduce((lineSum: number, line) => {
            return lineSum + (line.quantity * line.unitPrice);
          }, 0) || (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
          return sum + orderTotal;
        }, 0);

        return {
          id: customer.id,
          name: customer.name,
          orderCount: customer.salesOrders.length,
          totalValue,
        };
      })
      .filter(c => c.orderCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      recentOrders: formattedOrders,
      revenue: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        growth: Number(growth.toFixed(2)),
      },
      topCustomers: topCustomersData,
    };
  } catch (error) {
    console.error('Error fetching sales performance:', error);
    throw new Error('Failed to fetch sales performance');
  }
}

// 3. Purchase Orders - UPDATED
export async function getPurchaseOrders(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId
    const { startDate, endDate } = getDateRange(dateRange);

    // Recent purchase orders
    const recentOrders = await db.purchaseOrder.findMany({
      take: 10,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        orgId,
        status: {
          in: ['APPROVED', 'RECEIVED', 'COMPLETED', 'PARTIALLY_RECEIVED', 'SUBMITTED']
        },
      },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const upcomingDeliveries = await db.purchaseOrder.findMany({
        where:{
            expectedDeliveryDate:{
                gte: new Date(),
            },
            status:{
                in:["APPROVED", "PARTIALLY_RECEIVED"],
            },
            orgId,
        },
        include:{
            supplier: true,
            deliveryLocation: true,
            lines: {
              include: {
                item: true,
              },
            },
        }
    })

    const formattedOrders = recentOrders.map(order => {
      const totalAmount = order.lines?.reduce((sum: number, line) => sum + (line.quantity * line.unitPrice), 0) ||
                         (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
      return {
        id: order.id,
        orderNumber: order.poNumber,
        supplierName: order.supplier?.name || order.supplierName || 'Unknown Supplier',
        status: order.status,
        totalAmount,
        orderDate: order.date,
        expectedDeliveryDate: order.expectedDeliveryDate,
      };
    });

    // Pending approval count
    const pendingApprovalCount = await db.purchaseOrder.count({
      where: {
        status: 'PENDING',
        orgId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Supplier performance
    const suppliers = await db.supplier.findMany({
      where: {
        isActive: true,
        orgId,
      },
      include: {
        purchaseOrders: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              in: ['COMPLETED', 'RECEIVED'],
            },
          },
          include: {
            lines: true,
          },
        },
      },
    });

    const supplierPerformance = suppliers
      .map(supplier => {
        const orders = supplier.purchaseOrders;
        
        // Calculate on-time delivery
        const deliveredOrders = orders.filter(order => 
          order.expectedDeliveryDate !== null
        );
        
        const onTimeDeliveries = deliveredOrders.filter(order => {
          // If order is received, check against expected date
          // For now, we'll use a simple calculation
          return order.status === 'RECEIVED' || order.status === 'COMPLETED';
        }).length;

        const onTimePercentage = deliveredOrders.length > 0 
          ? (onTimeDeliveries / deliveredOrders.length) * 100 
          : 0;

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          orderCount: orders.length,
          onTimePercentage: Number(onTimePercentage.toFixed(1)),
        };
      })
      .filter(s => s.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    return {
      recentOrders: formattedOrders,
      pendingApprovalCount,
      supplierPerformance,
      upcomingDeliveries,
    };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw new Error('Failed to fetch purchase orders');
  }
}

// 4. Stock Movements - UPDATED
export async function getStockMovements(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId
    const { startDate, endDate } = getDateRange(dateRange);

    // Recent transfers
    const transfers = await db.transfer.findMany({
      take: 10,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        fromLocation: true,
        toLocation: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    const formattedTransfers = transfers.map(transfer => {
      const totalItems = transfer.lines.reduce((sum: number, line) => sum + line.quantity, 0);
      const itemNames = transfer.lines.map(line => line.item.name).join(', ');
      
      return {
        id: transfer.id,
        fromLocation: transfer.fromLocation.name,
        toLocation: transfer.toLocation.name,
        productName: itemNames || 'Multiple Items',
        quantity: totalItems,
        transferDate: transfer.createdAt,
        notes: transfer.notes,
      };
    });

    // Recent adjustments
    const adjustments = await db.adjustment.findMany({
      take: 10,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    const formattedAdjustments = adjustments.map(adjustment => {
      const totalQuantityChange = adjustment.lines.reduce((sum: number, line) => {
        return sum + (line.afterQuantity - line.beforeQuantity);
      }, 0);

      const totalValueChange = adjustment.lines.reduce((sum: number, line) => {
        const quantityDiff = line.afterQuantity - line.beforeQuantity;
        return sum + (quantityDiff * (line.item.costPrice || 0));
      }, 0);

      const itemNames = adjustment.lines.map(line => line.item.name).join(', ');

      return {
        id: adjustment.id,
        adjustmentType: adjustment.adjustmentType,
        productName: itemNames || 'Multiple Items',
        quantityChange: totalQuantityChange,
        valueChange: totalValueChange,
        reason: adjustment.reason,
        adjustmentDate: adjustment.createdAt,
      };
    });

    return {
      transfers: formattedTransfers,
      adjustments: formattedAdjustments,
    };
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw new Error('Failed to fetch stock movements');
  }
}

// 5. Financial Summaries - UPDATED
export async function getFinancialSummaries(dateRange: string) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId
    const { startDate, endDate } = getDateRange(dateRange);

    // Total sales value
    const salesOrders = await db.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
        orgId,
      },
      include: {
        lines: true,
      },
    });

    const totalSales = salesOrders.reduce((sum: number, order) => {
      const orderTotal = order.lines?.reduce((lineSum: number, line) => {
        return lineSum + (line.quantity * line.unitPrice);
      }, 0) || (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
      return sum + orderTotal;
    }, 0);

    // Total purchase orders value
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['APPROVED', 'RECEIVED', 'COMPLETED', 'PARTIALLY_RECEIVED'],
        },
        orgId,
      },
      include: {
        lines: true,
      },
    });

    const totalPurchases = purchaseOrders.reduce((sum: number, order) => {
      const orderTotal = order.lines?.reduce((lineSum: number, line) => {
        return lineSum + (line.quantity * line.unitPrice);
      }, 0) || (order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0));
      return sum + orderTotal;
    }, 0);

    // Gross margin calculation
    const grossProfit = totalSales - totalPurchases;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Tax liability (sum of all tax amounts from sales)
    const taxLiability = salesOrders.reduce((sum: number, order) => {
      return sum + (order.taxAmount || 0);
    }, 0);

    return {
      totalSales,
      totalPurchases,
      grossMargin: Number(grossMargin.toFixed(2)),
      taxLiability: Number(taxLiability.toFixed(2)),
    };
  } catch (error) {
    console.error('Error fetching financial summaries:', error);
    throw new Error('Failed to fetch financial summaries');
  }
}

// BONUS: Export helper functions for Excel export
export async function exportInventoryToExcel(dateRange: string) {
  const data = await getInventoryMetrics(dateRange);
  return data;
}

export async function exportSalesPerformanceToExcel(dateRange: string) {
  const data = await getSalesPerformance(dateRange);
  return data;
}

export async function exportPurchaseOrdersToExcel(dateRange: string) {
  const data = await getPurchaseOrders(dateRange);
  return data;
}

export async function exportStockMovementsToExcel(dateRange: string) {
  const data = await getStockMovements(dateRange);
  return data;
}

export async function exportFinancialSummaryToExcel(dateRange: string) {
  const data = await getFinancialSummaries(dateRange);
  return data;
}