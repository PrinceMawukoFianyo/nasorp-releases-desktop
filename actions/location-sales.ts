// actions/location-sales.ts
// ─────────────────────────────────────────────────────────────────────────────
// Inventory value (accounting standard):
//   stockValue         = quantity × costPrice      ← TRUE inventory asset value
//   stockValueAtRetail = quantity × sellingPrice   ← potential revenue if sold
//
// The accounting dashboard shows BOTH so users see:
//   - What stock COST to acquire  (balance sheet figure — what accountants want)
//   - What it COULD EARN if sold  (retail/potential value — what sales team wants)
//
// Admin page shows sellingPrice only (potential revenue) — that's fine for ops.
// Accounting Locations P&L shows costPrice (true asset) + retail for context.
// ─────────────────────────────────────────────────────────────────────────────

"use server"

import { db }   from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationSummary = {
  locationId:          string
  locationName:        string
  type:                string
  address?:            string | null   // location address (optional)
  totalRevenue:        number
  netRevenue:          number
  returnsValue:        number
  totalOrders:         number
  completedOrders:     number
  activeOrders:        number          // non-cancelled, non-completed
  cancelledOrders:     number
  // Both stock valuations so the UI can show either or both
  stockValue:          number          // quantity × costPrice (accounting value)
  stockValueAtRetail:  number          // quantity × sellingPrice (potential revenue)
  itemCount:           number
  subtotal:            number
  taxCollected:        number
  discounts:           number
  shippingCollected:   number          // shipping fees collected
}

export type LocationSalesResult = {
  locations:  LocationSummary[]
  grandTotal: Omit<LocationSummary, "locationId" | "locationName" | "type" | "address">
}

// Aliases used by the locations-sales-page.tsx UI component
export type LocationSalesSummary  = LocationSummary
export type AllLocationsSalesData = LocationSalesResult

