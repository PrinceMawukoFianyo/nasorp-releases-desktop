"use client"

import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { createBulkAdjustment, getItemsForAdjustment, getLocationsForAdjustment } from "@/actions/stock-adjustments"
import {
  RefreshCw, Package, MapPin, CheckCircle2, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getItemInventoryLocations } from "@/actions/inventory-actions"

type AdjustmentType = "STOCk_COUNT" | "DAMAGE" | "THEFT" | "EXPIRED" | "WRITE_OFF" | "CORRECTION" | "OTHER"

interface QuickAdjustmentProps {
  item: { id: string; name: string; sku: string }
  onAdjusted: () => void
}

function QuickAdjustment({ item, onAdjusted }: QuickAdjustmentProps) {
  const [open, setOpen] = useState(false)
  const [locations, setLocations] = useState<{ id: string; name: string; quantity: number }[]>([])
  const [locationId, setLocationId] = useState("")
  const [currentStock, setCurrentStock] = useState(0)
  const [changeAmount, setChangeAmount] = useState<number>(0)
  const [adjType, setAdjType] = useState<AdjustmentType>("CORRECTION")
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const afterQuantity = currentStock + changeAmount
  const isChangeValid = afterQuantity >= 0
  const canSubmit = isChangeValid && changeAmount !== 0 && reason.trim().length > 0 && locationId

  useEffect(() => {
    if (open) loadItemLocations()
  }, [open])

  const loadItemLocations = async () => {
    setIsLoading(true)
    try {
      const result = await getItemInventoryLocations(item.id)
      if (result && result.length > 0) {
        const locs = result.map((inv: any) => ({
          id: inv.locationId,
          name: inv.locationName,
          quantity: inv.quantity,
        }))
        setLocations(locs)
        setLocationId(locs[0].id)
        setCurrentStock(locs[0].quantity)
        setChangeAmount(0)
      } else {
        setLocations([])
        setLocationId("")
        setCurrentStock(0)
        toast.info("No stock found for this item. You can create an adjustment to add stock.")
      }
    } catch (error) {
      toast.error("Failed to load inventory locations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationChange = (locId: string) => {
    const selected = locations.find(l => l.id === locId)
    if (selected) {
      setLocationId(locId)
      setCurrentStock(selected.quantity)
      setChangeAmount(0)
    }
  }

  const handleSubmit = async () => {
    if (!locationId) { toast.error("Select a location"); return }
    if (!isChangeValid) {
      toast.error(`Cannot reduce stock by ${Math.abs(changeAmount)} — current stock is only ${currentStock}`)
      return
    }
    if (changeAmount === 0) {
      toast.error("Please enter a change amount (positive to add, negative to reduce)")
      return
    }
    if (!reason.trim()) { toast.error("Reason is required"); return }

    setIsSaving(true)
    try {
      const result = await createBulkAdjustment({
        locationId,
        adjustmentType: adjType,
        reason: reason.trim(),
        items: [{
          itemId: item.id,
          beforeQuantity: currentStock,
          afterQuantity: afterQuantity,
        }],
      })
      if (result.success) {
        toast.success("Quick adjustment created!", {
          description: `${changeAmount >= 0 ? "+" : ""}${changeAmount} units. Pending approval.`,
        })
        setOpen(false)
        setChangeAmount(0)
        setReason("")
        onAdjusted()
      } else {
        toast.error(result.error || "Adjustment failed")
      }
    } catch (error: any) {
      toast.error(error.message || "Unexpected error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Zap className="h-3.5 w-3.5" />
        Quick Adjustment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quick Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              Adjust stock for <strong>{item.name}</strong> (SKU: {item.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Location dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading locations…</p>
              ) : locations.length === 0 ? (
                <p className="text-sm text-amber-600">No stock anywhere – adjustment will create stock at the selected location below?</p>
              ) : (
                <Select value={locationId} onValueChange={handleLocationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} (Stock: {loc.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Stock display – identical to main adjustment page */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{currentStock}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Change Amount</p>
                <Input
                  type="number"
                  placeholder="e.g. 10 or -4"
                  value={changeAmount}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === "" || raw === "-") setChangeAmount(0)
                    else setChangeAmount(Number(raw) || 0)
                  }}
                  className={`font-semibold text-center ${
                    !isChangeValid
                      ? "border-red-400 focus-visible:ring-red-400"
                      : changeAmount > 0
                        ? "border-green-400 focus-visible:ring-green-400"
                        : changeAmount < 0
                          ? "border-orange-400 focus-visible:ring-orange-400"
                          : ""
                  }`}
                />
                <p className="text-xs text-muted-foreground mt-1">Positive to add · Negative to reduce</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">New Stock Level</p>
                <p className={`text-2xl font-bold ${
                  !isChangeValid
                    ? "text-red-600"
                    : changeAmount > 0
                      ? "text-green-600"
                      : changeAmount < 0
                        ? "text-orange-600"
                        : "text-gray-600"
                }`}>
                  {!isChangeValid ? "❌" : afterQuantity}
                </p>
                {!isChangeValid && changeAmount !== 0 && (
                  <p className="text-xs text-red-500 mt-1">Below zero</p>
                )}
              </div>
            </div>

            {/* Adjustment type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Adjustment Type</label>
              <Select value={adjType} onValueChange={(v: any) => setAdjType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRECTION">Correction</SelectItem>
                  <SelectItem value="STOCk_COUNT">Stock Count</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="WRITE_OFF">Write-Off</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief reason for adjustment…"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSaving}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isSaving ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Create Adjustment</>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Adjustment will be created as DRAFT and requires approval
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
// ─────────────────────────────────────────────────────────────
// Main Component (default export)
// ─────────────────────────────────────────────────────────────

interface SpecificationsTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
}

export default function SpecificationsTab({
  item,
  onUpdate,
  categoryOptions,
  brandOptions,
}: SpecificationsTabProps) {
  return (
    <div className="grid gap-6">
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Quick Stock Adjustment
              </CardTitle>
              <CardDescription>
                Instantly correct stock counts without leaving this page
              </CardDescription>
            </div>
            <QuickAdjustment item={item} onAdjusted={() => onUpdate({ _stockRefreshed: true })} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-background rounded-lg border text-center">
              <p className="text-xs text-muted-foreground mb-1">Min Stock</p>
              <p className="text-lg font-bold">{item.minStockLevel ?? 0}</p>
            </div>
            <div className="p-3 bg-background rounded-lg border text-center">
              <p className="text-xs text-muted-foreground mb-1">Max Stock</p>
              <p className="text-lg font-bold">{item.maxStockLevel ?? "—"}</p>
            </div>
            <div className="p-3 bg-background rounded-lg border text-center">
              <p className="text-xs text-muted-foreground mb-1">Is Active</p>
              <Badge variant={item.isActive ? "default" : "secondary"}>
                {item.isActive ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <UpdateCard
        title="Stock Thresholds"
        subtitle="Min/max stock level controls"
        fields={[
          {
            name: "minStockLevel",
            label: "Minimum Stock Level",
            type: "number",
            defaultValue: item.minStockLevel,
          },
          {
            name: "maxStockLevel",
            label: "Maximum Stock Level",
            type: "number",
            defaultValue: item.maxStockLevel,
          },
        ]}
        onSubmit={onUpdate}
      />

      <UpdateCard
        title="Tracking & Status"
        subtitle="Serial tracking and availability"
        fields={[
          {
            name: "isSerialTracked",
            label: "Serial Number Tracked",
            type: "checkbox",
            defaultValue: item.isSerialTracked,
          },
          {
            name: "isActive",
            label: "Active Status",
            type: "checkbox",
            defaultValue: item.isActive,
          },
        ]}
        onSubmit={onUpdate}
      />

      <UpdateCard
        title="Sales Metrics"
        subtitle="Track sales performance"
        fields={[
          {
            name: "salesCount",
            label: "Sales Count",
            type: "number",
            defaultValue: item.salesCount,
          },
          {
            name: "salesTotal",
            label: "Sales Total",
            type: "number",
            step: "0.01",
            defaultValue: item.salesTotal,
          },
        ]}
        onSubmit={onUpdate}
      />
    </div>
  )
}