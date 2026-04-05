// app/api/items/locations/route.ts
// Returns each item's primary home location based on their Inventory records.
// "Home location" = the location with the highest quantity for that item.

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/prisma/db"

export async function POST(req: NextRequest) {
  try {
    const { itemIds, orgId } = await req.json()

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    // Fetch all inventory records for these items
    const inventories = await db.inventory.findMany({
      where: {
        itemId:   { in: itemIds },
        orgId:    orgId || undefined,
        quantity: { gt: 0 },           // only locations where stock exists
      },
      select: {
        itemId:   true,
        locationId: true,
        quantity: true,
        location: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { quantity: "desc" },   // highest stock first
    })

    // For each item, pick the location with the most stock (its "home")
    const homeMap = new Map<string, { locationId: string; locationName: string }>()

    inventories.forEach(inv => {
      if (!homeMap.has(inv.itemId)) {
        // First entry for this item = highest quantity location
        homeMap.set(inv.itemId, {
          locationId:   inv.locationId,
          locationName: inv.location.name,
        })
      }
    })

    const result = Array.from(homeMap.entries()).map(([itemId, loc]) => ({
      itemId,
      locationId:   loc.locationId,
      locationName: loc.locationName,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[items/locations]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}