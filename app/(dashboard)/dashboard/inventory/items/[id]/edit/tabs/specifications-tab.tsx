"use client"

import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"
import { useState } from "react"
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
import { getAuthenticatedUser } from "@/config/useAuth"
import { createBulkAdjustment } from "@/actions/stock-adjustments"
import { getOrgLocations } from "@/actions/locations"
import { db } from "@/prisma/db"
import {
  ArrowUp, ArrowDown, RefreshCw, AlertTriangle, Package,
  MapPin, BarChart2, Zap, Plus, Minus, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

type AdjustmentType = "STOCk_COUNT" | "DAMAGE" | "THEFT" | "EXPIRED" | "WRITE_OFF" | "CORRECTION" | "OTHER"

interface QuickAdjustmentProps {
  item: ProductData
  onAdjusted: () => void
}

function QuickAdjustment({ item, onAdjusted }: QuickAdjustmentProps) {
  const [open,         setOpen]         = useState(false)
  const [locations,    setLocations]    = useState<{ id: string; name: string }[]>([])
  const [locationId,   setLocationId]   = useState("")
  const [currentStock, setCurrentStock] = useState(0)
  const [newQty,       setNewQty]       = useState("")
  const [adjType,      setAdjType]      = useState<AdjustmentType>("CORRECTION")
  const [reason,       setReason]       = useState("")
  const [isLoading,    setIsLoading]    = useState(false)
  const [isSaving,     setIsSaving]     = useState(false)

  // Quick +/- delta
  const [delta,        setDelta]        = useState("")

  useEffect(() => {
    if (open) loadLocations()
  }, [open])

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const locs = await getOrgLocations()
      setLocations(locs as { id: string; name: string }[])
    } catch (e) {
      toast.error("Failed to load locations")
    } finally {
      setIsLoading(false)
    }
  }

  // Simulate fetching current stock (in real app, pass inventories via props)
  const handleLocationChange = async (id: string) => {
    setLocationId(id)
    // In a real implementation, you'd look up inventory here
    // For now default to 0 and let user enter the before qty
    setCurrentStock(0)
    setNewQty("")
    setDelta("")
  }

  const computed = (() => {
    const n = parseInt(newQty)
    if (!isNaN(n)) return { after: n, change: n - currentStock }
    const d = parseInt(delta)
    if (!isNaN(d)) return { after: currentStock + d, change: d }
    return null
  })()

  const handleSubmit = async () => {
    if (!locationId) { toast.error("Select a location"); return }
    if (!computed)   { toast.error("Enter new quantity or delta"); return }
    if (!reason.trim()) { toast.error("Reason is required"); return }
    if (computed.after < 0) { toast.error("Quantity cannot be negative"); return }

    setIsSaving(true)
    try {
      const result = await createBulkAdjustment({
        locationId,
        adjustmentType: adjType,
        reason: reason.trim(),
        items: [{
          itemId:         item.id,
          beforeQuantity: currentStock,
          afterQuantity:  computed.after,
        }],
      })

      if (result.success) {
        toast.success("Quick adjustment created!", {
          description: `${computed.change >= 0 ? "+" : ""}${computed.change} units. Pending approval.`,
        })
        setOpen(false)
        setNewQty("")
        setDelta("")
        setReason("")
        onAdjusted()
      } else {
        toast.error(result.error || "Adjustment failed")
      }
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
            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : (
                <Select value={locationId} onValueChange={handleLocationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Current qty display */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{currentStock}</p>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">New Stock</p>
                <p className={cn(
                  "text-2xl font-bold",
                  computed && computed.after !== currentStock
                    ? computed.after > currentStock ? "text-green-600" : "text-red-600"
                    : ""
                )}>
                  {computed ? computed.after : "—"}
                </p>
              </div>
              {computed && (
                <Badge
                  variant={computed.change >= 0 ? "default" : "destructive"}
                  className="shrink-0"
                >
                  {computed.change >= 0 ? "+" : ""}{computed.change}
                </Badge>
              )}
            </div>

            {/* Quick +/- buttons */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick adjust by amount:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[-10, -5, -1, +1, +5, +10].map(d => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "min-w-[44px]",
                      d > 0 ? "border-green-300 text-green-700 hover:bg-green-50" :
                               "border-red-300 text-red-700 hover:bg-red-50"
                    )}
                    onClick={() => {
                      const curr = parseInt(delta) || 0
                      setDelta(String(curr + d))
                      setNewQty("")
                    }}
                  >
                    {d > 0 ? `+${d}` : d}
                  </Button>
                ))}
              </div>
            </div>

            {/* Or set absolute qty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Set exact quantity</label>
                <Input
                  type="number"
                  min={0}
                  value={newQty}
                  onChange={e => { setNewQty(e.target.value); setDelta("") }}
                  placeholder="e.g. 50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Or enter delta (±)</label>
                <Input
                  type="number"
                  value={delta}
                  onChange={e => { setDelta(e.target.value); setNewQty("") }}
                  placeholder="e.g. -3 or +5"
                />
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
                disabled={!locationId || !computed || !reason.trim() || isSaving || computed.after < 0}
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
// Main Component
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
      {/* ── Quick Adjustment Card ── */}
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