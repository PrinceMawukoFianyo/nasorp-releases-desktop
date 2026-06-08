import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const item = await db.item.findUnique({
      where: { id: params.id, orgId: user.orgId },
      select: { costPrice: true, sellingPrice: true, name: true, sku: true },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("GET /api/items/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}