import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const itemId = request.nextUrl.searchParams.get("itemId")
    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 })
    }

    // Find the inventory record with the highest quantity for this item
    const inventory = await db.inventory.findFirst({
      where: {
        itemId,
        orgId: user.orgId,
        quantity: { gt: 0 }
      },
      orderBy: { quantity: "desc" },
      include: { location: true }
    })

    if (!inventory) {
      return NextResponse.json({ location: null })
    }

    return NextResponse.json({
      location: {
        id: inventory.location.id,
        name: inventory.location.name,
      }
    })
  } catch (error) {
    console.error("Preferred location API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}