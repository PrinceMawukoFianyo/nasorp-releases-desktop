"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"

const createBulkAdjustmentSchema = z.object({
  locationId: z.string().nullable().optional(),
  adjustmentType: z.enum(["STOCk_COUNT", "DAMAGE", "THEFT", "EXPIRED", "WRITE_OFF", "CORRECTION", "OTHER"]),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.string(),
      locationId: z.string().optional(),
      beforeQuantity: z.number().int().min(0),
      afterQuantity: z.number().int().min(0),
      notes: z.string().optional(),
      serialNumbers: z.array(z.string()).optional(),
    })
  ).min(1, "At least one item is required"),
})

export async function createBulkAdjustment(input: z.infer<typeof createBulkAdjustmentSchema>) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated", adjustmentId: null }

    const validatedInput = createBulkAdjustmentSchema.parse(input)

    // Validate all location IDs exist in this org
    const allLocationIds = new Set<string>()
    for (const item of validatedInput.items) {
      const locId = item.locationId || validatedInput.locationId
      if (!locId) throw new Error("Location missing for item")
      allLocationIds.add(locId)
    }
    const locations = await db.location.findMany({
      where: { id: { in: Array.from(allLocationIds) }, orgId: user.orgId }
    })
    if (locations.length !== allLocationIds.size) throw new Error("One or more locations not found")

    // ✅ FIX 1: Validate stock per item — but allow beforeQuantity=0 when there is
    //    no inventory record yet (new item at this location).
    for (const item of validatedInput.items) {
      const locId = item.locationId || validatedInput.locationId
      const inventory = await db.inventory.findFirst({
        where: { itemId: item.itemId, locationId: locId!, orgId: user.orgId }
      })
      // If no inventory record exists, current qty is 0 — that's valid
      const currentQty = inventory?.quantity ?? 0
      if (item.beforeQuantity !== currentQty) {
        // Find the item name for a friendlier error message
        const dbItem = await db.item.findUnique({ where: { id: item.itemId }, select: { name: true } })
        const loc = locations.find(l => l.id === locId)
        throw new Error(
          `Stock mismatch for "${dbItem?.name ?? item.itemId}" at ${loc?.name ?? locId}. ` +
          `Page shows ${item.beforeQuantity} but current stock is ${currentQty}. Please refresh and try again.`
        )
      }
    }

    const adjustmentNumber = `ADJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

    const isMultiLocation = validatedInput.items.some(i => i.locationId)
    const mainLocationId = isMultiLocation ? null : (validatedInput.locationId || null)

    const adjustment = await db.adjustment.create({
      data: {
        adjustmentNumber,
        date: new Date(),
        locationId: mainLocationId,
        adjustmentType: validatedInput.adjustmentType,
        reason: validatedInput.reason,
        notes: validatedInput.notes,
        status: "DRAFT",
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          createMany: {
            data: validatedInput.items.map((item) => ({
              itemId: item.itemId,
              locationId: item.locationId || null,
              beforeQuantity: item.beforeQuantity,
              afterQuantity: item.afterQuantity,
              adjsutedQuantity: item.afterQuantity - item.beforeQuantity,
              notes: item.notes || null,
              serialNumbers: item.serialNumbers || [],
            })),
          },
        },
      },
      include: { lines: true }
    })

    revalidatePath("/dashboard/inventory/adjustments")
    revalidatePath(`/dashboard/inventory/adjustments/${adjustment.id}`)
    return { success: true, adjustmentId: adjustment.id, adjustment }
  } catch (error: any) {
    console.error("Error creating bulk adjustment:", error)
    return { success: false, error: error.message, adjustmentId: null }
  }
}

export async function getLocationsForAdjustment() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, locations: [], error: "Not authenticated" }

    const locations = await db.location.findMany({
      where: { orgId: user.orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return { success: true, locations }
  } catch (error: any) {
    console.error("Error fetching locations:", error)
    return { success: false, locations: [], error: error.message }
  }
}

export async function getItemsForAdjustment(locationId?: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, items: [], error: "Not authenticated" }

    // ─── ALL LOCATIONS mode (no locationId passed) ───────────────────────────
    if (!locationId) {
      const items = await db.item.findMany({
        where: { orgId: user.orgId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          category: {
            select: {
              title: true, id: true, slug: true, imageUrl: true, description: true,
              orgId: true, parentId: true,
              parent: { select: { id: true, title: true, slug: true } },
              createdAt: true, updatedAt: true,
            },
          },
          inventories: {
            select: {
              // ✅ FIX 2: Include locationId so the frontend can match stock to location.
              //    Without this, getCurrentStockForItemAtLocation always returns 0
              //    and createBulkAdjustment throws a "stock mismatch" error.
              locationId: true,
              quantity: true,
              reservedQuantity: true,
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      })

      const safeItems = items.map((item) => ({
        ...item,
        inventories: item.inventories.map((inv) => ({
          ...inv,
          quantity: Math.max(0, inv.quantity ?? 0),
          reservedQuantity: Math.max(0, inv.reservedQuantity ?? 0),
        })),
      }))

      return { success: true, items: safeItems }
    }

    // ─── SINGLE LOCATION mode ─────────────────────────────────────────────────
    const inventories = await db.inventory.findMany({
      where: { locationId, orgId: user.orgId },
      include: {
        // ✅ FIX 3: Include the location relation so we can return its name.
        location: { select: { id: true, name: true } },
        item: {
          include: {
            category: {
              select: {
                title: true, id: true, slug: true, imageUrl: true, description: true,
                orgId: true, parentId: true,
                parent: { select: { id: true, title: true, slug: true } },
                createdAt: true, updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { item: { name: "asc" } },
    })

    // ✅ FIX 4: Return locationId + location name in the inventory object.
    //    Previously these were omitted, so the frontend could never match stock
    //    by locationId — it silently fell back to inventories[0] and showed
    //    wrong or zero stock, causing the "stock mismatch" error on submit.
    const items = inventories.map((inv) => ({
      id: inv.item.id,
      name: inv.item.name,
      sku: inv.item.sku,
      category: inv.item.category,
      inventories: [
        {
          locationId: inv.locationId,                          // ← was missing
          quantity: Math.max(0, inv.quantity ?? 0),
          reservedQuantity: Math.max(0, inv.reservedQuantity ?? 0),
          location: { id: inv.locationId, name: inv.location?.name ?? "" }, // ← was missing
        },
      ],
    }))

    return { success: true, items }
  } catch (error: any) {
    console.error("Error fetching items for adjustment:", error)
    return { success: false, items: [], error: error.message }
  }
}

export async function getAdjustments(page = 1, limit = 20, search = "") {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, adjustments: [], total: 0, error: "Not authenticated" }

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
          location: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true } },
          lines: { select: { id: true } },
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

export async function approveAdjustment(adjustmentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    const adjustment = await db.adjustment.findUnique({
      where: { id: adjustmentId },
      include: { lines: true }
    })
    if (!adjustment || adjustment.orgId !== user.orgId) return { success: false, error: "Adjustment not found" }
    if (adjustment.status !== "DRAFT") return { success: false, error: "Only draft adjustments can be approved" }

    await db.$transaction(async (tx) => {
      await tx.adjustment.update({
        where: { id: adjustmentId },
        data: { status: "APPROVED", approvedById: user.id }
      })

      for (const line of adjustment.lines) {
        const effectiveLocationId = line.locationId ?? adjustment.locationId
        if (!effectiveLocationId) throw new Error(`No location for line ${line.id}`)

        const inventory = await tx.inventory.findFirst({
          where: { itemId: line.itemId, locationId: effectiveLocationId }
        })

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: line.afterQuantity }
          })
        } else {
          await tx.inventory.create({
            data: {
              itemId: line.itemId,
              locationId: effectiveLocationId,
              quantity: line.afterQuantity,
              reservedQuantity: 0,
              orgId: user.orgId
            }
          })
        }
      }
    })

    revalidatePath("/dashboard/inventory/adjustments")
    revalidatePath(`/dashboard/inventory/adjustments/${adjustment.id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Error approving adjustment:", error)
    return { success: false, error: error.message }
  }
}

export async function cancelAdjustment(adjustmentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    const adjustment = await db.adjustment.findUnique({ where: { id: adjustmentId } })
    if (!adjustment || adjustment.orgId !== user.orgId) return { success: false, error: "Adjustment not found" }
    if (adjustment.status === "COMPLETED") return { success: false, error: "Cannot cancel completed adjustments" }

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
    if (!user?.orgId) return { success: false, adjustment: null, error: "Not authenticated" }

    const adjustment = await db.adjustment.findUnique({
      where: { id: adjustmentId, orgId: user.orgId },
      include: {
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            location: { select: { id: true, name: true } },
            item: {
              select: {
                id: true, name: true, sku: true, thumbnail: true,
                category: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!adjustment) return { success: false, adjustment: null, error: "Adjustment not found" }
    return { success: true, adjustment }
  } catch (error: any) {
    console.error("Error fetching adjustment:", error)
    return { success: false, adjustment: null, error: error.message }
  }
}