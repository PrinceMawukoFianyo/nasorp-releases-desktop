"use client"

import { useState } from "react"
import { X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { InventoryItem } from "@/types/inventory"

import { getInventoryItem } from "@/actions/inventory"
import { transferStockWithModel } from "@/actions/stock-transfer"

interface TransferStockModalEnhancedProps {
  item: InventoryItem
  isOpen: boolean
  onClose: () => void
  onStockTransferred?: (updatedItem: InventoryItem) => void
  onTransferError?: (error: string) => void
  orgId: string
}

export function TransferStockModalEnhanced({
  item,
  isOpen,
  onClose,
  onStockTransferred,
  onTransferError,
  orgId,
}: TransferStockModalEnhancedProps) {
  const [fromLocationId, setFromLocationId] = useState(item.locations[0]?.id || "")
  const [toLocationId, setToLocationId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transferId, setTransferId] = useState<string | null>(null)

  const fromLocation = item.locations.find((l) => l.id === fromLocationId)
  const toLocation = item.locations.find((l) => l.id === toLocationId)
  const maxTransferQuantity = Math.max(0, (fromLocation?.quantity || 0) - (fromLocation?.reserved || 0))
  const quantityNum = Number.parseInt(quantity) || 0
  const isValid =
    quantity &&
    quantityNum > 0 &&
    quantityNum <= maxTransferQuantity &&
    fromLocationId &&
    toLocationId &&
    fromLocationId !== toLocationId

  const handleTransfer = async () => {
    if (!isValid || !orgId) return

    setIsLoading(true)
    setError(null)
    setTransferId(null)

    try {
      const result = await transferStockWithModel({
        itemId: item.id,
        fromLocationId,
        toLocationId,
        quantity: quantityNum,
        notes: notes || `Transfer from ${fromLocation?.name} to ${toLocation?.name}`,
      })

      if (result.success && result.transfer) {
        setTransferId(result.transfer.transferId)

        // Refresh the item data
        const updatedItem = await getInventoryItem(item.id, orgId)
        if (updatedItem) {
          onStockTransferred?.(updatedItem)
        }

        // Close after delay to show success
        setTimeout(() => {
          handleClose()
        }, 1500)
      } else {
        setError(result.error || "Failed to transfer stock")
        onTransferError?.(result.error || "Failed to transfer stock")
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred"
      setError(errorMessage)
      onTransferError?.(errorMessage)
      console.error("Transfer error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setQuantity("")
    setToLocationId("")
    setNotes("")
    setTransferId(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Transfer Stock</h2>
            <p className="text-xs text-muted-foreground mt-1">{item.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-500">{error}</p>
            </div>
          )}

          {transferId && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-800 dark:text-green-500">Transfer Completed</p>
                <p className="text-xs text-green-700 dark:text-green-600 mt-1">Transfer ID: {transferId}</p>
              </div>
            </div>
          )}

          {/* From Location */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">From Location</label>
            <select
              value={fromLocationId}
              onChange={(e) => {
                setFromLocationId(e.target.value)
                setToLocationId("")
              }}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              disabled={isLoading}
            >
              {item.locations.map((loc) => {
                const available = Math.max(0, loc.quantity - loc.reserved)
                return (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({available} available)
                  </option>
                )
              })}
            </select>
          </div>

          {/* To Location */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">To Location</label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              disabled={isLoading}
            >
              <option value="">Select destination</option>
              {item.locations
                .filter((loc) => loc.id !== fromLocationId)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Quantity to Transfer
              <span className="font-normal text-muted-foreground ml-2">(Max: {maxTransferQuantity})</span>
            </label>
            <Input
              type="number"
              min="1"
              max={maxTransferQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="bg-secondary border-border text-base"
              disabled={isLoading || maxTransferQuantity === 0}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this transfer..."
              className="bg-secondary border-border text-sm min-h-[80px]"
              disabled={isLoading}
            />
          </div>

          {/* Info Box */}
          {maxTransferQuantity === 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800 dark:text-orange-500">
                No available stock to transfer from this location
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-3 sticky bottom-0 bg-card">
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!isValid || isLoading || !!transferId}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {transferId ? "Transferred ✓" : isLoading ? "Transferring..." : "Transfer"}
          </Button>
        </div>
      </div>
    </div>
  )
}
