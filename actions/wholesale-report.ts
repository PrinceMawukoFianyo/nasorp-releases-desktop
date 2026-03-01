import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"

export type WholesaleSaleLine = {
  orderId:       string
  orderNumber:   string
  orderDate:     Date
  locationId:    string
  locationName:  string
  itemId:        string
  itemName:      string
  sku:           string

  // Sale classification
  saleMode:             "single" | "wholesale"
  tierName:             string | null   // "Box", "Half Sack" etc.
  packQuantity:         number          // number of packs bought (e.g. 2 boxes)
  unitsPerPack:         number          // units per pack (e.g. 6)
  actualUnits:          number          // total units deducted from stock

  // Prices
  wholesalePricePerPack: number   // GHS 48.00 per box
  unitPriceCharged:      number   // GHS 8.00 per unit inside box
  singleUnitPrice:       number   // GHS 10.00 — what a single unit normally costs
  savingsPerUnit:        number   // GHS 2.00 saved per unit vs buying single
  lineTotal:             number   // total charged for this line
}

export type WholesaleReport = {
  singleLines:    WholesaleSaleLine[]
  wholesaleLines: WholesaleSaleLine[]
  summary: {
    totalRevenue:       number
    wholesaleRevenue:   number
    singleRevenue:      number
    totalUnitsSold:     number
    wholesaleUnitsSold: number
    singleUnitsSold:    number
    packBreakdown: {
      tierName:  string
      packsSold: number
      unitsSold: number
      revenue:   number
    }[]
  }
}

function parseDateRange(range: string) {
  const now = new Date()
  // Custom range: "2024-01-01_2024-01-31"
  if (range?.includes("_")) {
    const [a, b] = range.split("_")
    const s = new Date(a); s.setHours(0,0,0,0)
    const e = new Date(b); e.setHours(23,59,59,999)
    return { startDate: s, endDate: e }
  }
  // Single day: "2024-01-15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(range)) {
    const s = new Date(range); s.setHours(0,0,0,0)
    const e = new Date(range); e.setHours(23,59,59,999)
    return { startDate: s, endDate: e }
  }
  const startDate = new Date()
  switch (range) {
    case "today": startDate.setHours(0,0,0,0); break
    case "7d":    startDate.setDate(now.getDate() - 7); break
    case "90d":   startDate.setDate(now.getDate() - 90); break
    case "12m":   startDate.setFullYear(now.getFullYear() - 1); break
    default:      startDate.setDate(now.getDate() - 30) // "30d"
  }
  return { startDate, endDate: now }
}

export async function getWholesaleReport(
  dateRange = "30d",
  locationId?: string
): Promise<WholesaleReport> {
  const user = await getAuthenticatedUser()
  const { startDate, endDate } = parseDateRange(dateRange)

  const orders = await db.salesOrder.findMany({
    where: {
      orgId:     user.orgId,
      createdAt: { gte: startDate, lte: endDate },
      status:    { notIn: ["CANCELLED", "RETURNED"] },
      ...(locationId ? { locationId } : {}),
    },
    include: {
      location: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, sku: true, sellingPrice: true } },
        },
      },
    },
  })

  const allLines: WholesaleSaleLine[] = []

  for (const order of orders) {
    for (const line of order.lines) {
      // Parse tier metadata from notes
      let tierName:              string | null = null
      let tierId:                string | null = null
      let packQty              = 1
      let unitsPerPack         = 1
      let wholesalePricePerPack = line.unitPrice

      try {
        if (line.notes) {
          const meta = JSON.parse(line.notes as string)
          tierName              = meta.tierName              ?? null
          tierId                = meta.tierId                ?? null
          packQty               = meta.packQty               ?? 1
          unitsPerPack          = meta.unitsPerPack          ?? 1
          wholesalePricePerPack = meta.wholesalePricePerPack ?? line.unitPrice
        }
      } catch { /* plain-text notes — treat as single */ }

      const isWholesale    = !!tierId
      const singlePrice    = line.item.sellingPrice || 0
      const unitCharged    = isWholesale ? wholesalePricePerPack / unitsPerPack : line.unitPrice
      const savingsPerUnit = isWholesale ? Math.max(0, singlePrice - unitCharged) : 0

      allLines.push({
        orderId:               order.id,
        orderNumber:           (order as any).orderNumber || order.id,
        orderDate:             order.createdAt,
        locationId:            order.location.id,
        locationName:          order.location.name,
        itemId:                line.item.id,
        itemName:              line.item.name,
        sku:                   line.item.sku,
        saleMode:              isWholesale ? "wholesale" : "single",
        tierName,
        packQuantity:          packQty,
        unitsPerPack,
        actualUnits:           line.quantity, // already = packQty × unitsPerPack
        wholesalePricePerPack,
        unitPriceCharged:      unitCharged,
        singleUnitPrice:       singlePrice,
        savingsPerUnit,
        lineTotal:             line.total,
      })
    }
  }

  const singleLines    = allLines.filter(l => l.saleMode === "single")
  const wholesaleLines = allLines.filter(l => l.saleMode === "wholesale")

  // Aggregate by pack type
  const packMap: Record<string, { packsSold: number; unitsSold: number; revenue: number }> = {}
  for (const l of wholesaleLines) {
    const key = l.tierName || "Unknown"
    if (!packMap[key]) packMap[key] = { packsSold: 0, unitsSold: 0, revenue: 0 }
    packMap[key].packsSold += l.packQuantity
    packMap[key].unitsSold += l.actualUnits
    packMap[key].revenue   += l.lineTotal
  }

  return {
    singleLines,
    wholesaleLines,
    summary: {
      totalRevenue:       allLines.reduce((s, l) => s + l.lineTotal, 0),
      wholesaleRevenue:   wholesaleLines.reduce((s, l) => s + l.lineTotal, 0),
      singleRevenue:      singleLines.reduce((s, l) => s + l.lineTotal, 0),
      totalUnitsSold:     allLines.reduce((s, l) => s + l.actualUnits, 0),
      wholesaleUnitsSold: wholesaleLines.reduce((s, l) => s + l.actualUnits, 0),
      singleUnitsSold:    singleLines.reduce((s, l) => s + l.actualUnits, 0),
      packBreakdown: Object.entries(packMap).map(([tierName, v]) => ({ tierName, ...v })),
    },
  }
}