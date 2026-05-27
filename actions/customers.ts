"use server";
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { BriefItemDTO, ItemCreateProps, ProductResponse, ProductData} from "@/types/item";
import { LocationCreateProps, LocationResponse } from "@/types/location";
import { CustomerCreateProps, CustomerResponse } from "@/types/customer";
import { LocationType } from "@prisma/client";
import axios from "axios";
import { truncate, truncateSync } from "fs";
import { revalidatePath } from "next/cache";


interface ApiResponse {
  data: ProductData | null
  success: boolean
  error?: string
}

export async function createCustomer(data: CustomerCreateProps) {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // Check for existing customer with same phone number (most common unique identifier)
    const existingCustomer = await db.customer.findFirst({
      where: {
        orgId,
        OR: [
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (existingCustomer) {
      let errorMessage = "Customer already exists";
      
      if (existingCustomer.phone === data.phone) {
        errorMessage = `Customer with phone number ${data.phone} already exists (${existingCustomer.name})`;
      } else if (data.email && existingCustomer.email === data.email) {
        errorMessage = `Customer with email ${data.email} already exists (${existingCustomer.name})`;
      }
      
      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }

    // Create the customer if no duplicates found
    const customer = await db.customer.create({
      data: {
        ...data,
        orgId
      },
    });

    // Revalidate customer-related paths
    revalidatePath("/dashboard/sales/customers");
    revalidatePath("/dashboard/sales/orders/create");
    revalidatePath("/dashboard/sales");

    return {
      success: true,
      data: customer,
      error: null,
    };
  } catch (error) {
    console.log("Error creating customer:", error);
    return {
      success: false,
      error: "Failed to create customer",
      data: null,    
    };
  }
}

export async function getOrgCustomer() {
  try {
    // FIX 2: Added missing user declaration
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 3: Changed variable name from 'res' to 'locations'
    const customer = await db.customer.findMany({
      where: {
        orgId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
         id: true,
        name: true,
        address: true,
        phone: true,
        email: true,   
        createdAt: true,
        imageUrl: true,
      },
    });
    return customer;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getBriefCustomers() {
  try {
    // FIX 2: Added missing user declaration
    const user = await getAuthenticatedUser();
    const orgId = user.orgId;
    
    // FIX 3: Changed variable name from 'res' to 'locations'
    const customers = await db.customer.findMany({
      where: {
        orgId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
         id: true,
        name: true,
        email: true,
        phone: true,
        address: true, 
        createdAt: true,
        imageUrl: true,
      },
    });
    return customers;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getCustomerById(
  id: string,
){
  try {
    const customer = await db.customer.findUniqueOrThrow({
      where:{
        id
      }
    })
    return customer;  
  } catch (error) {
    console.error("Error fetching customers:", error);
  
    throw new Error("An unexpected error occurred"); 
  }
} 

export async function updateCustomerById(id: string, data: Partial<CustomerResponse>) {
  try {
    // Transform null values to undefined for Prisma
    const prismaData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = value === null ? undefined : value;
      return acc;
    }, {} as Record<string, any>);

    const validFields = [
      'name',
      'address',
      'phone',
      'email',
      'imageUrl',
      'isActive',
    ];

    const sanitizedData = Object.entries(prismaData).reduce((acc, [key, value]) => {
      if (validFields.includes(key)) {
        acc[key] = value;
      } else {
        console.warn(`⚠️ Skipping invalid field: ${key}`);
      }
      return acc;
    }, {} as Record<string, any>);

    // Ensure type is properly cast if provided
    if (sanitizedData.type && typeof sanitizedData.type === 'string') {
      // Type is already a string matching LocationType enum
      // Prisma will validate it matches the enum
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: sanitizedData,
    });
  
    console.log("✅ Update customer successful:", id, sanitizedData);
    revalidatePath(`/dashboard/sales/customers`);
    revalidatePath(`/dashboard/sales/customers/${id}`);
    
    return { 
      success: true,
      data: updatedCustomer 
    };
  } catch (error) {
    console.error("❌ Update customer failed:", error);
    
    // Return more detailed error information
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: "An unknown error occurred"
    };
  }
}

// Also add a deleteLocation function if missing
export async function deleteCustomer(id: string) {
  try {
    const customer = await db.customer.findUnique({
      where: {
        id
      },
      include: {
        salesOrders: true,
      }
    })
    if(!customer){
      return {
      success: false,
      data: null,
      error: "No customer Found",
    };  
    }
    if(customer.salesOrders.length>0){
      return {
      success: false,
      data: null,
      error: "Customer with Sales cannot be deleted",
    };  
    }
  
    const deleted = await db.customer.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      data: deleted,
      error: null,
    };
  } catch (error) {
    console.log(error);
    return{
      success: false,
      data: null,
      error: "Customer failed to delete",
    };
  }
}

export async function getCustomerWithOrderHistory(
  customerId: string,
  options?: {
    orderStatus?: string // Filter by order status
    paymentStatus?: string // Filter by payment status
    dateFrom?: Date // Filter orders from date
    dateTo?: Date // Filter orders to date
    page?: number // Pagination for orders
    limit?: number // Orders per page
  }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { 
        success: false, 
        customer: null, 
        orders: [],
        orderStats: null,
        pagination: null,
        error: "Not authenticated" 
      }
    }

    // Default options
    const {
      orderStatus,
      paymentStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = options || {}

    const skip = (page - 1) * limit

    // Build order filter
    const orderWhere: any = {}
    
    if (orderStatus) {
      orderWhere.status = orderStatus
    }
    
    if (paymentStatus) {
      orderWhere.paymentStatus = paymentStatus
    }
    
    if (dateFrom || dateTo) {
      orderWhere.createdAt = {}
      if (dateFrom) {
        orderWhere.createdAt.gte = dateFrom
      }
      if (dateTo) {
        orderWhere.createdAt.lte = dateTo
      }
    }

    // Fetch customer basic info
    const customer = await db.customer.findUnique({
      where: {
        id: customerId,
        orgId: user.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!customer) {
      return { 
        success: false, 
        customer: null,
        orders: [],
        orderStats: null,
        pagination: null,
        error: "Customer not found" 
      }
    }

    // Fetch paginated orders with filters
    const [orders, totalOrders] = await Promise.all([
      db.salesOrder.findMany({
        where: {
          customerId,
          ...orderWhere,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lines: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  thumbnail: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.salesOrder.count({
        where: {
          customerId,
          ...orderWhere,
        },
      }),
    ])

    // Calculate overall order statistics (not filtered)
    const allOrders = await db.salesOrder.findMany({
      where: {
        customerId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
      },
    })

    // Calculate statistics
    const orderStats = {
      total: allOrders.length,
      completed: allOrders.filter((o) => o.status === "COMPLETED").length,
      pending: allOrders.filter(
        (o) =>
          o.status === "DRAFT" ||
          o.status === "CONFIRMED" ||
          o.status === "PROCESSING"
      ).length,
      shipped: allOrders.filter((o) => o.status === "SHIPPED").length,
      delivered: allOrders.filter((o) => o.status === "DELIVERED").length,
      cancelled: allOrders.filter((o) => o.status === "CANCELLED").length,
      returned: allOrders.filter((o) => o.status === "RETURNED").length,
      
      // Payment statistics
      paid: allOrders.filter((o) => o.paymentStatus === "PAID").length,
      partiallyPaid: allOrders.filter((o) => o.paymentStatus === "PARTIAL").length,
      unpaid: allOrders.filter((o) => o.paymentStatus === "PENDING").length,
      refunded: allOrders.filter((o) => o.paymentStatus === "REFUNDED").length,

      // Financial statistics
      totalRevenue: allOrders.reduce((sum, order) => {
        const orderTotal =
          order.subtotal +
          order.taxAmount +
          (order.shippingCost || 0) -
          (order.discount || 0)
        return sum + orderTotal
      }, 0),
      
      averageOrderValue: allOrders.length > 0 
        ? allOrders.reduce((sum, order) => {
            const orderTotal =
              order.subtotal +
              order.taxAmount +
              (order.shippingCost || 0) -
              (order.discount || 0)
            return sum + orderTotal
          }, 0) / allOrders.length
        : 0,

      totalDiscount: allOrders.reduce(
        (sum, order) => sum + (order.discount || 0),
        0
      ),
      
      totalTax: allOrders.reduce(
        (sum, order) => sum + order.taxAmount,
        0
      ),
    }

    // Pagination info
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      totalItems: totalOrders,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(totalOrders / limit),
      hasPreviousPage: page > 1,
    }

    return {
      success: true,
      customer,
      orders,
      orderStats,
      pagination,
    }
  } catch (error: any) {
    console.error("Error fetching customer with order history:", error)
    return {
      success: false,
      customer: null,
      orders: [],
      orderStats: null,
      pagination: null,
      error: error.message,
    }
  }
}

// Get customer order summary by date range
export async function getCustomerOrderSummary(
  customerId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, summary: null, error: "Not authenticated" }
    }

    const dateFilter: any = {}
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {}
      if (dateFrom) dateFilter.createdAt.gte = dateFrom
      if (dateTo) dateFilter.createdAt.lte = dateTo
    }

    const orders = await db.salesOrder.findMany({
      where: {
        customerId,
        customer: {
          orgId: user.orgId,
        },
        ...dateFilter,
      },
      include: {
        lines: {
          select: {
            quantity: true,
            total: true,
          },
        },
      },
    })

    const summary = {
      totalOrders: orders.length,
      totalItems: orders.reduce(
        (sum, order) =>
          sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
        0
      ),
      totalRevenue: orders.reduce((sum, order) => {
        const orderTotal =
          order.subtotal +
          order.taxAmount +
          (order.shippingCost || 0) -
          (order.discount || 0)
        return sum + orderTotal
      }, 0),
      ordersByStatus: {
        DRAFT: orders.filter((o) => o.status === "DRAFT").length,
        CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
        PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
        SHIPPED: orders.filter((o) => o.status === "SHIPPED").length,
        DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
        COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
        CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
        RETURNED: orders.filter((o) => o.status === "RETURNED").length,
      },
      ordersByPaymentStatus: {
        PENDING: orders.filter((o) => o.paymentStatus === "PENDING").length,
        PARTIAL: orders.filter((o) => o.paymentStatus === "PARTIAL").length,
        PAID: orders.filter((o) => o.paymentStatus === "PAID").length,
        REFUNDED: orders.filter((o) => o.paymentStatus === "REFUNDED").length,
      },
    }

    return { success: true, summary }
  } catch (error: any) {
    console.error("Error fetching customer order summary:", error)
    return { success: false, summary: null, error: error.message }
  }
}

// Get customer's top purchased items
export async function getCustomerTopItems(customerId: string, limit = 10) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, items: [], error: "Not authenticated" }
    }

    const orderLines = await db.salesOrderLine.findMany({
      where: {
        salesOrders: {
          customerId,
          customer: {
            orgId: user.orgId,
          },
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            thumbnail: true,
          },
        },
      },
    })

    // Group by item and calculate totals
    const itemMap = new Map()

    orderLines.forEach((line) => {
      const itemId = line.itemId
      if (itemMap.has(itemId)) {
        const existing = itemMap.get(itemId)
        itemMap.set(itemId, {
          ...existing,
          totalQuantity: existing.totalQuantity + line.quantity,
          totalRevenue: existing.totalRevenue + line.total,
          orderCount: existing.orderCount + 1,
        })
      } else {
        itemMap.set(itemId, {
          item: line.item,
          totalQuantity: line.quantity,
          totalRevenue: line.total,
          orderCount: 1,
        })
      }
    })

    // Convert to array and sort by quantity
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit)

    return { success: true, items: topItems }
  } catch (error: any) {
    console.error("Error fetching customer top items:", error)
    return { success: false, items: [], error: error.message }
  } 
}


