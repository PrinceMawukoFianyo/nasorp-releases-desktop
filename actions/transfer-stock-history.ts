"use server"

import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const getTransfersSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
})

export async function getTransfers(filters: z.infer<typeof getTransfersSchema> = {}) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, transfers: [], error: "Not authenticated" }
    }

    const validatedFilters = getTransfersSchema.parse(filters)

    const whereClause: any = {
      orgId: user.orgId,
    }

    if (validatedFilters.status) {
      whereClause.status = validatedFilters.status
    }

    if (validatedFilters.itemId) {
      whereClause.lines = {
        some: { itemId: validatedFilters.itemId },
      }
    }

    if (validatedFilters.locationId) {
      whereClause.OR = [
        { fromLocationId: validatedFilters.locationId },
        { toLocationId: validatedFilters.locationId }
      ]
    }

    if (validatedFilters.fromDate) {
      whereClause.date = { gte: validatedFilters.fromDate }
    }
    if (validatedFilters.toDate) {
      whereClause.date = { ...whereClause.date, lte: validatedFilters.toDate }
    }

    const transfers = await db.transfer.findMany({
      where: whereClause,
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    })

    return { success: true, transfers }
  } catch (error: any) {
    console.error("Error fetching transfers:", error)
    return { success: false, transfers: [], error: error.message }
  }
}

export async function getTransferDetails(transferId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, transfer: null, error: "Not authenticated" }
    }

    const transfer = await db.transfer.findUnique({
      where: { id: transferId },
      include: {
        lines: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
        fromLocation: true,
        toLocation: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!transfer || transfer.orgId !== user.orgId) {
      return { success: false, transfer: null, error: "Transfer not found" }
    }

    return { success: true, transfer }
  } catch (error: any) {
    console.error("Error fetching transfer details:", error)
    return { success: false, transfer: null, error: error.message }
  }
}

export async function updateTransferStatus(
  transferId: string,
  newStatus: "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED",
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const transfer = await db.transfer.findUnique({
      where: { id: transferId },
      include: {
        lines: true,
      },
    })

    if (!transfer || transfer.orgId !== user.orgId) {
      return { success: false, error: "Transfer not found" }
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["APPROVED", "CANCELLED"],
      APPROVED: ["IN_TRANSIT", "CANCELLED"],
      IN_TRANSIT: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    }

    if (!validTransitions[transfer.status]?.includes(newStatus)) {
      return { 
        success: false, 
        error: `Invalid status transition from ${transfer.status} to ${newStatus}` 
      }
    }

    // Use transaction to handle inventory updates when completing transfer
    const updated = await db.$transaction(async (tx) => {
      // Update transfer status
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: newStatus,
          ...(newStatus === "APPROVED" && { approvedById: user.id }),
        },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
          fromLocation: true,
          toLocation: true,
          createdBy: true,
          approvedBy: true,
        },
      })

      // Only adjust inventory when transfer is COMPLETED
      if (newStatus === "COMPLETED") {
        for (const line of transfer.lines) {
          // Decrement from source location
          const sourceInventory = await tx.inventory.findUnique({
            where: {
              itemId_locationId: {
                itemId: line.itemId,
                locationId: transfer.fromLocationId,
              },
            },
          })

          if (!sourceInventory || sourceInventory.quantity < line.quantity) {
            throw new Error(`Insufficient stock for item ${line.itemId} at source location`)
          }

          await tx.inventory.update({
            where: {
              itemId_locationId: {
                itemId: line.itemId,
                locationId: transfer.fromLocationId,
              },
            },
            data: {
              quantity: {
                decrement: line.quantity,
              },
            },
          })

          // Increment at destination location
          await tx.inventory.update({
            where: {
              itemId_locationId: {
                itemId: line.itemId,
                locationId: transfer.toLocationId,
              },
            },
            data: {
              quantity: {
                increment: line.quantity,
              },
            },
          })

          // Create adjustment records for audit trail
          const adjustmentNumber = `TRF-${transferId}-${line.itemId}`

          // OUT adjustment for source location
          await tx.adjustment.create({
            data: {
              adjustmentNumber: `${adjustmentNumber}-OUT`,
              date: new Date(),
              locationId: transfer.fromLocationId,
              adjustmentType: "CORRECTION",
              reason: `Stock transfer to ${transfer.toLocationId}`,
              notes: `Transfer: ${transfer.transferNumber}`,
              status: "COMPLETED",
              orgId: user.orgId!,
              createdById: user.id,
              lines: {
                create: {
                  itemId: line.itemId,
                  beforeQuantity: sourceInventory.quantity,
                  afterQuantity: sourceInventory.quantity - line.quantity,
                  adjsutedQuantity: -line.quantity,
                  notes: `Transfer out via ${transfer.transferNumber}`,
                  serialNumbers: [],
                },
              },
            },
          })

          // IN adjustment for target location
          const targetInventory = await tx.inventory.findUnique({
            where: {
              itemId_locationId: {
                itemId: line.itemId,
                locationId: transfer.toLocationId,
              },
            },
          })

          if (targetInventory) {
            await tx.adjustment.create({
              data: {
                adjustmentNumber: `${adjustmentNumber}-IN`,
                date: new Date(),
                locationId: transfer.toLocationId,
                adjustmentType: "CORRECTION",
                reason: `Stock transfer from ${transfer.fromLocationId}`,
                notes: `Transfer: ${transfer.transferNumber}`,
                status: "COMPLETED",
                orgId: user.orgId!,
                createdById: user.id,
                lines: {
                  create: {
                    itemId: line.itemId,
                    beforeQuantity: targetInventory.quantity,
                    afterQuantity: targetInventory.quantity + line.quantity,
                    adjsutedQuantity: line.quantity,
                    notes: `Transfer in via ${transfer.transferNumber}`,
                    serialNumbers: [],
                  },
                },
              },
            })
          }
        }
      }

      return updatedTransfer
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard/inventory/transfers")
    revalidatePath(`/dashboard/inventory/transfers/${transferId}`)

    return { success: true, transfer: updated }
  } catch (error: any) {
    console.error("Error updating transfer status:", error)
    return { success: false, error: error.message }
  }
}

