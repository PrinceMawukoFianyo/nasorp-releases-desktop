import { Location as PrismaLocation, Inventory as PrismaInventory, Item as PrismaItem, Category as PrismaCategory } from "@/generated/prisma-client"

export interface LocationStock {
  id: string
  name: string   
  quantity: number
  reserved: number
  available: number
  stockStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK"
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  totalQuantity: number
  reservedQuantity: number
  availableQuantity: number
  stockStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK"
  locations: LocationStock[]
}

export interface Item extends PrismaItem {
  category?: PrismaCategory
  inventories: (PrismaInventory & {
    location: PrismaLocation
  })[]
}

