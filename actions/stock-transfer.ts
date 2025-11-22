"use server"

import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const transferStockSchema = z.object({
  itemId: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
})

export async function transferStockWithModel(input: z.infer<typeof transferStockSchema>) {
  try {
    const validatedData = transferStockSchema.parse(input)

    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const orgId = user.orgId
    if (!orgId) {
      return { success: false, error: "No organization found" }
    }

    // Create transfer in DRAFT status - DO NOT modify inventory yet
    const result = await db.$transaction(
      async (tx) => {
        // Verify source inventory exists and has sufficient stock
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId: {
              itemId: validatedData.itemId,
              locationId: validatedData.fromLocationId,
            },
          },
        })

        if (!sourceInventory) {
          throw new Error("Source inventory not found")
        }

        const availableQuantity = sourceInventory.quantity - (sourceInventory.reservedQuantity || 0)
        
        if (availableQuantity < validatedData.quantity) {
          throw new Error(`Insufficient stock. Available: ${availableQuantity}, Requested: ${validatedData.quantity}`)
        }

        // Verify target inventory exists
        const targetInventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId: {
              itemId: validatedData.itemId,
              locationId: validatedData.toLocationId,
            },
          },
        })

        if (!targetInventory) {
          throw new Error("Target location not found for this item")
        }

        // Generate transfer number
        const transferNumber = `TRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

        // Create transfer in DRAFT status - requires approval workflow
        const transfer = await tx.transfer.create({
          data: {
            transferNumber,
            date: new Date(),
            fromLocationId: validatedData.fromLocationId,
            toLocationId: validatedData.toLocationId,
            status: "DRAFT", // DRAFT status - requires approval
            notes: validatedData.notes,
            orgId,
            createdById: user.id,
            lines: {
              create: {
                itemId: validatedData.itemId,
                quantity: validatedData.quantity,
                notes: validatedData.notes,
                serialNumbers: [],
              },
            },
          },
          include: {
            lines: true,
            fromLocation: true,
            toLocation: true,
            createdBy: true,
          },
        })

        // DO NOT adjust inventory quantities here
        // Inventory will only be adjusted when transfer status becomes COMPLETED
        
        return {
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
          status: transfer.status,
        }
      },
      {
        timeout: 30000,
      },
    )

    // Revalidate all inventory and transfer pages
    revalidatePath("/dashboard/inventory/stock")
    revalidatePath("/dashboard/inventory/transfers")
    revalidatePath(`/dashboard/inventory/transfers/${result.transferId}`)
    
    return { success: true, transfer: result }
  } catch (error: any) {
    console.error("Error creating transfer:", error)

    if (error.code === "P2034") {
      return {
        success: false,
        error: "Database connection timeout. Please try again.",
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create transfer",
    }
  }
}

export async function getTransferHistory(orgId: string, itemId?: string) {
  try {
    const transfers = await db.transfer.findMany({
      where: {
        orgId,
        ...(itemId && {
          lines: {
            some: {
              itemId,
            },
          },
        }),
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
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    })

    return transfers
  } catch (error) {
    console.error("Error fetching transfer history:", error)
    return []
  }
}

export async function adjustStock(itemId: string, locationId: string, quantityChange: number, reason: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || !user.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    await db.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId: {
              itemId,
              locationId,
            },
          },
        })

        if (!inventory) {
          throw new Error("Inventory record not found")
        }

        const newQuantity = inventory.quantity + quantityChange
        if (newQuantity < 0) {
          throw new Error("Cannot adjust stock below zero")
        }

        await tx.inventory.update({
          where: {
            itemId_locationId: {
              itemId,
              locationId,
            },
          },
          data: {
            quantity: {
              increment: quantityChange,
            },
          },
        })

        const adjustmentNumber = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        await tx.adjustment.create({
          data: {
            adjustmentNumber,
            date: new Date(),
            locationId,
            adjustmentType: "CORRECTION",
            reason,
            notes: `Manual adjustment: ${quantityChange > 0 ? "Increase" : "Decrease"} by ${Math.abs(quantityChange)} units`,
            status: "COMPLETED",
            orgId: user.orgId!,
            createdById: user.id,
            lines: {
              create: {
                itemId,
                beforeQuantity: inventory.quantity,
                afterQuantity: newQuantity,
                adjsutedQuantity: quantityChange,
                notes: reason,
                serialNumbers: [],
              },
            },
          },
        })
      },
      {
        timeout: 30000,
      },
    )

    revalidatePath("/dashboard/inventory/stock")
    return { success: true, message: "Stock adjusted successfully" }
  } catch (error: any) {
    console.error("Error adjusting stock:", error)

    if (error.code === "P2034") {
      return {
        success: false,
        message: "Database connection timeout. Please try again.",
      }
    }

    return {
      success: false,
      message: error.message || "Failed to adjust stock",
    }
  }
}