// Update customer status (activate/deactivate)
export async function updateCustomerStatus(customerId: string, isActive: boolean) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId, orgId: user.orgId },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    await db.customer.update({
      where: { id: customerId },
      data: { isActive },
    })

    revalidatePath(`/dashboard/sales/customers/${customerId}`)
    revalidatePath("/dashboard/sales/customers")

    return { success: true }
  } catch (error: any) {
    console.error("Error updating customer status:", error)
    return { success: false, error: error.message }
  }
}

// Get all customers (for listing page)
export async function getCustomers(page = 1, limit = 20, search = "") {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, customers: [], total: 0, error: "Not authenticated" }
    }

    const skip = (page - 1) * limit

    const where = {
      orgId: user.orgId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          salesOrders: {
            select: {
              id: true,
              subtotal: true,
              taxAmount: true,
              shippingCost: true,
              discount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ])

    // Calculate total spent for each customer
    const customersWithStats = customers.map((customer) => {
      const totalSpent = customer.salesOrders.reduce((sum, order) => {
        const orderTotal = order.subtotal + order.taxAmount + (order.shippingCost || 0) - (order.discount || 0)
        return sum + orderTotal
      }, 0)

      return {
        ...customer,
        totalOrders: customer.salesOrders.length,
        totalSpent,
      }
    })

    return { success: true, customers: customersWithStats, total }
  } catch (error: any) {
    console.error("Error fetching customers:", error)
    return { success: false, customers: [], total: 0, error: error.message }
  }
}