// ─────────────────────────────────────────────────────────────────────────────
// getAllLocationsSalesSummary
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllLocationsSalesSummary(
  _dateRange = "30d"
): Promise<LocationSalesResult | null> {
  try {
    const user  = await getAuthenticatedUser()
    const orgId = user?.orgId
    if (!orgId) return null

    // ── 1. All locations ─────────────────────────────────────────────────────
    const locations = await db.location.findMany({
      where:   { orgId },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, type: true, address: true },
    })

    // ── 2. Inventory snapshot — compute BOTH cost and retail values ───────────
    const inventories = await db.inventory.findMany({
      where: { orgId },
      include: {
        item: {
          select: {
            costPrice:    true,
            sellingPrice: true,
            isActive:     true,
          },
        },
      },
    })

    type StockEntry = { cost: number; retail: number; itemCount: number }
    const stockByLocation = new Map<string, StockEntry>()

    for (const inv of inventories) {
      if (!inv.item.isActive) continue
      if (inv.quantity <= 0)  continue

      const costValue   = inv.quantity * Number(inv.item.costPrice    ?? 0)
      const retailValue = inv.quantity * Number(inv.item.sellingPrice ?? 0)
      const cur = stockByLocation.get(inv.locationId) ?? { cost: 0, retail: 0, itemCount: 0 }
      cur.cost      += costValue
      cur.retail    += retailValue
      cur.itemCount += 1
      stockByLocation.set(inv.locationId, cur)
    }

    // ── 3. Revenue & order stats ──────────────────────────────────────────────
    const orders = await db.salesOrder.findMany({
      where: {
        orgId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: {
        locationId:   true,
        status:       true,
        subtotal:     true,
        taxAmount:    true,
        discount:     true,
        shippingCost: true,
      },
    })

    const returns = await db.salesReturn.findMany({
      where: { orgId, status: { in: ["COMPLETED", "APPROVED"] } },
      select: { locationId: true, refundAmount: true },
    })

    type LocStats = {
      totalRevenue: number; subtotal: number; taxCollected: number
      discounts: number; shippingCollected: number
      totalOrders: number; completedOrders: number
      activeOrders: number; cancelledOrders: number
    }
    const statsByLocation = new Map<string, LocStats>()

    for (const o of orders) {
      const lid = o.locationId ?? "__none__"
      const cur = statsByLocation.get(lid) ?? {
        totalRevenue: 0, subtotal: 0, taxCollected: 0,
        discounts: 0, shippingCollected: 0,
        totalOrders: 0, completedOrders: 0, activeOrders: 0, cancelledOrders: 0,
      }
      const revenue = (
        Number(o.subtotal)          +
        Number(o.taxAmount)         +
        Number(o.shippingCost ?? 0) -
        Number(o.discount     ?? 0)
      )
      cur.totalRevenue      += revenue
      cur.subtotal          += Number(o.subtotal)
      cur.taxCollected      += Number(o.taxAmount)
      cur.discounts         += Number(o.discount      ?? 0)
      cur.shippingCollected += Number(o.shippingCost  ?? 0)
      cur.totalOrders       += 1
      if (o.status === "COMPLETED") cur.completedOrders += 1
      else cur.activeOrders += 1   // confirmed/processing but not yet completed
      statsByLocation.set(lid, cur)
    }

    const returnsByLocation = new Map<string, number>()
    for (const r of returns) {
      returnsByLocation.set(r.locationId, (returnsByLocation.get(r.locationId) ?? 0) + Number(r.refundAmount))
    }

    // ── 4. Build summaries ────────────────────────────────────────────────────
    const summaries: LocationSummary[] = locations.map(loc => {
      const stats = statsByLocation.get(loc.id) ?? {
        totalRevenue: 0, subtotal: 0, taxCollected: 0,
        discounts: 0, shippingCollected: 0,
        totalOrders: 0, completedOrders: 0, activeOrders: 0, cancelledOrders: 0,
      }
      const stock   = stockByLocation.get(loc.id)  ?? { cost: 0, retail: 0, itemCount: 0 }
      const refunds = returnsByLocation.get(loc.id) ?? 0

      return {
        locationId:          loc.id,
        locationName:        loc.name,
        type:                loc.type,
        address:             (loc as any).address ?? null,
        totalRevenue:        stats.totalRevenue,
        returnsValue:        refunds,
        netRevenue:          stats.totalRevenue - refunds,
        totalOrders:         stats.totalOrders,
        completedOrders:     stats.completedOrders,
        activeOrders:        stats.activeOrders,
        cancelledOrders:     stats.cancelledOrders,
        stockValue:          stock.cost,           // costPrice × qty (accounting)
        stockValueAtRetail:  stock.retail,          // sellingPrice × qty (potential)
        itemCount:           stock.itemCount,
        subtotal:            stats.subtotal,
        taxCollected:        stats.taxCollected,
        discounts:           stats.discounts,
        shippingCollected:   stats.shippingCollected,
      }
    })

    // ── 5. Grand totals ───────────────────────────────────────────────────────
    const grandTotal = summaries.reduce(
      (acc, s) => ({
        totalRevenue:        acc.totalRevenue        + s.totalRevenue,
        returnsValue:        acc.returnsValue        + s.returnsValue,
        netRevenue:          acc.netRevenue          + s.netRevenue,
        totalOrders:         acc.totalOrders         + s.totalOrders,
        completedOrders:     acc.completedOrders     + s.completedOrders,
        activeOrders:        acc.activeOrders        + s.activeOrders,
        cancelledOrders:     acc.cancelledOrders     + s.cancelledOrders,
        stockValue:          acc.stockValue          + s.stockValue,
        stockValueAtRetail:  acc.stockValueAtRetail  + s.stockValueAtRetail,
        itemCount:           acc.itemCount           + s.itemCount,
        subtotal:            acc.subtotal            + s.subtotal,
        taxCollected:        acc.taxCollected        + s.taxCollected,
        discounts:           acc.discounts           + s.discounts,
        shippingCollected:   acc.shippingCollected   + s.shippingCollected,
      }),
      {
        totalRevenue: 0, returnsValue: 0, netRevenue: 0,
        totalOrders: 0, completedOrders: 0, activeOrders: 0, cancelledOrders: 0,
        stockValue: 0, stockValueAtRetail: 0, itemCount: 0,
        subtotal: 0, taxCollected: 0, discounts: 0, shippingCollected: 0,
      }
    )

    return { locations: summaries, grandTotal }
  } catch (err: any) {
    console.error("[getAllLocationsSalesSummary]", err)
    return null
  }
}