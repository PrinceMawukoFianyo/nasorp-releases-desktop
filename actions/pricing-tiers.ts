// actions/pricing-tiers.ts
"use server"

import { db } from "@/prisma/db"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/config/useAuth"

export type PricingTierInput = {
  packagingUnitId:   string
  packagingUnitName: string
  unitsPerPack:      number
  wholesalePrice:    number
}

export type PricingTierRecord = {
  id:                string
  itemId:            string
  packagingUnitId:   string
  packagingUnitName: string
  unitsPerPack:      number
  wholesalePrice:    number
  pricePerUnit:      number
}

// ── Save tiers after creating a new item ─────────────────────────────────────
export async function createPricingTiersForItem(
  itemId: string,
  tiers: PricingTierInput[]
) {
  try {
    if (!tiers?.length) return { success: true }

    await db.itemPricingTier.createMany({
      data: tiers.map((t) => ({
        itemId,
        packagingUnitId: t.packagingUnitId,
        unitsPerPack:    Math.max(1, Math.round(t.unitsPerPack)),
        wholesalePrice:  t.wholesalePrice,
      })),
      skipDuplicates: true,
    })

    revalidatePath("/dashboard/inventory/items")
    return { success: true }
  } catch (error) {
    console.error("❌ createPricingTiersForItem:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to save tiers" }
  }
}

// ── UPSERT: Delete existing and create new (for edit page) ───────────────────
export async function upsertItemPricingTiers(
  itemId: string,
  tiers: PricingTierInput[]
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) return { success: false, error: "Not authenticated" }

    const item = await db.item.findUnique({
      where: { id: itemId, orgId: user.orgId },
      select: { id: true },
    })
    if (!item) return { success: false, error: "Item not found" }

    // Delete all existing tiers for this item
    await db.itemPricingTier.deleteMany({
      where: { itemId },
    })

    // Create new tiers
    if (tiers.length > 0) {
      await db.itemPricingTier.createMany({
        data: tiers.map((t) => ({
          itemId,
          packagingUnitId: t.packagingUnitId,
          unitsPerPack:    Math.max(1, Math.round(t.unitsPerPack)),
          wholesalePrice:  t.wholesalePrice,
        })),
        skipDuplicates: true,
      })
    }

    revalidatePath(`/dashboard/inventory/items/${itemId}`)
    revalidatePath("/dashboard/pos")
    revalidatePath("/pos")

    return { success: true }
  } catch (error: any) {
    console.error("❌ upsertItemPricingTiers:", error)
    return { success: false, error: error?.message ?? "Unknown error" }
  }
}

// ── Fetch all tiers for a single item ────────────────────────────────────────
export async function getPricingTiersForItem(itemId: string): Promise<PricingTierRecord[]> {
  try {
    const tiers = await db.itemPricingTier.findMany({
      where:   { itemId },
      include: { packagingUnit: { select: { name: true } } },
      orderBy: { unitsPerPack: "asc" },
    })
    return tiers.map((t) => ({
      id:                t.id,
      itemId:            t.itemId,
      packagingUnitId:   t.packagingUnitId,
      packagingUnitName: t.packagingUnit.name,
      unitsPerPack:      t.unitsPerPack,
      wholesalePrice:    t.wholesalePrice,
      pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
    }))
  } catch (error) {
    console.error("❌ getPricingTiersForItem:", error)
    return []
  }
}

// ── Alias for edit page ──────────────────────────────────────────────────────
export async function getItemPricingTiers(itemId: string) {
  try {
    const tiers = await getPricingTiersForItem(itemId)
    return { success: true, tiers }
  } catch (error: any) {
    console.error("❌ getItemPricingTiers:", error)
    return { success: false, tiers: [], error: error?.message }
  }
}

// ── Batch fetch tiers for many items (POS / sales order) ────────────────────
export async function getPricingTiersForItems(
  itemIds: string[]
): Promise<Record<string, PricingTierRecord[]>> {
  try {
    if (!itemIds.length) return {}

    const tiers = await db.itemPricingTier.findMany({
      where:   { itemId: { in: itemIds } },
      include: { packagingUnit: { select: { name: true } } },
      orderBy: { unitsPerPack: "asc" },
    })

    return tiers.reduce((acc, t) => {
      if (!acc[t.itemId]) acc[t.itemId] = []
      acc[t.itemId].push({
        id:                t.id,
        itemId:            t.itemId,
        packagingUnitId:   t.packagingUnitId,
        packagingUnitName: t.packagingUnit.name,
        unitsPerPack:      t.unitsPerPack,
        wholesalePrice:    t.wholesalePrice,
        pricePerUnit:      t.wholesalePrice / t.unitsPerPack,
      })
      return acc
    }, {} as Record<string, PricingTierRecord[]>)
  } catch (error) {
    console.error("❌ getPricingTiersForItems:", error)
    return {}
  }
}

// ── Replace all tiers for an item (edit page) ─────────────────────────────────
export async function replacePricingTiersForItem(
  itemId: string,
  tiers: PricingTierInput[]
) {
  try {
    await db.itemPricingTier.deleteMany({ where: { itemId } })
    return createPricingTiersForItem(itemId, tiers)
  } catch (error) {
    console.error("❌ replacePricingTiersForItem:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to replace tiers" }
  }
}