"use client"

import { useState, useMemo } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem } from "@/types/inventory"

interface InventoryListEnhancedProps {
  items: InventoryItem[]
  selectedItem: InventoryItem | null
  onSelectItem: (item: InventoryItem) => void
  onItemsUpdate?: (items: InventoryItem[]) => void
}

export function InventoryListEnhanced({
  items,
  selectedItem,
  onSelectItem,
  onItemsUpdate,
}: InventoryListEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }

    const query = searchQuery.toLowerCase().trim()

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    )
  }, [items, searchQuery])

  const getStockStatusBadge = (stockStatus: string, availableQuantity: number) => {
    switch (stockStatus) {
      case "OUT_OF_STOCK":
        return {
          label: "Out of Stock",
          color: "bg-red-100 text-red-700 border-red-200",
          textColor: "text-red-700",
        }
      case "LOW_STOCK":
        return {
          label: "Low Stock",
          color: "bg-orange-100 text-orange-700 border-orange-200",
          textColor: "text-orange-700",
        }
      case "IN_STOCK":
        return {
          label: "In Stock",
          color: "bg-green-100 text-green-700 border-green-200",
          textColor: "text-green-700",
        }
      default:
        return {
          label: "Unknown",
          color: "bg-gray-100 text-gray-700 border-gray-200",
          textColor: "text-gray-700",
        }
    }
  }

  return (
    <div className="w-full md:w-96 flex flex-col border-r border-border bg-card">
      {/* Search Bar */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">All Items</h2>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {filteredItems.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-center px-4">
            <div>
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {items.length === 0 ? "No items in inventory" : "No items found"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => {
              const status = getStockStatusBadge(item.stockStatus, item.availableQuantity)
              const isSelected = selectedItem?.id === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`w-full px-4 py-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-primary/10 border-l-2 border-l-primary shadow-sm hover:bg-primary/15"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.sku}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${status.textColor}`}>{item.availableQuantity}</p>
                      <p className="text-xs text-muted-foreground">available</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