export async function getCustomerStatement(customerId: string) {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  // Fetch all orders (excluding DRAFT – cancelled/refunded orders are shown but don't affect totals)
  const salesOrders = await db.salesOrder.findMany({
    where: { customerId, orgId, status: { not: "DRAFT" } },
    include: { payments: true },
    orderBy: { createdAt: "asc" },
  });

  // Fetch ALL manual debts (including PAID and CANCELLED) for complete history
  // ✅ REMOVED `createdBy` include – it doesn't exist in the schema
  const manualDebts = await db.manualDebt.findMany({
    where: { customerId, orgId },
    include: { payments: true },
    orderBy: { createdAt: "asc" },
  });

  const transactions: any[] = [];
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOwing = 0;

  // ---------- Credit Saless ----------
  for (const so of salesOrders) {
    const total = so.subtotal + so.taxAmount + (so.shippingCost || 0) - (so.discount || 0);
    const isCancelledOrRefunded = ["CANCELLED", "REFUNDED", "RETURNED"].includes(so.status);
    const isPaid = so.paymentStatus === "PAID";

    let amountOwing = 0;
    if (!isCancelledOrRefunded && !isPaid) {
      amountOwing = Number(so.amountOwing ?? 0) > 0
        ? Number(so.amountOwing)
        : Math.max(0, total - Number(so.amountPaid ?? 0));
    }

    // Add to totals only if the order is active (not cancelled/refunded)
    if (!isCancelledOrRefunded) {
      totalInvoiced += total;
      totalPaid += Number(so.amountPaid ?? 0);
      totalOwing += amountOwing;
    }

    // Invoice line (always shown, but with correct status)
    transactions.push({
      date: so.createdAt,
      type: "INVOICE",
      number: so.orderNumber,
      amount: total,
      status: so.paymentStatus,
      amountOwing: isCancelledOrRefunded ? 0 : amountOwing,
      orderStatus: so.status,
      invoiceLink: `/dashboard/sales/orders/${so.id}/invoice`,
      receiptLink: `/dashboard/sales/orders/${so.id}/simple-receipt`,
    });

    // Payment lines (skip voided)
    for (const p of so.payments) {
      if (p.reference?.includes("VOIDED")) continue;
      transactions.push({
        date: p.paidAt,
        type: "PAYMENT",
        number: `PMT-${p.id.slice(-8)}`,
        amount: p.amount,
        status: "PAID",
        receiptLink: `/dashboard/sales/orders/${so.id}/receipt`,
      });
    }
  }

  // ---------- Manual Debts ----------
  for (const debt of manualDebts) {
    const debtTotal = debt.amountOwing + debt.amountPaid;
    const isPaid = debt.status === "PAID";

    // Add to totals only if debt is not cancelled and not fully paid
    if (debt.status !== "CANCELLED" && !isPaid) {
      totalInvoiced += debtTotal;
      totalPaid += debt.amountPaid;
      totalOwing += debt.amountOwing;
    } else if (debt.status !== "CANCELLED" && isPaid) {
      // Fully paid debts: add to invoiced and paid, but owing is 0
      totalInvoiced += debtTotal;
      totalPaid += debt.amountPaid;
      // totalOwing unchanged (0)
    }
    // Cancelled debts: do not add to totals (just for history)

    // Manual debt creation line
    transactions.push({
      date: debt.createdAt,
      type: "MANUAL_DEBT",
      number: `DEBT-${debt.id.slice(-8)}`,
      amount: debtTotal,
      amountOwing: debt.amountOwing,
      status: debt.status,
    });

    // Payment lines – do NOT add to totals again (already accounted in debt.amountPaid)
    for (const p of debt.payments) {
      transactions.push({
        date: p.paidAt,
        type: "DEBT_PAYMENT",
        number: `DEBT-PMT-${p.id.slice(-8)}`,
        amount: p.amount,
        status: "PAID",
      });
    }
  }

  // Sort all transactions by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { transactions, totalInvoiced, totalPaid, totalOwing };
}
