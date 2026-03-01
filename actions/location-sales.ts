'use server';

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

function getDateRange(range: string) {
  const now = new Date();

  // Custom range: "2024-01-01_2024-01-31"
  if (range && range.includes('_')) {
    const parts = range.split('_');
    if (
      parts.length === 2 &&
      parts[0].match(/^\d{4}-\d{2}-\d{2}$/) &&
      parts[1].match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      const startDate = new Date(parts[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(parts[1]);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  }

  // Single day: "2024-01-15"
  if (range && /^\d{4}-\d{2}-\d{2}$/.test(range)) {
    const startDate = new Date(range);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(range);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Preset ranges
  const startDate = new Date();
  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '12m':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
}

export type LocationSalesSummary = {
  locationId: string;
  locationName: string;
  type: string;           // LocationType enum: WAREHOUSE | SHOP | VIRTUAL
  address: string | null;
  // Sales figures (from non-cancelled orders)
  totalRevenue: number;
  subtotal: number;
  taxCollected: number;
  discounts: number;
  shippingCollected: number;
  // Returns (from CANCELLED + RETURNED orders)
  returnsValue: number;
  // Net after returns
  netRevenue: number;
  // Order counts
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  // Inventory snapshot for this location
  stockValue: number;
  itemCount: number;
};

export type AllLocationsSalesData = {
  locations: LocationSalesSummary[];
  grandTotal: Omit<LocationSalesSummary, 'locationId' | 'locationName' | 'type' | 'address'>;
  dateRange: string;
};

export async function getAllLocationsSalesSummary(dateRange: string): Promise<AllLocationsSalesData> {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch all active locations with their inventories and direct sales orders
  const locations = await db.location.findMany({
    where: { orgId, isActive: true },
    include: {
      inventories: {
        include: {
          item: {
            select: { costPrice: true },
          },
        },
      },
      // SalesOrder has locationId -> Location via "SalesLocation" relation
      salesOrders: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          taxAmount: true,
          shippingCost: true,
          discount: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const locationSummaries: LocationSalesSummary[] = locations.map((location) => {
    // ── Inventory snapshot ────────────────────────────────────────────
    const stockValue = location.inventories.reduce(
      (sum, inv) => sum + inv.quantity * (inv.item.costPrice || 0),
      0
    );
    const itemCount = location.inventories.length;

    // ── Order buckets ─────────────────────────────────────────────────
    const allOrders = location.salesOrders;

    const returnedOrders = allOrders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'RETURNED'
    );
    const activeOrders = allOrders.filter((o) =>
      ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)
    );
    const completedOrders = allOrders.filter((o) => o.status === 'COMPLETED');
    const billedOrders = allOrders.filter(
      (o) => o.status !== 'CANCELLED' && o.status !== 'RETURNED'
    );

    // ── Financials from billable orders ───────────────────────────────
    let subtotal = 0;
    let taxCollected = 0;
    let discounts = 0;
    let shippingCollected = 0;

    for (const order of billedOrders) {
      subtotal          += order.subtotal      || 0;
      taxCollected      += order.taxAmount     || 0;
      discounts         += order.discount      || 0;
      shippingCollected += order.shippingCost  || 0;
    }

    // ── Returns value from cancelled/returned orders ──────────────────
    const returnsValue = returnedOrders.reduce(
      (sum, o) => sum + (o.subtotal || 0) + (o.taxAmount || 0),
      0
    );

    const totalRevenue = subtotal + taxCollected + shippingCollected - discounts;
    const netRevenue   = totalRevenue - returnsValue;

    return {
      locationId:        location.id,
      locationName:      location.name,
      type:              location.type as string,
      address:           location.address,
      totalRevenue,
      subtotal,
      taxCollected,
      discounts,
      shippingCollected,
      returnsValue,
      netRevenue,
      totalOrders:     allOrders.length,
      completedOrders: completedOrders.length,
      activeOrders:    activeOrders.length,
      cancelledOrders: returnedOrders.length,
      stockValue,
      itemCount,
    };
  });

  // ── Grand totals across all locations ─────────────────────────────
  const grandTotal = locationSummaries.reduce(
    (acc, loc) => ({
      totalRevenue:      acc.totalRevenue      + loc.totalRevenue,
      subtotal:          acc.subtotal          + loc.subtotal,
      taxCollected:      acc.taxCollected      + loc.taxCollected,
      discounts:         acc.discounts         + loc.discounts,
      shippingCollected: acc.shippingCollected + loc.shippingCollected,
      returnsValue:      acc.returnsValue      + loc.returnsValue,
      netRevenue:        acc.netRevenue        + loc.netRevenue,
      totalOrders:       acc.totalOrders       + loc.totalOrders,
      completedOrders:   acc.completedOrders   + loc.completedOrders,
      activeOrders:      acc.activeOrders      + loc.activeOrders,
      cancelledOrders:   acc.cancelledOrders   + loc.cancelledOrders,
      stockValue:        acc.stockValue        + loc.stockValue,
      itemCount:         acc.itemCount         + loc.itemCount,
    }),
    {
      totalRevenue: 0, subtotal: 0, taxCollected: 0, discounts: 0,
      shippingCollected: 0, returnsValue: 0, netRevenue: 0,
      totalOrders: 0, completedOrders: 0, activeOrders: 0,
      cancelledOrders: 0, stockValue: 0, itemCount: 0,
    }
  );

  return { locations: locationSummaries, grandTotal, dateRange };
}