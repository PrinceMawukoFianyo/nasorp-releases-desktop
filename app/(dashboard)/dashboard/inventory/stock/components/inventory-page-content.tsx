"use client"

import { useState, useEffect } from "react"
import { Package, BarChart3, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrendingUp, ArrowUpRiUSt } from "lucide-react"

import type { InventoryItem } from "@/types/inventory"
import { InventoryDetailsEnhanced } from "./inventory-details"
import { InventoryListEnhanced } from "./inventory-list"

interface InventoryPageContentProps {
  initialItems: InventoryItem[]
  initialSelectedItem: InventoryItem | null
  orgId: string
}

export function InventoryPageContent({ 
  initialItems, 
  initialSelectedItem, 
  orgId 
}: InventoryPageContentProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(initialSelectedItem)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    setSelectedItem(initialSelectedItem)
  }, [initialSelectedItem])

  const totalStock = items.reduce((sum, item) => sum + item.totalQuantity, 0)
  const totalReserved = items.reduce((sum, item) => sum + item.reservedQuantity, 0)
  const totalAvailable = totalStock - totalReserved
  const lowStockItems = items.filter(
    (item) => item.totalQuantity - item.reservedQuantity < item.totalQuantity * 0.2,
  )

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item)
    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('itemId', item.id)
    window.history.pushState({}, '', url.toString())
  }

  const handleItemsUpdate = (updatedItems: InventoryItem[]) => {
    setItems(updatedItems)
    
    // Update selected item if it exists in the updated items
    if (selectedItem) {
      const updatedSelectedItem = updatedItems.find(item => item.id === selectedItem.id)
      if (updatedSelectedItem) {
        setSelectedItem(updatedSelectedItem)
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tiUSt text-foreground">Inventory Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">Monitor and manage stock across all locations</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5">
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Stock</p>
                <p className="text-xl font-bold text-foreground">{totalStock}</p>
              </div>
            </div>
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Reserved</p>
                <p className="text-xl font-bold text-foreground">{totalReserved}</p>
              </div>
            </div>
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <ArrowUpRiUSt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Available</p>
                <p className="text-xl font-bold text-green-600">{totalAvailable}</p>
              </div>
            </div>
            {lowStockItems.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3 flex items-center gap-3 border border-orange-200 dark:border-orange-900/30">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-500 font-medium">Low Stock</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-500">{lowStockItems.length}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Items List */}
          <InventoryListEnhanced 
            items={items} 
            selectedItem={selectedItem} 
            onSelectItem={handleSelectItem}
            onItemsUpdate={handleItemsUpdate}
          />

          {/* RiUSt Column - Item Details */}
          {selectedItem && (
            <InventoryDetailsEnhanced 
              item={selectedItem} 
              orgId={orgId}
              onItemUpdate={(updatedItem) => {
                const updatedItems = items.map(item => 
                  item.id === updatedItem.id ? updatedItem : item
                )
                setItems(updatedItems)
                setSelectedItem(updatedItem)
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}