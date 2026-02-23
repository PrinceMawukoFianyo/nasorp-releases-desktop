"use client"

import { updateItemById } from "@/actions/items"
import { transferStockWithModel } from "@/actions/stock-transfer"
import { linkItemToLocation, getItemInventoryLocations } from "@/actions/inventory-actions"
import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import FormSelectInput from "@/components/FormInputs/FormSelectInput"
import { MapPin, ArrowRightLeft, CheckCircle2, Package } from "lucide-react"

interface PricingStockTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
  taxOptions?: Option[]
  unitOptions?: Option[]
  locationOptions?: Option[]
}

interface InventoryLocation {
  inventoryId: string
  locationId: string
  locationName: string
  locationType: string
  quantity: number
  reservedQuantity: number
  available: number
  stockStatus: string
}

export default function PricingStockTab({
  item,
  onUpdate,
  categoryOptions,
  brandOptions,
  taxOptions = [],
  unitOptions = [],
  locationOptions = [],
}: PricingStockTabProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  // ── Real inventory locations for this item ──
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  // ── Set Location state ──
  const [selectedLocation, setSelectedLocation] = useState<Option | null>(null)

  // ── Transfer state ──
  const [transferFrom, setTransferFrom] = useState<Option | null>(null)
  const [transferTo, setTransferTo] = useState<Option | null>(null)
  const [transferNote, setTransferNote] = useState("")
  const [transferQuantity, setTransferQuantity] = useState<number>(1)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState(false)

  // ── Tax & Unit state ──
  const [selectedTax, setSelectedTax] = useState<Option | null>(
    taxOptions.find((tax) => tax.value === item.taxRateId) || null
  )
  const [selectedUnit, setSelectedUnit] = useState<Option | null>(
    unitOptions.find((unit) => unit.value === item.unitId) || null
  )

  // Load real inventory locations on mount
  useEffect(() => {
    async function load() {
      setLoadingLocations(true)
      const data = await getItemInventoryLocations(item.id)
      setInventoryLocations(data)

      // Pre-fill transfer "from" with the first inventory location if any
      if (data.length > 0) {
        const first = data[0]
        const match = locationOptions.find((l) => l.value === first.locationId)
        if (match) setTransferFrom(match)
      }
      setLoadingLocations(false)
    }
    load()
  }, [item.id, locationOptions])

  // ── Generic field update handler ──
  const handleUpdate = async (data: Record<string, any>) => {
    setIsUpdating(true)
    try {
      const processedData: Record<string, any> = {}
      Object.keys(data).forEach((key) => {
        if (["costPrice", "sellingPrice", "tax", "minStockLevel", "maxStockLevel"].includes(key)) {
          processedData[key] = data[key] !== "" ? Number.parseFloat(data[key]) : undefined
        } else if (key === "isSerialTracked") {
          processedData[key] = Boolean(data[key])
        } else {
          processedData[key] = data[key]
        }
      })
      const result = await updateItemById(item.id, processedData)
      if (result.success) {
        onUpdate(processedData)
        toast.success("Updated successfully")
      } else {
        toast.error("Failed to update item")
      }
    } catch (error) {
      toast.error("An error occurred while updating")
    } finally {
      setIsUpdating(false)
    }
  }

  // ── Link item to location via Inventory table ──
  const handleLocationUpdate = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location first")
      return
    }
    setIsUpdating(true)
    try {
      const result = await linkItemToLocation({
        itemId: item.id,
        locationId: selectedLocation.value,
        quantity: 0,
      })
      if (result.success) {
        toast.success(`Item linked to ${selectedLocation.label}`)
        // Refresh inventory locations list
        const updated = await getItemInventoryLocations(item.id)
        setInventoryLocations(updated)
        setSelectedLocation(null)
      } else {
        toast.error(result.error || "Failed to link location")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  // ── Transfer handler ──
  const handleTransfer = async () => {
    if (!transferFrom) { toast.error("Select the From location"); return }
    if (!transferTo) { toast.error("Select the To location"); return }
    if (transferFrom.value === transferTo.value) { toast.error("From and To cannot be the same"); return }
    if (transferQuantity < 1) { toast.error("Quantity must be at least 1"); return }

    setIsTransferring(true)
    setTransferSuccess(false)
    try {
      const result = await transferStockWithModel({
        itemId: item.id,
        fromLocationId: transferFrom.value,
        toLocationId: transferTo.value,
        quantity: transferQuantity,
        notes: transferNote || undefined,
      })
      if (result?.success) {
        setTransferSuccess(true)
        setTransferFrom(transferTo)
        setTransferTo(null)
        setTransferNote("")
        setTransferQuantity(1)
        // Refresh inventory locations
        const updated = await getItemInventoryLocations(item.id)
        setInventoryLocations(updated)
        toast.success(
          `Transfer created: ${transferFrom.label} → ${transferTo.label} (${result.transfer?.transferNumber})`
        )
      } else {
        toast.error(result?.error || "Transfer failed")
      }
    } catch (error) {
      toast.error("An error occurred during transfer")
    } finally {
      setIsTransferring(false)
    }
  }

  // ── Tax & Unit handler ──
  const handleTaxAndUnitUpdate = async () => {
    setIsUpdating(true)
    try {
      const tax = selectedTax?.label.split("-")[0]?.trim() || ""
      const unit = selectedUnit?.label.split("-")[0]?.trim() || ""
      const data = {
        taxRateId: selectedTax?.value || undefined,
        unitId: selectedUnit?.value || undefined,
        unitOfMeasure: unit,
        tax: tax ? Number.parseFloat(tax) : undefined,
      }
      await updateItemById(item.id, data)
      toast.success("Tax and unit updated")
      onUpdate(data)
    } catch (error) {
      toast.error("Failed to update tax and unit")
    } finally {
      setIsUpdating(false)
    }
  }

  const stockStatusColor = (status: string) => {
    if (status === "IN_STOCK") return "bg-green-100 text-green-700 border-green-200"
    if (status === "LOW_STOCK") return "bg-yellow-100 text-yellow-700 border-yellow-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  const locationTypeEmoji = (type: string) => {
    if (type === "WAREHOUSE") return "🏭"
    if (type === "SHOP") return "🏪"
    return "☁️"
  }

  return (
    <div className="grid gap-4 lg:gap-6">

      {/* ══ STORAGE LOCATION ══ */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Storage Location</CardTitle>
          </div>
          <CardDescription>Manage where this item is stored</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="set" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="set" className="text-xs gap-1.5">
                <MapPin className="h-3 w-3" /> Set Location
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-xs gap-1.5">
                <ArrowRightLeft className="h-3 w-3" /> Transfer
              </TabsTrigger>
            </TabsList>

            {/* ── SET LOCATION TAB ── */}
            <TabsContent value="set" className="space-y-3 mt-0">

              {/* Current inventory locations */}
              {loadingLocations ? (
                <p className="text-xs text-muted-foreground py-2">Loading locations...</p>
              ) : inventoryLocations.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Currently stocked at:</p>
                  {inventoryLocations.map((inv) => (
                    <div
                      key={inv.inventoryId}
                      className="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{locationTypeEmoji(inv.locationType)}</span>
                        <span className="text-xs font-medium">{inv.locationName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({inv.locationType})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Qty: <strong>{inv.quantity}</strong>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stockStatusColor(inv.stockStatus)}`}>
                          {inv.stockStatus.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-dashed">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Not linked to any location yet
                  </span>
                </div>
              )}

              {/* Add to a new location */}
              <div className="pt-1 space-y-3 border-t">
                <p className="text-xs font-medium text-muted-foreground pt-2">
                  Link to a location:
                </p>
                <FormSelectInput
                  label="Select Location"
                  options={locationOptions.filter(
                    (l) => !inventoryLocations.some((inv) => inv.locationId === l.value)
                  )}
                  option={selectedLocation}
                  setOption={setSelectedLocation}
                  toolTipText="Manage Locations"
                  href="/dashboard/inventory/locations"
                />
                <Button
                  type="button"
                  onClick={handleLocationUpdate}
                  disabled={isUpdating || !selectedLocation}
                  className="w-full"
                  size="sm"
                >
                  {isUpdating ? "Linking..." : "Link to Location"}
                </Button>
              </div>
            </TabsContent>

            {/* ── TRANSFER TAB ── */}
            <TabsContent value="transfer" className="space-y-3 mt-0">

              {transferSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    Transfer created successfully
                  </span>
                </div>
              )}

              {/* From → To indicator */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-center gap-1 p-2 bg-muted rounded-md text-center min-h-12 justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">From</span>
                  <span className="text-xs font-semibold leading-tight">
                    {transferFrom?.label ?? <span className="text-muted-foreground font-normal italic">Not set</span>}
                  </span>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-center gap-1 p-2 bg-primary/5 border border-primary/20 rounded-md text-center min-h-12 justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">To</span>
                  <span className="text-xs font-semibold text-primary leading-tight">
                    {transferTo?.label ?? <span className="text-muted-foreground font-normal italic">Select below</span>}
                  </span>
                </div>
              </div>

              <FormSelectInput
                label="From Location"
                options={locationOptions}
                option={transferFrom}
                setOption={(opt) => { setTransferFrom(opt); setTransferSuccess(false) }}
                toolTipText="Manage Locations"
                href="/dashboard/inventory/locations"
              />

              <FormSelectInput
                label="To Location"
                options={locationOptions.filter((l) => l.value !== transferFrom?.value)}
                option={transferTo}
                setOption={(opt) => { setTransferTo(opt); setTransferSuccess(false) }}
                toolTipText="Manage Locations"
                href="/dashboard/inventory/locations"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <input
                    type="number"
                    min={1}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Note (optional)</Label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Reason..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleTransfer}
                disabled={isTransferring || !transferFrom || !transferTo}
                className="w-full"
                size="sm"
              >
                {isTransferring
                  ? "Transferring..."
                  : transferFrom && transferTo
                  ? `Transfer: ${transferFrom.label} → ${transferTo.label}`
                  : "Confirm Transfer"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ══ PRICING ══ */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Pricing</h3>
          <p className="text-xs text-muted-foreground">Cost and selling price</p>
        </div>
        <UpdateCard
          title="" subtitle=""
          fields={[
            { name: "costPrice", label: "Cost Price", type: "number", step: "0.01", defaultValue: item.costPrice, placeholder: "0.00" },
            { name: "sellingPrice", label: "Selling Price", type: "number", step: "0.01", defaultValue: item.sellingPrice, placeholder: "0.00" },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* ══ TAX & UNIT ══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tax and Unit</CardTitle>
          <CardDescription>Tax rates and unit of measure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelectInput
              label="Tax Rate" options={taxOptions} option={selectedTax}
              setOption={setSelectedTax} toolTipText="Manage Tax Rates"
              href="/dashboard/settings/tax-rates"
            />
            <FormSelectInput
              label="Unit of Measure" options={unitOptions} option={selectedUnit}
              setOption={setSelectedUnit} toolTipText="Manage Units"
              href="/dashboard/inventory/units"
            />
          </div>
          <Button type="button" onClick={handleTaxAndUnitUpdate} disabled={isUpdating} className="w-full" size="sm">
            {isUpdating ? "Updating..." : "Update Tax & Unit"}
          </Button>
        </CardContent>
      </Card>

      {/* ══ MANUAL TAX & UNIT ══ */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Manual Tax & Unit Settings</h3>
          <p className="text-xs text-muted-foreground">Custom overrides</p>
        </div>
        <UpdateCard title="" subtitle=""
          fields={[
            { name: "tax", label: "Tax (%)", type: "number", step: "0.01", defaultValue: item.tax, placeholder: "0.00" },
            { name: "taxRateId", label: "Tax Rate ID", type: "text", defaultValue: item.taxRateId, placeholder: "Enter tax rate ID" },
          ]}
          onSubmit={handleUpdate}
        />
        <UpdateCard title="Unit Settings" subtitle="Unit of measure and unit ID"
          fields={[
            { name: "unitOfMeasure", label: "Unit of Measure", type: "text", defaultValue: item.unitOfMeasure, placeholder: "e.g., piece, kg, liter" },
            { name: "unitId", label: "Unit ID", type: "text", defaultValue: item.unitId },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* ══ STOCK LEVELS ══ */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Stock Levels</h3>
          <p className="text-xs text-muted-foreground">Min and max thresholds</p>
        </div>
        <UpdateCard title="" subtitle=""
          fields={[
            { name: "minStockLevel", label: "Minimum Stock Level", type: "number", defaultValue: item.minStockLevel, placeholder: "0" },
            { name: "maxStockLevel", label: "Maximum Stock Level", type: "number", defaultValue: item.maxStockLevel, placeholder: "0" },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* ══ TRACKING ══ */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Tracking</h3>
          <p className="text-xs text-muted-foreground">Serial number tracking</p>
        </div>
        <UpdateCard title="" subtitle=""
          fields={[{ name: "isSerialTracked", label: "Serial Number Tracked", type: "checkbox", defaultValue: item.isSerialTracked }]}
          onSubmit={handleUpdate} singleField
        />
      </div>

      {/* ══ ADDITIONAL INFO ══ */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Additional Information</h3>
          <p className="text-xs text-muted-foreground">Product status</p>
        </div>
        <UpdateCard title="" subtitle=""
          fields={[{ name: "isActive", label: "Product Active", type: "checkbox", defaultValue: item.isActive }]}
          onSubmit={handleUpdate}
        />
      </div>

    </div>
  )
}