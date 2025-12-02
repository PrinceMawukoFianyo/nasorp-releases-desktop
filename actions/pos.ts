// actions/pos.ts
"use server"

import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"
import { revalidatePath } from "next/cache"

interface POSLineItem {
  itemId: string
  quantity: number
  unitPrice: number
  taxRate: number
}

interface CreatePOSSaleData {
  customerId?: string
  locationId: string
  paymentMethod: "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER"
  lines: POSLineItem[]
  discount?: number
  shippingCost?: number
  notes?: string
}

/**
 * Create a POS Sale (Sales Order with POS status)
 */
export async function createPOSSale(data: CreatePOSSaleData) {
  try {
    const user = await getAuthenticatedUser()
    
    // Validate required fields
    if (!data.locationId) {
      return { 
        success: false, 
        error: "Location is required" 
      }
    }

    if (!data.lines || data.lines.length === 0) {
      return { 
        success: false, 
        error: "At least one line item is required" 
      }
    }

    // Validate location exists
    const location = await db.location.findUnique({
      where: { id: data.locationId, orgId: user.orgId },
      select: { id: true, name: true },
    })

    if (!location) {
      return { 
        success: false, 
        error: "Selected location not found" 
      }
    }

    // Validate customer exists if provided
    if (data.customerId) {
      const customer = await db.customer.findUnique({
        where: { id: data.customerId, orgId: user.orgId },
        select: { id: true, name: true },
      })

      if (!customer) {
        return { 
          success: false, 
          error: "Selected customer not found" 
        }
      }
    }

    // Validate items and check stock availability
    for (const line of data.lines) {
      const item = await db.item.findUnique({
        where: { id: line.itemId, orgId: user.orgId },
        select: { id: true, name: true, sku: true },
      })

      if (!item) {
        return { 
          success: false, 
          error: `Item "${line.itemId}" not found` 
        }
      }

      // Check stock availability
      const inventory = await db.inventory.findFirst({
        where: {
          itemId: line.itemId,
          locationId: data.locationId,
          orgId: user.orgId,
        },
        select: { quantity: true },
      })

      if (!inventory || inventory.quantity < line.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.name}. Available: ${inventory?.quantity || 0}`
        }
      }
    }

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const lineItems = data.lines.map(line => {
      const lineSubtotal = line.quantity * line.unitPrice
      const lineTax = lineSubtotal * (line.taxRate / 100)
      subtotal += lineSubtotal
      taxAmount += lineTax
      
      return {
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: lineTax,
        total: lineSubtotal + lineTax,
        serialNumbers: [],
      }
    })

    // Generate order number with POS prefix
    const orderNumber = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create sales order with POS status and completed payment
    const salesOrder = await db.salesOrder.create({
      data: {
        orderNumber,
        customerId: data.customerId || null,
        locationId: data.locationId,
        status: "COMPLETED", // POS sales are immediately completed
        paymentStatus: "PAID", // POS sales are immediately paid
        paymentMethod: data.paymentMethod,
        subtotal,
        taxAmount,
        shippingCost: data.shippingCost || 0,
        discount: data.discount || 0,
        notes: data.notes || "",
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          create: lineItems
        },
      },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    // Update inventory for each line item
    for (const line of data.lines) {
      await db.inventory.updateMany({
        where: {
          itemId: line.itemId,
          locationId: data.locationId,
          orgId: user.orgId,
        },
        data: {
          quantity: {
            decrement: line.quantity,
          },
        },
      })
    }

    // Revalidate relevant pages
    revalidatePath("/dashboard/pos")
    revalidatePath("/pos")
    revalidatePath("/dashboard/sales/orders")

    return { 
      success: true, 
      data: salesOrder,
      orderNumber: salesOrder.orderNumber,
      orderId: salesOrder.id
    }
  } catch (error: any) {
    console.error("Error creating POS sale:", error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return { success: false, error: "Order number already exists" }
    }
    
    return { success: false, error: error.message || "Failed to create POS sale" }
  }
}

/**
 * Get active items for POS with inventory
 */
export async function getPOSItems(locationId?: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const items = await db.item.findMany({
      where: {
        orgId: user.orgId,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            title: true,
          },
        },
        inventories: locationId ? {
          where: {
            locationId,
          },
          select: {
            quantity: true,
            locationId: true,
          },
        } : {
          select: {
            quantity: true,
            locationId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: items }
  } catch (error: any) {
    console.error("Error fetching POS items:", error)
    return { success: false, error: error.message || "Failed to fetch items" }
  }
}

/**
 * Get categories for POS
 */
export async function getPOSCategories() {
  try {
    const user = await getAuthenticatedUser()
    
    const categories = await db.category.findMany({
      where: {
        orgId: user.orgId,
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            items: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    })

    return { success: true, data: categories }
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return { success: false, error: error.message || "Failed to fetch categories" }
  }
}

/**
 * Get customers for POS
 */
export async function getPOSCustomers() {
  try {
    const user = await getAuthenticatedUser()
    
    const customers = await db.customer.findMany({
      where: {
        orgId: user.orgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: customers }
  } catch (error: any) {
    console.error("Error fetching customers:", error)
    return { success: false, error: error.message || "Failed to fetch customers" }
  }
}

/**
 * Get locations for POS
 */
export async function getPOSLocations() {
  try {
    const user = await getAuthenticatedUser()
    
    const locations = await db.location.findMany({
      where: {
        orgId: user.orgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: locations }
  } catch (error: any) {
    console.error("Error fetching locations:", error)
    return { success: false, error: error.message || "Failed to fetch locations" }
  }
}

/**
 * Create a quick customer (walk-in)
 */
export async function createQuickCustomer(data: {
  name: string
  email?: string
  phone?: string
}) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!data.name) {
      return { 
        success: false, 
        error: "Customer name is required" 
      }
    }

    const customer = await db.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        orgId: user.orgId,
        isActive: true,
      },
    })

    revalidatePath("/dashboard/pos")
    revalidatePath("/pos")

    return { success: true, data: customer }
  } catch (error: any) {
    console.error("Error creating customer:", error)
    return { success: false, error: error.message || "Failed to create customer" }
  }
}

/**
 * Get recent POS transactions
 */
export async function getRecentPOSTransactions(limit: number = 10) {
  try {
    const user = await getAuthenticatedUser()
    
    const transactions = await db.salesOrder.findMany({
      where: {
        orgId: user.orgId,
        orderNumber: {
          startsWith: "POS-"
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
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
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return { success: true, data: transactions }
  } catch (error: any) {
    console.error("Error fetching recent transactions:", error)
    return { success: false, error: error.message || "Failed to fetch transactions" }
  }
}