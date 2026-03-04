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
  notes?: string   // wholesale tier metadata JSON (tierId, tierName, packQty, etc.)
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
        // Preserve wholesale tier metadata for reporting
        notes: (line as any).notes || null,
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
 * Get items for POS with inventory.
 *
 * Behaviour:
 *  - locationId provided → return ONLY items that have stock > 0 at that
 *    location. Items that exist in other locations (or have no inventory
 *    record for this location) are NOT returned at all — they must not show
 *    as "Out of Stock"; they simply don't exist in this location's context.
 *
 *  - No locationId (All Locations view) → return every active item with its
 *    total org-wide stock so the cashier can see everything and search freely.
 */
export async function getPOSItems(locationId?: string) {
  try {
    const user = await getAuthenticatedUser()

    // ── SHARED INCLUDE SHAPE ────────────────────────────────────────────────
    const commonInclude = {
      category: {
        select: { id: true, title: true },
      },
      pricingTiers: {
        include: {
          packagingUnit: { select: { name: true } },
        },
        orderBy: { unitsPerPack: "asc" as const },
      },
    }

    // ── LOCATION-SPECIFIC: only items that have stock here ──────────────────
    if (locationId) {
      const items = await db.item.findMany({
        where: {
          orgId: user.orgId,
          isActive: true,
          // KEY FIX: only include items that have an inventory record with
          // quantity > 0 at this specific location.
          inventories: {
            some: {
              locationId,
              quantity: { gt: 0 },
            },
          },
        },
        include: {
          ...commonInclude,
          // Fetch ALL inventories for this location so we can compute stock.
          inventories: {
            where: { locationId },
            select: { quantity: true, locationId: true },
          },
        },
        orderBy: { name: "asc" },
      })

      const shapedItems = items.map((item) => {
        const locationStock = item.inventories.reduce((s, inv) => s + inv.quantity, 0)
        return {
          ...item,
          // availableStock = stock at the selected location
          availableStock: locationStock,
          // totalStock = same as availableStock when a location is selected
          totalStock: locationStock,
          pricingTiers: item.pricingTiers.map((t: any) => ({
            id:                t.id,
            itemId:            t.itemId,
            packagingUnitId:   t.packagingUnitId,
            packagingUnitName: t.packagingUnit.name,
            unitsPerPack:      t.unitsPerPack,
            wholesalePrice:    t.wholesalePrice,
            pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
          })),
        }
      })

      return { success: true, data: shapedItems }
    }

    // ── ALL LOCATIONS: every active item, org-wide stock ────────────────────
    const items = await db.item.findMany({
      where: {
        orgId: user.orgId,
        isActive: true,
      },
      include: {
        ...commonInclude,
        inventories: {
          select: { quantity: true, locationId: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const shapedItems = items.map((item) => {
      const totalStock = item.inventories.reduce((s, inv) => s + inv.quantity, 0)
      return {
        ...item,
        availableStock: totalStock,
        totalStock,
        pricingTiers: item.pricingTiers.map((t: any) => ({
          id:                t.id,
          itemId:            t.itemId,
          packagingUnitId:   t.packagingUnitId,
          packagingUnitName: t.packagingUnit.name,
          unitsPerPack:      t.unitsPerPack,
          wholesalePrice:    t.wholesalePrice,
          pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
        })),
      }
    })

    return { success: true, data: shapedItems }
  } catch (error: any) {
    console.error("Error fetching POS items:", error)
    return { success: false, error: error.message || "Failed to fetch items" }
  }
}

/**
 * Search POS items by name, SKU, or barcode.
 *
 * Respects the same location-scoping rules as getPOSItems:
 *  - locationId provided → only items with stock > 0 at that location
 *  - no locationId → all active items org-wide
 *
 * Call this from the POS search bar (debounced) instead of client-side
 * array filtering so results are always accurate and fast.
 */
export async function searchPOSItems(query: string, locationId?: string) {
  try {
    const user = await getAuthenticatedUser()

    if (!query?.trim()) {
      return getPOSItems(locationId)
    }

    const commonInclude = {
      category: {
        select: { id: true, title: true },
      },
      pricingTiers: {
        include: {
          packagingUnit: { select: { name: true } },
        },
        orderBy: { unitsPerPack: "asc" as const },
      },
    }

    const searchWhere = {
      orgId: user.orgId,
      isActive: true,
      OR: [
        { name:        { contains: query, mode: "insensitive" as const } },
        { sku:         { contains: query, mode: "insensitive" as const } },
        { barcode:     { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ],
    }

    if (locationId) {
      const items = await db.item.findMany({
        where: {
          ...searchWhere,
          inventories: {
            some: {
              locationId,
              quantity: { gt: 0 },
            },
          },
        },
        include: {
          ...commonInclude,
          inventories: {
            where: { locationId },
            select: { quantity: true, locationId: true },
          },
        },
        orderBy: { name: "asc" },
      })

      const shapedItems = items.map((item) => {
        const locationStock = item.inventories.reduce((s, inv) => s + inv.quantity, 0)
        return {
          ...item,
          availableStock: locationStock,
          totalStock: locationStock,
          pricingTiers: item.pricingTiers.map((t: any) => ({
            id:                t.id,
            itemId:            t.itemId,
            packagingUnitId:   t.packagingUnitId,
            packagingUnitName: t.packagingUnit.name,
            unitsPerPack:      t.unitsPerPack,
            wholesalePrice:    t.wholesalePrice,
            pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
          })),
        }
      })

      return { success: true, data: shapedItems }
    }

    // No location — search all active items
    const items = await db.item.findMany({
      where: searchWhere,
      include: {
        ...commonInclude,
        inventories: {
          select: { quantity: true, locationId: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const shapedItems = items.map((item) => {
      const totalStock = item.inventories.reduce((s, inv) => s + inv.quantity, 0)
      return {
        ...item,
        availableStock: totalStock,
        totalStock,
        pricingTiers: item.pricingTiers.map((t: any) => ({
          id:                t.id,
          itemId:            t.itemId,
          packagingUnitId:   t.packagingUnitId,
          packagingUnitName: t.packagingUnit.name,
          unitsPerPack:      t.unitsPerPack,
          wholesalePrice:    t.wholesalePrice,
          pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
        })),
      }
    })

    return { success: true, data: shapedItems }
  } catch (error: any) {
    console.error("Error searching POS items:", error)
    return { success: false, error: error.message || "Failed to search items" }
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
/**
 * Get summary stats for the POS page header — respects date range.
 * dateRange supports: '7d' | '30d' | 'today' | 'YYYY-MM-DD' | 'YYYY-MM-DD_YYYY-MM-DD'
 */
export async function getPOSSummaryStats(dateRange: string = '7d') {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId

    // Parse date range (mirrors dashboard getDateRange logic)
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date(now)

    if (dateRange.includes('_')) {
      const [from, to] = dateRange.split('_')
      startDate = new Date(from); startDate.setHours(0, 0, 0, 0)
      endDate = new Date(to);     endDate.setHours(23, 59, 59, 999)
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
      startDate = new Date(dateRange); startDate.setHours(0, 0, 0, 0)
      endDate   = new Date(dateRange); endDate.setHours(23, 59, 59, 999)
    } else {
      switch (dateRange) {
        case 'today': startDate.setHours(0, 0, 0, 0); break
        case '7d':    startDate.setDate(now.getDate() - 7); break
        case '30d':   startDate.setDate(now.getDate() - 30); break
        case '90d':   startDate.setDate(now.getDate() - 90); break
        default:      startDate.setDate(now.getDate() - 7)
      }
    }

    const dateFilter = { gte: startDate, lte: endDate }

    // Inventory value — not date-filtered (current snapshot)
    const [inventories, totalItems, salesOrders, purchaseOrders] = await Promise.all([
      db.inventory.findMany({
        where: { orgId },
        include: { item: { select: { costPrice: true } } },
      }),
      db.item.count({ where: { orgId, isActive: true } }),
      db.salesOrder.findMany({
        where: {
          orgId,
          createdAt: dateFilter,
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
        select: { subtotal: true, taxAmount: true, discount: true, shippingCost: true },
      }),
      db.purchaseOrder.findMany({
        where: {
          orgId,
          createdAt: dateFilter,
          status: { in: ['APPROVED', 'RECEIVED', 'COMPLETED', 'PARTIALLY_RECEIVED', 'SUBMITTED'] },
        },
        select: { subtotal: true, taxAmount: true, discount: true, shippingCost: true },
      }),
    ])

    const inventoryValue = inventories.reduce(
      (sum, inv) => sum + inv.quantity * (inv.item.costPrice || 0),
      0
    )

    const salesOrdersValue = salesOrders.reduce(
      (sum, o) => sum + o.subtotal + o.taxAmount + (o.shippingCost || 0) - (o.discount || 0),
      0
    )

    const purchaseOrdersValue = purchaseOrders.reduce(
      (sum, o) => sum + o.subtotal + o.taxAmount + (o.shippingCost || 0) - (o.discount || 0),
      0
    )

    return {
      success: true,
      data: {
        inventoryValue,
        totalItems,
        salesOrdersCount: salesOrders.length,
        salesOrdersValue,
        purchaseOrdersCount: purchaseOrders.length,
        purchaseOrdersValue,
        dateRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    }
  } catch (error: any) {
    console.error("Error fetching POS summary stats:", error)
    return { success: false, error: error.message || "Failed to fetch stats" }
  }
}