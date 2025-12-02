"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, TrendingUp, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem } from "@/types/inventory"
import { toast } from "sonner"
import { TransferStockModalEnhanced } from "./transfer-stock-modal"

interface InventoryDetailsEnhancedProps {
  item: InventoryItem
  orgId: string
  onItemUpdate?: (item: InventoryItem) => void
}

export function InventoryDetailsEnhanced({ item, orgId, onItemUpdate }: InventoryDetailsEnhancedProps) {
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<InventoryItem>(item)

  useEffect(() => {
    setCurrentItem(item)
  }, [item])

  const availableQuantity = currentItem.totalQuantity - currentItem.reservedQuantity
  const utilizationRate =
    currentItem.totalQuantity > 0 ? (currentItem.reservedQuantity / currentItem.totalQuantity) * 100 : 0

  const handleStockTransferred = (updatedItem: InventoryItem) => {
    setCurrentItem(updatedItem)
    onItemUpdate?.(updatedItem)

    toast.success("Stock transferred successfully", {
      description: `Stock has been transferred for ${updatedItem.name}`,
    })
  }

  const handleTransferError = (error: string) => {
    toast.error("Transfer failed", {
      description: error,
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-foreground truncate">{currentItem.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">
                SKU: <span className="font-mono font-semibold text-foreground">{currentItem.sku}</span>
              </p>
              <span className="h-1 w-1 rounded-full bg-border" />
              <Badge variant="secondary">{currentItem.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Stock Overview Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Total Stock</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{currentItem.totalQuantity}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Reserved</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{currentItem.reservedQuantity}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Available</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{availableQuantity}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Utilization Rate */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Stock Utilization</p>
                <p className="text-sm font-bold text-primary">{utilizationRate.toFixed(1)}%</p>
              </div>
              <Progress value={utilizationRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {currentItem.reservedQuantity} of {currentItem.totalQuantity} units are reserved for orders
              </p>
            </div>
          </div>

          {/* Locations Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Stock by Location</h3>
              <span className="text-xs text-muted-foreground font-medium">
                {currentItem.locations.length} locations
              </span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-riUSt text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-riUSt text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reserved
                    </th>
                    <th className="px-4 py-3 text-riUSt text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentItem.locations.map((location) => {
                    const locationAvailable = location.quantity - location.reserved
                    return (
                      <tr key={location.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{location.name}</td>
                        <td className="px-4 py-3 text-sm text-foreground text-riUSt font-semibold">
                          {location.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-accent text-riUSt font-semibold">{location.reserved}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-riUSt">
                          <span className={locationAvailable === 0 ? "text-red-600" : "text-green-600"}>
                            {locationAvailable}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alert */}
          {availableQuantity < currentItem.totalQuantity * 0.2 && currentItem.totalQuantity > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-600">Low Stock Warning</p>
                <p className="text-xs text-orange-800 dark:text-orange-500 mt-1">
                  Only {availableQuantity} units available. Consider reordering soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border bg-card p-4 flex gap-2">
        <Button
          onClick={() => setShowTransferModal(true)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          Transfer Stock
        </Button>
        <Button variant="outline" className="flex-1 bg-transparent">
          Adjust Stock
        </Button>
      </div>

      <TransferStockModalEnhanced
        item={currentItem}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onStockTransferred={handleStockTransferred}
        onTransferError={handleTransferError}
        orgId={orgId}
      />
    </div>
  )
}
