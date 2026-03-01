"use server"

import { db } from "@/prisma/db"
import { revalidatePath } from "next/cache"

export type PricingTierInput = {
  packagingUnitId:   string
  packagingUnitName: string  // for display only, not stored separately
  unitsPerPack:      number  // e.g. 6 for a box of 6
  wholesalePrice:    number  // e.g. 48.00 per box
}

export type PricingTierRecord = {
  id:                string
  itemId:            string
  packagingUnitId:   string
  packagingUnitName: string  // joined from PackagingUnit.name
  unitsPerPack:      number
  wholesalePrice:    number  // price per full pack
  pricePerUnit:      number  // computed: wholesalePrice / unitsPerPack
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
        // Allow 1 for sub-tiers (e.g. Quarter of a 4-unit pack = 1 unit)
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