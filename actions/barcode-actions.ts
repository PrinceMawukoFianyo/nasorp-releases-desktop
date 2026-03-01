"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"

// ── Types ────────────────────────────────────────────────────────────────────

export type BarcodeFormat =
  | "CODE128"
  | "CODE39"
  | "EAN13"
  | "EAN8"
  | "UPC_A"
  | "QR_CODE"
  | "DATA_MATRIX"
  | "PDF417"
  | "AZTEC"
  | "CUSTOM"

export type BarcodeScanResult = {
  found: boolean
  matchedBy?: "barcode" | "sku" | "upc" | "ean" | "serial"
  item?: {
    id: string
    name: string
    sku: string
    barcode: string | null
    upc: string | null
    ean: string | null
    thumbnail: string | null
    sellingPrice: number
    costPrice: number
    category: { title: string } | null
    brand: { name: string } | null
    inventories: {
      locationId: string
      locationName: string
      quantity: number
    }[]
    serialNumbers: {
      id: string
      serialNumber: string
      status: string
      locationId: string | null
    }[]
  }
  serial?: {
    id: string
    serialNumber: string
    status: string
    item: { id: string; name: string; sku: string }
  }
  message?: string
}

export type ScanAuditLog = {
  id: string
  scannedValue: string
  format: string
  action: string
  result: "FOUND" | "NOT_FOUND" | "ASSIGNED" | "ERROR"
  itemId: string | null
  itemName: string | null
  userId: string
  userName: string
  createdAt: Date
}

export type BarcodeAssignPayload = {
  itemId: string
  barcode: string
  field: "barcode" | "upc" | "ean" | "mpn" | "isbn"
}

// ── Lookup by any barcode / code ─────────────────────────────────────────────

export async function lookupByBarcode(
  value: string
): Promise<BarcodeScanResult> {
  try {
    const user = await getAuthenticatedUser()
    const trimmed = value.trim()

    if (!trimmed) return { found: false, message: "Empty scan value" }

    // 1. Try item.barcode
    let item = await db.item.findFirst({
      where: { barcode: trimmed, orgId: user.orgId },
      include: {
        category: { select: { title: true } },
        brand:    { select: { name: true } },
        inventories: {
          include: { location: { select: { name: true } } },
        },
        serialNumbers: {
          select: { id: true, serialNumber: true, status: true, locationId: true },
          take: 20,
        },
      },
    })
    if (item) {
      return {
        found: true,
        matchedBy: "barcode",
        item: {
          ...item,
          inventories: item.inventories.map(i => ({
            locationId:   i.locationId,
            locationName: i.location.name,
            quantity:     i.quantity,
          })),
        },
      }
    }

    // 2. Try SKU
    item = await db.item.findFirst({
      where: { sku: trimmed, orgId: user.orgId },
      include: {
        category: { select: { title: true } },
        brand:    { select: { name: true } },
        inventories: { include: { location: { select: { name: true } } } },
        serialNumbers: {
          select: { id: true, serialNumber: true, status: true, locationId: true },
          take: 20,
        },
      },
    })
    if (item) {
      return {
        found: true,
        matchedBy: "sku",
        item: {
          ...item,
          inventories: item.inventories.map(i => ({
            locationId:   i.locationId,
            locationName: i.location.name,
            quantity:     i.quantity,
          })),
        },
      }
    }

    // 3. Try UPC
    item = await db.item.findFirst({
      where: { upc: trimmed, orgId: user.orgId },
      include: {
        category: { select: { title: true } },
        brand:    { select: { name: true } },
        inventories: { include: { location: { select: { name: true } } } },
        serialNumbers: {
          select: { id: true, serialNumber: true, status: true, locationId: true },
          take: 20,
        },
      },
    })
    if (item) {
      return {
        found: true,
        matchedBy: "upc",
        item: {
          ...item,
          inventories: item.inventories.map(i => ({
            locationId:   i.locationId,
            locationName: i.location.name,
            quantity:     i.quantity,
          })),
        },
      }
    }

    // 4. Try EAN
    item = await db.item.findFirst({
      where: { ean: trimmed, orgId: user.orgId },
      include: {
        category: { select: { title: true } },
        brand:    { select: { name: true } },
        inventories: { include: { location: { select: { name: true } } } },
        serialNumbers: {
          select: { id: true, serialNumber: true, status: true, locationId: true },
          take: 20,
        },
      },
    })
    if (item) {
      return {
        found: true,
        matchedBy: "ean",
        item: {
          ...item,
          inventories: item.inventories.map(i => ({
            locationId:   i.locationId,
            locationName: i.location.name,
            quantity:     i.quantity,
          })),
        },
      }
    }

    // 5. Try serial number
    const serial = await db.serialNumber.findFirst({
      where: { serialNumber: trimmed, item: { orgId: user.orgId } },
      include: {
        item: { select: { id: true, name: true, sku: true } },
      },
    })
    if (serial) {
      return {
        found: true,
        matchedBy: "serial",
        serial: {
          id:           serial.id,
          serialNumber: serial.serialNumber,
          status:       serial.status,
          item:         serial.item,
        },
      }
    }

    return { found: false, message: `No item found for "${trimmed}"` }
  } catch (error: any) {
    console.error("lookupByBarcode error:", error)
    return { found: false, message: error.message }
  }
}

