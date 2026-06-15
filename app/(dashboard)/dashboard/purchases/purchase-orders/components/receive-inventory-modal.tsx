"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"            // <-- ADD THIS
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, X, MapPin, Loader2, AlertTriangle } from "lucide-react"
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
  autoLocationId: string
  autoLocationName: string
  hasAutoLocation: boolean
}

async function fetchItemLocations(itemIds: string[], orgId: string): Promise<Map<string, { locationId: string; locationName: string }>> {
  const map = new Map()
  try {
    const res = await fetch("/api/items/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds, orgId }),
    })
    if (res.ok) {
      const data: { itemId: string; locationId: string; locationName: string }[] = await res.json()
      data.forEach(({ itemId, locationId, locationName }) => map.set(itemId, { locationId, locationName }))
    }
  } catch (e) { console.error("fetchItemLocations error:", e) }
  return map
}

export function ReceiveInventoryModal({ open, onOpenChange, purchaseOrder, locationId }: ReceiveInventoryModalProps) {
  const router = useRouter()                               // <-- ADD THIS
  const [items, setItems] = useState<ReceiveItem[]>([])
  const [generalNotes, setGeneralNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [useAutoLocation, setUseAutoLocation] = useState(true)

  useEffect(() => {
    if (!open || !purchaseOrder?.lines) return
    const baseItems: ReceiveItem[] = purchaseOrder.lines.map((line: any) => {
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
        autoLocationId: "",
        autoLocationName: "",
        hasAutoLocation: false,
      }
    })
    setItems(baseItems)
    setValidationErrors([])
    setGeneralNotes("")

    const itemIds = baseItems.map(i => i.itemId).filter(Boolean)
    if (itemIds.length === 0) return
    setIsLoadingLocations(true)
    fetchItemLocations(itemIds, purchaseOrder.orgId || "")
      .then(locationMap => {
        setItems(prev => prev.map(item => {
          const loc = locationMap.get(item.itemId)
          return loc ? { ...item, autoLocationId: loc.locationId, autoLocationName: loc.locationName, hasAutoLocation: true } : item
        }))
      })
      .finally(() => setIsLoadingLocations(false))
  }, [open, purchaseOrder])

  const updateReceiveQuantity = (lineId: string, value: number) => {
    setItems(prev => prev.map(item => item.purchaseOrderLineId === lineId ? { ...item, receiveNow: Math.max(0, Math.min(value, item.remainingQuantity)) } : item))
    setValidationErrors([])
  }

  const getEffectiveLocationId = (item: ReceiveItem): string => {
    if (useAutoLocation && item.hasAutoLocation) return item.autoLocationId
    return purchaseOrder.deliveryLocationId || locationId
  }
  const getEffectiveLocationName = (item: ReceiveItem): string => {
    if (useAutoLocation && item.hasAutoLocation) return item.autoLocationName
    return "PO Delivery Location"
  }

  const validateReceipt = (): boolean => {
    const errors: string[] = []
    const totalReceiving = items.reduce((sum, item) => sum + item.receiveNow, 0)
    if (totalReceiving === 0) errors.push("You must receive at least one item")
    items.forEach(item => {
      if (item.receiveNow > item.remainingQuantity) errors.push(`${item.itemName}: Cannot receive more than remaining quantity`)
    })
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateReceipt()) {
      toast.error("Please fix validation errors")
      return
    }
    setIsSubmitting(true)
    try {
      const itemsToReceive = items.filter(item => item.receiveNow > 0 && !item.isFullyReceived)

      if (useAutoLocation) {
        const groups = new Map<string, typeof itemsToReceive>()
        itemsToReceive.forEach(item => {
          const locId = getEffectiveLocationId(item)
          if (!groups.has(locId)) groups.set(locId, [])
          groups.get(locId)!.push(item)
        })
        const results = await Promise.all(
          Array.from(groups.entries()).map(([locId, locItems]) =>
            createGoodsReceipt({
              purchaseOrderId: purchaseOrder.id,
              locationId: locId,
              notes: generalNotes,
              items: locItems.map(item => ({
                purchaseOrderLineId: item.purchaseOrderLineId,
                itemId: item.itemId,
                receivedQuantity: item.receiveNow,
                notes: "",
              })),
            })
          )
        )
        const failed = results.filter(r => !r.success)
        if (failed.length > 0) {
          toast.error("Some receipts failed", { description: failed.map(f => f.error).join(", ") })
        } else {
          toast.success("Goods received successfully!", { description: groups.size > 1 ? `Stock dispersed to ${groups.size} locations` : `Receipt: ${results[0].data?.receiptNumber}` })
          onOpenChange(false)
          router.refresh()   // <-- REPLACES window.location.reload()
        }
      } else {
        const deliveryLocationId = purchaseOrder.deliveryLocationId || locationId
        if (!deliveryLocationId) {
          toast.error("Delivery location is required")
          return
        }
        const result = await createGoodsReceipt({
          purchaseOrderId: purchaseOrder.id,
          locationId: deliveryLocationId,
          notes: generalNotes,
          items: itemsToReceive.map(item => ({
            purchaseOrderLineId: item.purchaseOrderLineId,
            itemId: item.itemId,
            receivedQuantity: item.receiveNow,
            notes: "",
          })),
        })
        if (result.success) {
          toast.success("Goods received successfully!", { description: `Receipt Number: ${result.data?.receiptNumber}` })
          onOpenChange(false)
          router.refresh()   // <-- REPLACES window.location.reload()
        } else {
          toast.error("Failed to receive goods", { description: result.error })
        }
      }
    } catch (error) {
      console.error("Error receiving goods:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasItemsToReceive = items.some(item => !item.isFullyReceived)
  const pendingItems = items.filter(item => !item.isFullyReceived)
  const itemsWithNoLocation = pendingItems.filter(i => !i.hasAutoLocation && useAutoLocation)

  if (!hasItemsToReceive) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Receive Inventory</DialogTitle></DialogHeader>
          <Alert className="border-green-200 bg-green-50"><AlertCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-sm text-green-800">All items in this purchase order have been fully received.</AlertDescription></Alert>
          <DialogFooter><Button onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">Receive Inventory</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Purchase Order: {purchaseOrder?.poNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6"><X className="h-4 w-4" /></Button>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ background: useAutoLocation ? "#E1F5EE" : "hsl(var(--muted))", borderColor: useAutoLocation ? "#1D9E75" : "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${useAutoLocation ? "text-[#1D9E75]" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-sm font-medium ${useAutoLocation ? "text-[#085041]" : ""}`}>Auto-disperse to each item's home location</p>
              <p className={`text-xs ${useAutoLocation ? "text-[#0F6E56]" : "text-muted-foreground"}`}>
                {useAutoLocation ? "Each item goes to where it normally lives in your warehouse/shop" : "All items will go to the PO delivery location"}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setUseAutoLocation(prev => !prev)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useAutoLocation ? "bg-[#1D9E75]" : "bg-muted-foreground/30"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAutoLocation ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        {useAutoLocation && itemsWithNoLocation.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              {itemsWithNoLocation.length} item(s) have no home location set — they will go to the PO delivery location:{" "}
              {itemsWithNoLocation.map(i => <strong key={i.itemId}>{i.itemName}</strong>).reduce((a, b) => [a, ", ", b] as any)}
            </AlertDescription>
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription><ul className="list-disc list-inside text-sm">{validationErrors.map((error, idx) => <li key={idx}>{error}</li>)}</ul></AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {pendingItems.map((item) => {
            const locName = getEffectiveLocationName(item)
            const hasLoc = item.hasAutoLocation
            return (
              <div key={item.purchaseOrderLineId} className="rounded-xl border p-4" style={{ borderColor: hasLoc && useAutoLocation ? "#1D9E75" : "hsl(var(--border))", background: hasLoc && useAutoLocation ? "linear-gradient(135deg, #E1F5EE 0%, #ffffff 40%)" : "hsl(var(--card))" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.itemSku}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {isLoadingLocations ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Looking up location…</span>
                      ) : (
                        <Badge className="text-[10px] gap-1 px-2 py-0.5" style={{ background: hasLoc && useAutoLocation ? "#E1F5EE" : "hsl(var(--muted))", color: hasLoc && useAutoLocation ? "#085041" : "hsl(var(--muted-foreground))", border: hasLoc && useAutoLocation ? "1px solid #9FE1CB" : "1px solid hsl(var(--border))" }}>
                          <MapPin className="h-2.5 w-2.5" />{locName}{!hasLoc && useAutoLocation && " (no home set — using PO default)"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Ordered</p><p className="font-semibold">{item.orderedQuantity}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Received</p><p className="font-semibold">{item.receivedQuantity}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Remaining</p><p className="font-semibold text-amber-600">{item.remainingQuantity}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Receive Now</p>
                      <Input type="number" min="0" max={item.remainingQuantity} value={item.receiveNow} onChange={(e) => updateReceiveQuantity(item.purchaseOrderLineId, parseInt(e.target.value) || 0)} className="w-20 text-center h-8 font-bold" style={{ borderColor: item.receiveNow > 0 ? "#1D9E75" : undefined, color: item.receiveNow > 0 ? "#085041" : undefined }} disabled={isSubmitting} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="space-y-2 pt-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea id="notes" placeholder="All is well. We received all of them safely" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={2} disabled={isSubmitting} />
          </div>
        </div>

        {useAutoLocation && !isLoadingLocations && (
          <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-1">
            <p className="font-semibold text-sm mb-2">Dispatch Summary</p>
            {Array.from(pendingItems.filter(i => i.receiveNow > 0).reduce((map, item) => {
              const locName = getEffectiveLocationName(item)
              if (!map.has(locName)) map.set(locName, [])
              map.get(locName)!.push(item)
              return map
            }, new Map<string, ReceiveItem[]>()).entries()).map(([loc, locItems]) => (
              <div key={loc} className="flex items-center justify-between"><span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {loc}</span><span className="font-medium">{locItems.map(i => `${i.itemName} ×${i.receiveNow}`).join(", ")}</span></div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingLocations} className="bg-pink-600 hover:bg-pink-700">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</> : `Confirm Receipt${useAutoLocation ? " & Disperse" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}