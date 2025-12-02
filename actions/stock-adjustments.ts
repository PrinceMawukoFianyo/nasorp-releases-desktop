"use server"

import { z } from "zod"

import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"


// Validation schemas
const createBulkAdjustmentSchema = z.object({
  locationId: z.string(),
  adjustmentType: z.enum(["STOCk_COUNT", "DAMAGE", "THEFT", "EXPIRED", "WRITE_OFF", "CORRECTION", "OTHER"]),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.string(),
      beforeQuantity: z.number().int().min(0),
      afterQuantity: z.number().int().min(0),
      notes: z.string().optional(),
      serialNumbers: z.array(z.string()).optional(),
    })
  ).min(1, "At least one item is required"),
})

// Create bulk adjustment
export async function createBulkAdjustment(input: z.infer<typeof createBulkAdjustmentSchema>) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated", adjustmentId: null }
    }

    const validatedInput = createBulkAdjustmentSchema.parse(input)

    // Verify location exists and belongs to the org
    const location = await db.location.findUnique({
      where: { id: validatedInput.locationId },
    })

    if (!location || location.orgId !== user.orgId) {
      return { success: false, error: "Location not found", adjustmentId: null }
    }

    // Verify all items exist
    const items = await db.item.findMany({
      where: {
        id: {
          in: validatedInput.items.map((i) => i.itemId),
        },
        orgId: user.orgId,
      },
      include: {
        inventories: {
          where: {
            locationId: validatedInput.locationId,
          },
        },
      },
    })

    if (items.length !== validatedInput.items.length) {
      return { success: false, error: "One or more items not found", adjustmentId: null }
    }

    // Generate adjustment number
    const adjustmentNumber = `ADJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

    // Create adjustment in DRAFT status
    const adjustment = await db.adjustment.create({
      data: {
        adjustmentNumber,
        date: new Date(),
        locationId: validatedInput.locationId,
        adjustmentType: validatedInput.adjustmentType,
        reason: validatedInput.reason,
        notes: validatedInput.notes,
        status: "DRAFT",
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          createMany: {
            data: validatedInput.items.map((item) => {
              const adjustedQuantity = item.afterQuantity - item.beforeQuantity
              return {
                itemId: item.itemId,
                beforeQuantity: item.beforeQuantity,
                afterQuantity: item.afterQuantity,
                adjsutedQuantity: adjustedQuantity,
                notes: item.notes || null,
                serialNumbers: item.serialNumbers || [],
              }
            }),
          },
        },
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/inventory/adjustments")
    revalidatePath(`/dashboard/inventory/adjustments/${adjustment.id}`)

    return { success: true, adjustmentId: adjustment.id, adjustment }
  } catch (error: any) {
    console.error("Error creating bulk adjustment:", error)
    return { success: false, error: error.message, adjustmentId: null }
  }
}

// Get locations for adjustment
export async function getLocationsForAdjustment() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, locations: [], error: "Not authenticated" }
    }

    const locations = await db.location.findMany({
      where: { orgId: user.orgId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    })

    return { success: true, locations }
  } catch (error: any) {
    console.error("Error fetching locations:", error)
    return { success: false, locations: [], error: error.message }
  }
}

// Get items for adjustment with current inventory
export async function getItemsForAdjustment(locationId?: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, items: [], error: "Not authenticated" }
    }

    const items = await db.item.findMany({
      where: { orgId: user.orgId },
      select: {
        id: true,
        name: true,
        sku: true,
        category: {
          select: {
            title: true,
            id: true,
            slug: true,
            imageUrl: true,
            description: true,
            orgId: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        },
        inventories: locationId ? {
          where: { locationId },
          select: {
            quantity: true,
            reservedQuantity: true,
          },
        } : true,
      },
      orderBy: { name: "asc" },
    })

    return { success: true, items }
  } catch (error: any) {
    console.error("Error fetching items:", error)
    return { success: false, items: [], error: error.message }
  }
}

// Get adjustments list with pagination
export async function getAdjustments(page = 1, limit = 20, search = "") {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, adjustments: [], total: 0, error: "Not authenticated" }
    }

    const skip = (page - 1) * limit

    const where = {
      orgId: user.orgId,
      ...(search && {
        OR: [
          { adjustmentNumber: { contains: search, mode: "insensitive" as const } },
          { reason: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    }

    const [adjustments, total] = await Promise.all([
      db.adjustment.findMany({
        where,
        include: {
          location: {
            select: {
              name: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              name: true,
            },
          },
          lines: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.adjustment.count({ where }),
    ])

    return { success: true, adjustments, total }
  } catch (error: any) {
    console.error("Error fetching adjustments:", error)
    return { success: false, adjustments: [], total: 0, error: error.message }
  }
}

// Approve adjustment
export async function approveAdjustment(adjustmentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const adjustment = await db.adjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        lines: true,
      },
    })

    if (!adjustment || adjustment.orgId !== user.orgId) {
      return { success: false, error: "Adjustment not found" }
    }

    if (adjustment.status !== "DRAFT") {
      return { success: false, error: "Only draft adjustments can be approved" }
    }

    // Update adjustment status and apply inventory changes
    await db.$transaction(async (tx) => {
      // Update adjustment status
      await tx.adjustment.update({
        where: { id: adjustmentId },
        data: {
          status: "APPROVED",
          approvedById: user.id,
        },
      })

      // Apply inventory changes
      for (const line of adjustment.lines) {
        const inventory = await tx.inventory.findFirst({
          where: {
            itemId: line.itemId,
            locationId: adjustment.locationId,
          },
        })

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: line.afterQuantity,
            },
          })
        } else {
          // Create inventory if it doesn't exist
          await tx.inventory.create({
            data: {
              itemId: line.itemId,
              locationId: adjustment.locationId,
              quantity: line.afterQuantity,
              reservedQuantity: 0,
              orgId: user.orgId,
            },
          })
        }
      }
    })

    revalidatePath("/dashboard/inventory/adjustments")
    revalidatePath(`/dashboard/inventory/adjustments/${adjustment.id}`)
    revalidatePath("/dashboard/inventory/adjustments/create")

    return { success: true }
  } catch (error: any) {
    console.error("Error approving adjustment:", error)
    return { success: false, error: error.message }
  }
}

// Cancel adjustment
export async function cancelAdjustment(adjustmentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const adjustment = await db.adjustment.findUnique({
      where: { id: adjustmentId },
    })

    if (!adjustment || adjustment.orgId !== user.orgId) {
      return { success: false, error: "Adjustment not found" }
    }

    if (adjustment.status === "COMPLETED") {
      return { success: false, error: "Cannot cancel completed adjustments" }
    }

    await db.adjustment.update({
      where: { id: adjustmentId },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/dashboard/inventory/adjustments")
    revalidatePath(`/dashboard/inventory/adjustments/${adjustment.id}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error cancelling adjustment:", error)
    return { success: false, error: error.message }
  }
}


export async function getAdjustmentById(adjustmentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, adjustment: null, error: "Not authenticated" }
    }

    const adjustment = await db.adjustment.findUnique({
      where: { 
        id: adjustmentId,
        orgId: user.orgId // Ensure user can only access their org's adjustments
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
        approvedBy: {
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
                category: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!adjustment) {
      return { success: false, adjustment: null, error: "Adjustment not found" }
    }

    return { success: true, adjustment }
  } catch (error: any) {
    console.error("Error fetching adjustment:", error)
    return { success: false, adjustment: null, error: error.message }
  }
}