// ── Assign barcode to an item ─────────────────────────────────────────────────

export async function assignBarcodeToItem(payload: BarcodeAssignPayload) {
  try {
    const user = await getAuthenticatedUser()

    // Check for collisions
    const existing = await db.item.findFirst({
      where: {
        orgId: user.orgId,
        [payload.field]: payload.barcode,
        NOT: { id: payload.itemId },
      },
    })
    if (existing) {
      return {
        success: false,
        error: `This ${payload.field.toUpperCase()} is already assigned to "${existing.name}"`,
      }
    }

    await db.item.update({
      where: { id: payload.itemId },
      data:  { [payload.field]: payload.barcode },
    })

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/inventory/barcodes")

    return { success: true }
  } catch (error: any) {
    console.error("assignBarcodeToItem error:", error)
    return { success: false, error: error.message }
  }
}

// ── Get all items needing barcodes ────────────────────────────────────────────

export async function getItemsNeedingBarcodes() {
  try {
    const user = await getAuthenticatedUser()

    const items = await db.item.findMany({
      where: {
        orgId:    user.orgId,
        isActive: true,
        OR: [{ barcode: null }, { barcode: "" }],
      },
      select: {
        id:           true,
        name:         true,
        sku:          true,
        barcode:      true,
        upc:          true,
        ean:          true,
        thumbnail:    true,
        sellingPrice: true,
        category: { select: { title: true } },
      },
      orderBy: { name: "asc" },
    })

    return { success: true, data: items }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

// ── Get all items WITH barcodes ────────────────────────────────────────────────

export async function getItemsWithBarcodes() {
  try {
    const user = await getAuthenticatedUser()

    const items = await db.item.findMany({
      where: {
        orgId:    user.orgId,
        isActive: true,
        NOT: [{ barcode: null }, { barcode: "" }],
      },
      select: {
        id:           true,
        name:         true,
        sku:          true,
        barcode:      true,
        upc:          true,
        ean:          true,
        thumbnail:    true,
        sellingPrice: true,
        category: { select: { title: true } },
        inventories: {
          select: { quantity: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return { success: true, data: items }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

// ── Bulk assign generated barcodes ────────────────────────────────────────────

export async function bulkAssignBarcodes(
  assignments: { itemId: string; barcode: string }[]
) {
  try {
    const user = await getAuthenticatedUser()

    const updates = await Promise.allSettled(
      assignments.map(({ itemId, barcode }) =>
        db.item.update({
          where: { id: itemId, orgId: user.orgId },
          data:  { barcode },
        })
      )
    )

    const succeeded = updates.filter(r => r.status === "fulfilled").length
    const failed    = updates.filter(r => r.status === "rejected").length

    revalidatePath("/dashboard/inventory/items")
    revalidatePath("/dashboard/inventory/barcodes")

    return { success: true, succeeded, failed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ── Add a serial number to an item ────────────────────────────────────────────

export async function addSerialNumber(data: {
  itemId:       string
  serialNumber: string
  locationId?:  string
  notes?:       string
}) {
  try {
    const user = await getAuthenticatedUser()

    const existing = await db.serialNumber.findUnique({
      where: { serialNumber: data.serialNumber },
    })
    if (existing) {
      return { success: false, error: "Serial number already exists in the system" }
    }

    const serial = await db.serialNumber.create({
      data: {
        serialNumber: data.serialNumber,
        itemId:       data.itemId,
        locationId:   data.locationId || null,
        notes:        data.notes      || null,
        status:       "IN_STOCK",
      },
    })

    revalidatePath("/dashboard/inventory/barcodes")
    return { success: true, data: serial }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ── Get scan audit log ────────────────────────────────────────────────────────

export async function getBarcodeScanHistory(limit = 50) {
  try {
    const user = await getAuthenticatedUser()

    // Using InventoryTransaction as a proxy for scan history
    const logs = await db.inventoryTransaction.findMany({
      where:   { orgId: user.orgId },
      include: {
        item:     { select: { name: true, sku: true } },
        location: { select: { name: true } },
        user:     { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    limit,
    })

    return { success: true, data: logs }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

// ── Get org items for barcode selector ───────────────────────────────────────

export async function getOrgItemsForBarcode() {
  try {
    const user = await getAuthenticatedUser()

    const items = await db.item.findMany({
      where:   { orgId: user.orgId, isActive: true },
      select: {
        id:           true,
        name:         true,
        sku:          true,
        barcode:      true,
        upc:          true,
        ean:          true,
        thumbnail:    true,
        sellingPrice: true,
        category: { select: { title: true } },
        inventories: {
          select: {
            quantity: true,
            location: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return { success: true, data: items }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}