"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Package, MapPin, Zap } from "lucide-react"
import ItemSelector from "./item-selector"
import { formatCurrency } from "../po-utils"
import { Decimal } from "@prisma/client/runtime/library"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface LineItem {
  id?: string
  itemId: string
  itemName: string
  itemSku: string
  quantity: number
  unitPrice: string | number
  taxRate: number
  lineTotal: Decimal | number
  // ── Per-row delivery location ──────────────────────────────────────────────
  locationId?: string
  locationName?: string
}

interface DeliveryLocation {
  id: string
  name: string
  address?: string
}

interface LineItemsManagerProps {
  lineItems: LineItem[]
  onLineItemsChange: (items: LineItem[]) => void
  availableItems: Array<{ id: string; name: string; sku: string; description?: string; unitCost?: number }>
  locations: DeliveryLocation[]          // ← passed in from the form
  disabled?: boolean
}

export default function LineItemsManager({
  lineItems,
  onLineItemsChange,
  availableItems,
  locations,
  disabled = false,
}: LineItemsManagerProps) {
  const [localItems, setLocalItems] = useState<LineItem[]>(lineItems)
  const [bulkLocationId, setBulkLocationId] = useState<string>("")

  // Sync when parent updates lineItems (e.g. from receipt scanner)
  useEffect(() => {
    setLocalItems(lineItems)
  }, [lineItems])

  const calculateLineTotal = useCallback(
    (quantity: number, unitPrice: string | number, taxRate: number) => {
      const price = typeof unitPrice === "string" ? parseFloat(unitPrice) : unitPrice
      const subtotal = quantity * (isNaN(price) ? 0 : price)
      const tax = subtotal * (taxRate / 100)
      return subtotal + tax
    },
    []
  )

  const sync = (updated: LineItem[]) => {
    setLocalItems(updated)
    onLineItemsChange(updated)
  }

  // ── Bulk-apply a location to every row ───────────────────────────────────
  const applyBulkLocation = (locationId: string) => {
    setBulkLocationId(locationId)
    if (!locationId) return
    const loc = locations.find(l => l.id === locationId)
    sync(localItems.map(item => ({
      ...item,
      locationId:   loc?.id   ?? "",
      locationName: loc?.name ?? "",
    })))
  }

  const addLineItem = () => {
    // Pre-fill with bulk location if one is already selected
    const loc = locations.find(l => l.id === bulkLocationId)
    sync([
      ...localItems,
      {
        id:           `new-${Date.now()}`,
        itemId:       "",
        itemName:     "",
        itemSku:      "",
        quantity:     1,
        unitPrice:    0,
        taxRate:      0,
        lineTotal:    0,
        locationId:   loc?.id   ?? "",
        locationName: loc?.name ?? "",
      },
    ])
  }

  const removeLineItem = (index: number) => {
    sync(localItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...localItems]
    updated[index] = { ...updated[index], [field]: value }
    if (["quantity", "unitPrice", "taxRate"].includes(field as string)) {
      updated[index].lineTotal = calculateLineTotal(
        updated[index].quantity,
        updated[index].unitPrice,
        updated[index].taxRate
      )
    }
    sync(updated)
  }

  const handleItemSelect = (index: number, item: any) => {
    const updated = [...localItems]
    updated[index] = {
      ...updated[index],
      itemId:    item.id,
      itemName:  item.name,
      itemSku:   item.sku,
      unitPrice: item.unitCost ?? updated[index].unitPrice,
    }
    if (item.unitCost !== undefined) {
      updated[index].lineTotal = calculateLineTotal(
        updated[index].quantity,
        item.unitCost,
        updated[index].taxRate
      )
    }
    sync(updated)
  }

  const handleLocationSelect = (index: number, locationId: string) => {
    const loc = locations.find(l => l.id === locationId)
    updateLineItem(index, "locationId",   loc?.id   ?? "")
    // updateLineItem calls sync after setting one field — update name separately
    setLocalItems(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        locationId:   loc?.id   ?? "",
        locationName: loc?.name ?? "",
      }
      onLineItemsChange(updated)
      return updated
    })
  }

  const toNumber = (v: any): number => {
    if (typeof v === "number") return v
    if (typeof v === "string") return parseFloat(v) || 0
    if (v && typeof v.toNumber === "function") return v.toNumber()
    return 0
  }

  const calculateTotal = () =>
    localItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0)

  // Stats for the bulk-apply button label
  const unassignedCount = localItems.filter(i => !i.locationId).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Line Items</span>
            {localItems.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                {localItems.length}
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={addLineItem}
            size="sm"
            variant="outline"
            disabled={disabled}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardTitle>

        {/* ── Bulk location setter ────────────────────────────────────────── */}
        {localItems.length > 0 && locations.length > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary">Apply location to all rows:</span>
            <Select
              value={bulkLocationId || "__none__"}
              onValueChange={v => applyBulkLocation(v === "__none__" ? "" : v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="Pick a location…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select location —</SelectItem>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs shrink-0"
              disabled={disabled || !bulkLocationId || localItems.length === 0}
              onClick={() => applyBulkLocation(bulkLocationId)}
            >
              <Zap className="h-3.5 w-3.5" />
              Apply to all
              {unassignedCount > 0 && (
                <span className="ml-0.5 text-[10px] opacity-80">({unassignedCount} missing)</span>
              )}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {localItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-xl text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No line items yet</p>
              <p className="text-xs mt-1">Click "Add Item" or scan a receipt to get started</p>
            </div>
          </div>
        ) : (
          <>
            {localItems.map((item, index) => {
              const hasItem           = !!item.itemId
              const hasUnmatchedName  = !item.itemId && !!item.itemName
              const hasLocation       = !!item.locationId

              return (
                <div
                  key={item.id || index}
                  className="relative rounded-xl border transition-all"
                  style={{
                    borderColor: hasItem
                      ? "#1D9E75"
                      : hasUnmatchedName
                      ? "#EF9F27"
                      : "hsl(var(--border))",
                    background: hasItem
                      ? "linear-gradient(135deg, #E1F5EE 0%, #ffffff 40%)"
                      : hasUnmatchedName
                      ? "linear-gradient(135deg, #FAEEDA 0%, #ffffff 40%)"
                      : "hsl(var(--card))",
                  }}
                >
                  {/* Row number badge */}
                  <div
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
                    style={{
                      background: hasItem ? "#1D9E75" : hasUnmatchedName ? "#EF9F27" : "#888780",
                      color: "#fff",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Unmatched warning */}
                    {hasUnmatchedName && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="flex-shrink-0">⚠</span>
                        <span>
                          Scanner found <strong>"{item.itemName}"</strong> — select the correct item below
                        </span>
                      </div>
                    )}

                    {/* Item selector */}
                    <ItemSelector
                      items={availableItems}
                      selectedItemId={item.itemId}
                      onItemSelect={(selectedItem) => handleItemSelect(index, selectedItem)}
                      label="Item"
                      disabled={disabled}
                    />

                    {/* ── Delivery Location per row ─────────────────────── */}
                    {locations.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Delivery Location
                        </Label>
                        <Select
                          value={item.locationId || "__none__"}
                          onValueChange={v => handleLocationSelect(index, v === "__none__" ? "" : v)}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            className="h-9 text-sm"
                            style={hasLocation ? {
                              borderColor: "#1D9E75",
                              background: "#E1F5EE",
                              color: "#085041",
                            } : undefined}
                          >
                            <SelectValue placeholder="Select location…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— No location —</SelectItem>
                            {locations.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!hasLocation && (
                          <p className="text-[10px] text-amber-600">
                            ⚠ No location assigned — use "Apply to all" above or pick one here
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quantity + Unit Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Quantity
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e =>
                            updateLineItem(index, "quantity", parseInt(e.target.value) || 1)
                          }
                          disabled={disabled}
                          placeholder="1"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Unit Price
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={e => updateLineItem(index, "unitPrice", e.target.value)}
                          disabled={disabled}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Tax Rate + Line Total */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Tax Rate (%)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={e =>
                            updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)
                          }
                          disabled={disabled}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Line Total
                        </Label>
                        <div
                          className="h-9 px-3 flex items-center rounded-md text-sm font-bold"
                          style={{
                            background: hasItem ? "#E1F5EE" : "hsl(var(--muted))",
                            color: hasItem ? "#085041" : "hsl(var(--foreground))",
                            border: hasItem
                              ? "1px solid #9FE1CB"
                              : "1px solid hsl(var(--border))",
                          }}
                        >
                          {formatCurrency(toNumber(item.lineTotal))}
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={disabled}
                        className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Subtotal */}
            <div className="flex justify-end pt-2 border-t">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}