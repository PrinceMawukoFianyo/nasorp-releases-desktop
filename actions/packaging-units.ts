"use server"

// actions/packaging-units.ts
// CRUD for PackagingUnit — container types like Box, Sack, Crate etc.

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"

export type PackagingUnitCreateProps = {
  name: string
  description?: string
}

export type PackagingUnitRecord = {
  id: string
  name: string
  description: string | null
  orgId: string
  createdAt: Date
  updatedAt: Date
}

// ── Fetch all packaging units for the authenticated org ───────────────────────
export async function getOrgPackagingUnits(): Promise<PackagingUnitRecord[]> {
  try {
    const user = await getAuthenticatedUser()
    return await db.packagingUnit.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: "asc" },
    })
  } catch (error) {
    console.error("❌ getOrgPackagingUnits:", error)
    return []
  }
}

// ── Create a new packaging unit ───────────────────────────────────────────────
export async function createPackagingUnit(data: PackagingUnitCreateProps) {
  try {
    const user = await getAuthenticatedUser()

    const existing = await db.packagingUnit.findFirst({
      where: { name: data.name.trim(), orgId: user.orgId },
    })
    if (existing) {
      return { success: false, error: `A packaging unit named "${data.name}" already exists.` }
    }

    const unit = await db.packagingUnit.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        orgId: user.orgId,
      },
    })

    revalidatePath("/dashboard/inventory/packaging-units")
    revalidatePath("/dashboard/inventory/items")
    return { success: true, data: unit }
  } catch (error) {
    console.error("❌ createPackagingUnit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create" }
  }
}

// ── Update a packaging unit ───────────────────────────────────────────────────
export async function updatePackagingUnit(id: string, data: PackagingUnitCreateProps) {
  try {
    const unit = await db.packagingUnit.update({
      where: { id },
      data: { name: data.name.trim(), description: data.description?.trim() || null },
    })
    revalidatePath("/dashboard/inventory/packaging-units")
    revalidatePath("/dashboard/inventory/items")
    return { success: true, data: unit }
  } catch (error) {
    console.error("❌ updatePackagingUnit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update" }
  }
}

// ── Delete a packaging unit ───────────────────────────────────────────────────
export async function deletePackagingUnit(id: string) {
  try {
    const inUse = await db.itemPricingTier.count({ where: { packagingUnitId: id } })
    if (inUse > 0) {
      return {
        success: false,
        error: `This packaging unit is used by ${inUse} item(s). Remove it from those items first.`,
      }
    }
    await db.packagingUnit.delete({ where: { id } })
    revalidatePath("/dashboard/inventory/packaging-units")
    return { success: true }
  } catch (error) {
    console.error("❌ deletePackagingUnit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete" }
  }
}