const createBulkTransferSchema = z.object({
  fromLocationId: z.string().min(1, "From location is required"),
  toLocationId: z.string().min(1, "To location is required"),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
        notes: z.string().optional(),
        serialNumbers: z.array(z.string()).optional(),
      }),
    )
    .min(1, "At least one item is required"),
  notes: z.string().optional(),
})

export async function createBulkTransfer(input: z.infer<typeof createBulkTransferSchema>) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, error: "Not authenticated", transferId: null }
    }

    const validatedInput = createBulkTransferSchema.parse(input)

    // Verify locations exist and belong to the org
    const [fromLocation, toLocation] = await Promise.all([
      db.location.findUnique({
        where: { id: validatedInput.fromLocationId },
      }),
      db.location.findUnique({
        where: { id: validatedInput.toLocationId },
      }),
    ])

    if (!fromLocation || fromLocation.orgId !== user.orgId) {
      return { success: false, error: "From location not found", transferId: null }
    }

    if (!toLocation || toLocation.orgId !== user.orgId) {
      return { success: false, error: "To location not found", transferId: null }
    }

    if (fromLocation.id === toLocation.id) {
      return { success: false, error: "From and To locations must be different", transferId: null }
    }

    // Verify all items exist and have sufficient stock
    const items = await db.item.findMany({
      where: {
        id: {
          in: validatedInput.items.map((i) => i.itemId),
        },
      },
      include: {
        inventories: {
          where: {
            locationId: validatedInput.fromLocationId,
          },
        },
      },
    })

    if (items.length !== validatedInput.items.length) {
      return { success: false, error: "One or more items not found", transferId: null }
    }

    // Check stock availability
    for (const transferItem of validatedInput.items) {
      const item = items.find(i => i.id === transferItem.itemId)
      const inventory = item?.inventories[0]
      
      if (!inventory) {
        return { 
          success: false, 
          error: `Item ${item?.name || transferItem.itemId} not available at source location`, 
          transferId: null 
        }
      }

      const availableQty = inventory.quantity - (inventory.reservedQuantity || 0)
      if (availableQty < transferItem.quantity) {
        return { 
          success: false, 
          error: `Insufficient stock for ${item?.name}. Available: ${availableQty}, Requested: ${transferItem.quantity}`, 
          transferId: null 
        }
      }
    }

    // Generate transfer number
    const transferNumber = `TR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

    // Create transfer in DRAFT status (requires approval)
    const transfer = await db.transfer.create({
      data: {
        transferNumber,
        date: new Date(),
        fromLocationId: validatedInput.fromLocationId,
        toLocationId: validatedInput.toLocationId,
        status: "DRAFT", // Start as DRAFT
        notes: validatedInput.notes,
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          createMany: {
            data: validatedInput.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              notes: item.notes || null,
              serialNumbers: item.serialNumbers || [],
            })),
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

    // Revalidate paths
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard/inventory/transfers")
    revalidatePath(`/dashboard/inventory/transfers/${transfer.id}`)

    return { success: true, transferId: transfer.id, transfer }
  } catch (error: any) {
    console.error("Error creating bulk transfer:", error)
    return { success: false, error: error.message, transferId: null }
  }
}

export async function getLocationsForTransfer() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, locations: [], error: "Not authenticated" }
    }

    const locations = await db.location.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    })

    return { success: true, locations }
  } catch (error: any) {
    return { success: false, locations: [], error: error.message }
  }
}

export async function getItemsForTransfer() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return { success: false, items: [], error: "Not authenticated" }
    }

    const items = await db.item.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        category: {
          select: {
            id: true,
            title: true,
            
          },
        },
      },
    })

    return { success: true, items }
  } catch (error: any) {
    return { success: false, items: [], error: error.message }
  }
}