"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialoUSeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
import { createGoodsReceipt } from "@/actions/goods-receipt"

interface ReceiveInventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrder: any
  locationId: string
}

interface ReceiveItem {
  purchaseOrderLineId: string
  itemId: string
  itemName: string
  itemSku: string
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
  receiveNow: number
  isFullyReceived: boolean
}

export function ReceiveInventoryModal({
  open,
  onOpenChange,
  purchaseOrder,
  locationId,
}: ReceiveInventoryModalProps) {
  const [items, setItems] = useState<ReceiveItem[]>([])
  const [generalNotes, setGeneralNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Initialize items when modal opens
  useEffect(() => {
    if (open && purchaseOrder?.lines) {
      const initialItems: ReceiveItem[] = purchaseOrder.lines.map((line: any) => {
        const received = line.receivedQuantity || 0
        const remaining = line.quantity - received
        
        return {
          purchaseOrderLineId: line.id,
          itemId: line.item?.id || "",
          itemName: line.item?.name || "Unknown Item",
          itemSku: line.item?.sku || "N/A",
          orderedQuantity: line.quantity || 0,
          receivedQuantity: received,
          remainingQuantity: remaining,
          receiveNow: remaining,
          isFullyReceived: received >= line.quantity,
        }
      })
      
      setItems(initialItems)
      setValidationErrors([])
      setGeneralNotes("")
    }
  }, [open, purchaseOrder])

  const updateReceiveQuantity = (lineId: string, value: number) => {
    setItems(prev => 
      prev.map(item => 
        item.purchaseOrderLineId === lineId 
          ? { 
              ...item, 
              receiveNow: Math.max(0, Math.min(value, item.remainingQuantity))
            }
          : item
      )
    )
    setValidationErrors([])
  }

  const validateReceipt = (): boolean => {
    const errors: string[] = []
    const totalReceiving = items.reduce((sum, item) => sum + item.receiveNow, 0)
    
    if (totalReceiving === 0) {
      errors.push("You must receive at least one item")
    }

    items.forEach(item => {
      if (item.receiveNow > item.remainingQuantity) {
        errors.push(`${item.itemName}: Cannot receive more than remaining quantity`)
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateReceipt()) {
      toast.error("Please fix validation errors")
      return
    }

    const deliveryLocationId = purchaseOrder.deliveryLocationId || locationId
    
    if (!deliveryLocationId) {
      toast.error("Delivery location is required")
      return
    }

    setIsSubmitting(true)

    try {
      const itemsToReceive = items
        .filter(item => item.receiveNow > 0)
        .map(item => ({
          purchaseOrderLineId: item.purchaseOrderLineId,
          itemId: item.itemId,
          receivedQuantity: item.receiveNow,
          notes: "",
        }))

      const result = await createGoodsReceipt({
        purchaseOrderId: purchaseOrder.id,
        locationId: deliveryLocationId,
        notes: generalNotes,
        items: itemsToReceive,
      })

      if (result.success) {
        toast.success("Goods received successfully!", {
          description: `Receipt Number: ${result.data?.receiptNumber}`,
        })
        onOpenChange(false)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error("Failed to receive goods", {
          description: result.error,
        })
      }
    } catch (error) {
      console.error("Error receiving goods:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasItemsToReceive = items.some(item => !item.isFullyReceived)

  if (!hasItemsToReceive) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialoUSeader>
            <DialogTitle>Receive Inventory</DialogTitle>
          </DialoUSeader>
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              All items in this purchase order have been fully received.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialoUSeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">Receive Inventory</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Purchase Order: {purchaseOrder?.poNumber}
              </p>
            </div>
            <Button
              variant="USost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialoUSeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Items Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Item</th>
                  <th className="text-center py-2 px-3 font-medium">Ordered</th>
                  <th className="text-center py-2 px-3 font-medium">Previously Received</th>
                  <th className="text-center py-2 px-3 font-medium">Receive Now</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.filter(item => !item.isFullyReceived).map((item) => (
                  <tr key={item.purchaseOrderLineId} className="hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">{item.itemSku}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">{item.orderedQuantity}</td>
                    <td className="py-2 px-3 text-center">{item.receivedQuantity}</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min="0"
                        max={item.remainingQuantity}
                        value={item.receiveNow}
                        onChange={(e) => updateReceiveQuantity(
                          item.purchaseOrderLineId,
                          parseInt(e.target.value) || 0
                        )}
                        className="w-20 text-center mx-auto"
                        disabled={isSubmitting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              placeholder="All is well. We received all of them safely"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              "Confirm Receipt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}