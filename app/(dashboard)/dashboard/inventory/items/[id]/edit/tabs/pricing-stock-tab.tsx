"use client"

import { updateItemById } from "@/actions/items"
import { transferStockWithModel } from "@/actions/stock-transfer"
import { linkItemToLocation, getItemInventoryLocations,unlinkItemFromLocation } from "@/actions/inventory-actions"
import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import FormSelectInput from "@/components/FormInputs/FormSelectInput"
import { MapPin, ArrowRightLeft, CheckCircle2, Package, Tag, Plus, Trash2, ChevronDown, ChevronRight, Settings, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getOrgPackagingUnits, PackagingUnitRecord } from "@/actions/packaging-units"
import { upsertItemPricingTiers, getItemPricingTiers, PricingTierInput } from "@/actions/pricing-tiers"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ConfirmationDialog } from "@/components/ui/data-table"

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

// Match the same structure as in item-listing.tsx
interface FractionConfig {
  enabled: boolean
  name: string
  units: number
  price: number
  isAuto: boolean
}

interface WholesaleTierDraft {
  id?: string
  packagingUnitId: string
  packagingUnitName: string
  unitsPerPack: number
  wholesalePrice: number
  // Fraction settings
  enableHalf: boolean
  enableQuarter: boolean
  halfConfig?: FractionConfig
  quarterConfig?: FractionConfig
}

// Fraction tier for display with settings
interface FractionTier {
  name: string
  units: number
  price: number
  isAuto: boolean
  isEnabled: boolean
  canSplitFurther: boolean
  type: 'half' | 'quarter'
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
  // ── For location unlink confirmation dialog ──
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [locationToUnlink, setLocationToUnlink] = useState<{
    inventoryId: string;
    locationId: string;
    locationName: string;
  } | null>(null);
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

  // ── Wholesale pricing ──
  const [packagingUnits, setPackagingUnits] = useState<PackagingUnitRecord[]>([])
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTierDraft[]>([])
  const [tiersLoading, setTiersLoading] = useState(true)
  const [isSavingTiers, setIsSavingTiers] = useState(false)
  const [expandedTiers, setExpandedTiers] = useState<Set<number>>(new Set())

  // ── Default Location state ──
  const [selectedDefaultLocation, setSelectedDefaultLocation] = useState<Option | null>(
    locationOptions.find(loc => loc.value === item.defaultLocationId) || null
  )
  const [isSavingDefaultLocation, setIsSavingDefaultLocation] = useState(false)

  // Load real inventory locations on mount
  useEffect(() => {
    async function load() {
      setLoadingLocations(true)
      const data = await getItemInventoryLocations(item.id)
      setInventoryLocations(data)

      if (data.length > 0) {
        const first = data[0]
        const match = locationOptions.find((l) => l.value === first.locationId)
        if (match) setTransferFrom(match)
      }
      setLoadingLocations(false)
    }
    load()
  }, [item.id, locationOptions])

  // Load packaging units and existing tiers
  useEffect(() => {
    async function loadTiersAndUnits() {
      setTiersLoading(true)
      try {
        const units = await getOrgPackagingUnits()
        setPackagingUnits(units)

        const result = await getItemPricingTiers(item.id)
        if (result.success && result.tiers.length > 0) {
          const loadedTiers: WholesaleTierDraft[] = []
          
          // Group tiers by main pack (ones without "½" or "¼")
          const mainTiers = result.tiers.filter((t: any) => {
            const name = t.packagingUnitName || ""
            return !name.includes("½") && !name.includes("¼") && !name.includes("Half") && !name.includes("Quarter")
          })
          
          for (const main of mainTiers) {
            loadedTiers.push({
              id: main.id,
              packagingUnitId: main.packagingUnitId,
              packagingUnitName: main.packagingUnitName,
              unitsPerPack: main.unitsPerPack,
              wholesalePrice: main.wholesalePrice,
              enableHalf: true,
              enableQuarter: true,
            })
          }
          
          setWholesaleTiers(loadedTiers)
        } else {
          setWholesaleTiers([])
        }
      } catch (error) {
        console.error("Failed to load tiers:", error)
        toast.error("Failed to load wholesale pricing")
      } finally {
        setTiersLoading(false)
      }
    }
    loadTiersAndUnits()
  }, [item.id])

  // Generate fractions for a tier with enable/disable support
  const generateFractions = (tier: WholesaleTierDraft): FractionTier[] => {
    const fractions: FractionTier[] = []
    const qty = tier.unitsPerPack
    
    // Half fraction
    if (tier.enableHalf === true && qty >= 2) {
      const halfUnits = Math.floor(qty / 2)
      const canSplitFurther = halfUnits > 1
      fractions.push({
        name: tier.halfConfig?.name || `½ Half ${tier.packagingUnitName}`,
        units: tier.halfConfig?.units || halfUnits,
        price: tier.halfConfig?.price || (tier.wholesalePrice / 2),
        isAuto: tier.halfConfig?.isAuto !== false,
        isEnabled: true,
        canSplitFurther,
        type: 'half',
      })
    }
    
    // Quarter fraction
    if (tier.enableQuarter === true && qty >= 4) {
      const quarterUnits = Math.floor(qty / 4)
      const canSplitFurther = quarterUnits > 1
      fractions.push({
        name: tier.quarterConfig?.name || `¼ Quarter ${tier.packagingUnitName}`,
        units: tier.quarterConfig?.units || quarterUnits,
        price: tier.quarterConfig?.price || (tier.wholesalePrice / 4),
        isAuto: tier.quarterConfig?.isAuto !== false,
        isEnabled: true,
        canSplitFurther,
        type: 'quarter',
      })
    }
    
    return fractions
  }

  const toggleTierExpanded = (index: number) => {
    const newSet = new Set(expandedTiers)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setExpandedTiers(newSet)
  }

  const addTier = () => {
    setWholesaleTiers([
      ...wholesaleTiers,
      {
        packagingUnitId: "",
        packagingUnitName: "",
        unitsPerPack: 0,        // 0 = "not yet entered" → shows as empty w/ placeholder
        wholesalePrice: 0,
        enableHalf: true,
        enableQuarter: true,
      },
    ])
    setExpandedTiers(new Set([...expandedTiers, wholesaleTiers.length]))
  }

  const updateTier = (index: number, field: keyof WholesaleTierDraft, value: any) => {
    const updated = [...wholesaleTiers]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === "packagingUnitId") {
      const unit = packagingUnits.find(u => u.id === value)
      if (unit) {
        updated[index].packagingUnitName = unit.name
      }
    }
    
    setWholesaleTiers(updated)
  }

  const updateFractionConfig = (tierIndex: number, fractionType: 'half' | 'quarter', config: Partial<FractionConfig>) => {
    const updated = [...wholesaleTiers]
    const tier = updated[tierIndex]
    const configKey = fractionType === 'half' ? 'halfConfig' : 'quarterConfig'
    const currentConfig = tier[configKey] || {
      enabled: true,
      name: fractionType === 'half' ? `½ Half ${tier.packagingUnitName}` : `¼ Quarter ${tier.packagingUnitName}`,
      units: fractionType === 'half' ? Math.floor(tier.unitsPerPack / 2) : Math.floor(tier.unitsPerPack / 4),
      price: fractionType === 'half' ? tier.wholesalePrice / 2 : tier.wholesalePrice / 4,
      isAuto: true,
    }
    
    updated[tierIndex] = {
      ...tier,
      [configKey]: { ...currentConfig, ...config }
    }
    
    setWholesaleTiers(updated)
  }

  const toggleFractionEnable = (tierIndex: number, fractionType: 'half' | 'quarter') => {
    const updated = [...wholesaleTiers]
    const tier = updated[tierIndex]
    
    if (fractionType === 'half') {
      updated[tierIndex] = { ...tier, enableHalf: !tier.enableHalf }
    } else {
      updated[tierIndex] = { ...tier, enableQuarter: !tier.enableQuarter }
    }
    
    setWholesaleTiers(updated)
  }

  const toggleFractionAuto = (tierIndex: number, fractionType: 'half' | 'quarter') => {
    const updated = [...wholesaleTiers]
    const tier = updated[tierIndex]
    const configKey = fractionType === 'half' ? 'halfConfig' : 'quarterConfig'
    const currentConfig = tier[configKey] || {
      enabled: true,
      name: fractionType === 'half' ? `½ Half ${tier.packagingUnitName}` : `¼ Quarter ${tier.packagingUnitName}`,
      units: fractionType === 'half' ? Math.floor(tier.unitsPerPack / 2) : Math.floor(tier.unitsPerPack / 4),
      price: fractionType === 'half' ? tier.wholesalePrice / 2 : tier.wholesalePrice / 4,
      isAuto: true,
    }
    
    updated[tierIndex] = {
      ...tier,
      [configKey]: { ...currentConfig, isAuto: !currentConfig.isAuto }
    }
    
    setWholesaleTiers(updated)
  }

  const removeTier = (index: number) => {
    setWholesaleTiers(wholesaleTiers.filter((_, i) => i !== index))
    const newExpanded = new Set(expandedTiers)
    newExpanded.delete(index)
    setExpandedTiers(newExpanded)
  }

  const handleSaveTiers = async () => {
    const invalid = wholesaleTiers.find(t => !t.packagingUnitId || t.unitsPerPack < 1 || t.wholesalePrice < 0)
    if (invalid) {
      toast.error("Please fill all pack fields correctly")
      return
    }

    // Flatten all tiers and their fractions for saving
    const allTiers: PricingTierInput[] = []
    
    for (const tier of wholesaleTiers) {
      // Add the main tier
      allTiers.push({
        packagingUnitId: tier.packagingUnitId,
        packagingUnitName: tier.packagingUnitName,
        unitsPerPack: tier.unitsPerPack,
        wholesalePrice: tier.wholesalePrice,
      })
      
      // Add half fraction if enabled
      if (tier.enableHalf === true && tier.unitsPerPack >= 2) {
        const halfUnits = tier.halfConfig?.units || Math.floor(tier.unitsPerPack / 2)
        const halfPrice = tier.halfConfig?.price || (tier.wholesalePrice / 2)
        allTiers.push({
          packagingUnitId: tier.packagingUnitId,
          packagingUnitName: tier.halfConfig?.name || `½ Half ${tier.packagingUnitName}`,
          unitsPerPack: halfUnits,
          wholesalePrice: halfPrice,
        })
      }
      
      // Add quarter fraction if enabled
      if (tier.enableQuarter === true && tier.unitsPerPack >= 4) {
        const quarterUnits = tier.quarterConfig?.units || Math.floor(tier.unitsPerPack / 4)
        const quarterPrice = tier.quarterConfig?.price || (tier.wholesalePrice / 4)
        allTiers.push({
          packagingUnitId: tier.packagingUnitId,
          packagingUnitName: tier.quarterConfig?.name || `¼ Quarter ${tier.packagingUnitName}`,
          unitsPerPack: quarterUnits,
          wholesalePrice: quarterPrice,
        })
      }
    }

    setIsSavingTiers(true)
    try {
      const result = await upsertItemPricingTiers(item.id, allTiers)
      if (result.success) {
        toast.success("Wholesale pricing saved!")
      } else {
        toast.error(result.error || "Failed to save wholesale pricing")
      }
    } catch (error) {
      toast.error("An error occurred while saving")
    } finally {
      setIsSavingTiers(false)
    }
  }

  const getPricePerUnit = (tier: WholesaleTierDraft) => {
    if (tier.unitsPerPack <= 0) return 0
    return tier.wholesalePrice / tier.unitsPerPack
  }

  const getSaving = (tier: WholesaleTierDraft) => {
    if (item.sellingPrice <= 0 || tier.wholesalePrice <= 0) return 0
    const pricePerUnit = getPricePerUnit(tier)
    if (pricePerUnit >= item.sellingPrice) return 0
    return Math.round(((item.sellingPrice - pricePerUnit) / item.sellingPrice) * 100)
  }

  const renderFractionSettings = (tier: WholesaleTierDraft, tierIndex: number, fractionType: 'half' | 'quarter') => {
    const fraction = generateFractions(tier).find(f => f.type === fractionType)
    if (!fraction) return null
    
    const configKey = fractionType === 'half' ? 'halfConfig' : 'quarterConfig'
    const config = tier[configKey] || {
      name: fraction.name,
      units: fraction.units,
      price: fraction.price,
      isAuto: true,
      enabled: true,
    }
    const fractionName = fractionType === 'half' ? 'Half (½)' : 'Quarter (¼)'
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-0.5 rounded hover:bg-muted">
            <Settings className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{fractionName} Settings</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Enable</span>
                <Switch
                  checked={fractionType === 'half' ? tier.enableHalf : tier.enableQuarter}
                  onCheckedChange={() => toggleFractionEnable(tierIndex, fractionType)}
                  className="scale-75"
                />
              </div>
            </div>
            
            {(fractionType === 'half' ? tier.enableHalf : tier.enableQuarter) && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-xs">Auto-calculate</span>
                  <Switch
                    checked={config.isAuto}
                    onCheckedChange={() => toggleFractionAuto(tierIndex, fractionType)}
                    className="scale-75"
                  />
                </div>
                
                {!config.isAuto && (
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-[10px]">Custom Name</Label>
                      <Input
                        value={config.name}
                        onChange={(e) => updateFractionConfig(tierIndex, fractionType, { name: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Custom name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Units</Label>
                        <Input
                          type="number"
                          min={1}
                          value={config.units}
                          onChange={(e) => updateFractionConfig(tierIndex, fractionType, { units: parseInt(e.target.value) || 1 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Price (₵)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={config.price}
                          onChange={(e) => updateFractionConfig(tierIndex, fractionType, { price: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

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

  // ── Save default location handler ──
  const handleSaveDefaultLocation = async () => {
    if (!selectedDefaultLocation) {
      toast.error("Please select a default location")
      return
    }
    setIsSavingDefaultLocation(true)
    try {
      const result = await updateItemById(item.id, { defaultLocationId: selectedDefaultLocation.value })
      if (result.success) {
        toast.success("Default location updated")
        onUpdate({ defaultLocationId: selectedDefaultLocation.value })
      } else {
        toast.error(result.error || "Failed to update default location")
      }
    } catch (error) {
      toast.error("An error occurred while saving")
    } finally {
      setIsSavingDefaultLocation(false)
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

            <TabsContent value="set" className="space-y-3 mt-0">
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
                      {/* ── ADDED: remove from this location button ── */}
                      <button
                        onClick={() => {
                          setLocationToUnlink({
                            inventoryId: inv.inventoryId,
                            locationId: inv.locationId,
                            locationName: inv.locationName,
                          });
                          setUnlinkDialogOpen(true);
                        }}
                        className="ml-1 p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                        title="Remove this item from this location"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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

            <TabsContent value="transfer" className="space-y-3 mt-0">
              {transferSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    Transfer created successfully
                  </span>
                </div>
              )}
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

      {/* ══ DEFAULT LOCATION (AUTO‑DISPERSE) ══ */}
      <Card className="border-2 border-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Default Location (Auto‑disperse)</CardTitle>
          </div>
          <CardDescription>
            When receiving this item, it will be auto‑routed here if "Auto‑disperse" is enabled in the receive modal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormSelectInput
            label="Select Default Location"
            options={locationOptions}
            option={selectedDefaultLocation}
            setOption={setSelectedDefaultLocation}
            toolTipText="Manage Locations"
            href="/dashboard/inventory/locations"
          />
          <Button
            type="button"
            onClick={handleSaveDefaultLocation}
            disabled={isSavingDefaultLocation || !selectedDefaultLocation}
            className="w-full"
            size="sm"
          >
            {isSavingDefaultLocation ? "Saving..." : "Save Default Location"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            This location will be used when you receive this item via purchase order with "Auto‑disperse" turned on.
          </p>
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

      {/* ══ WHOLESALE & PACK PRICING ══ */}
      <Card className="border-2 border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Wholesale & Pack Pricing</CardTitle>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addTier}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" /> Add Pack Type
            </Button>
          </div>
          <CardDescription>
            Set pricing for boxes, sacks, packs, etc. Fractions (½, ¼) are auto-calculated.
            Click <Settings className="h-3 w-3 inline" /> to enable/disable or customize fractions.
            Fractions stop when reaching single unit (1 unit).
            All tiers will appear in POS for cashiers to select.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {tiersLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading tiers…</p>
          ) : wholesaleTiers.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 bg-muted/50 rounded-md border border-dashed text-center justify-center">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                No pricing tiers yet. Click "Add Pack Type" to create Box, Sack, or other pack types.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {wholesaleTiers.map((tier, idx) => {
                const fractions = generateFractions(tier)
                const pricePerUnit = getPricePerUnit(tier)
                const saving = getSaving(tier)
                const hasFractions = fractions.length > 0
                const isExpanded = expandedTiers.has(idx)

                return (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    {/* Main Tier Row */}
                    <div className="p-3 bg-card">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Pack Name */}
                        <div className="col-span-4">
                          {tier.packagingUnitId ? (
                            <span className="font-medium text-sm">{tier.packagingUnitName}</span>
                          ) : (
                            <select
                              value={tier.packagingUnitId}
                              onChange={(e) => updateTier(idx, "packagingUnitId", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded-md"
                            >
                              <option value="">Select pack type...</option>
                              {packagingUnits.map(unit => (
                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Units Per Pack */}
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={tier.unitsPerPack === 0 ? "" : tier.unitsPerPack}
                            onChange={(e) =>
                              updateTier(idx, "unitsPerPack", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)
                            }
                            className="h-8 text-sm text-center"
                          />
                        </div>

                        {/* Wholesale Price */}
                        <div className="col-span-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">₵</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              value={tier.wholesalePrice === 0 ? "" : tier.wholesalePrice}
                              onChange={(e) =>
                                updateTier(idx, "wholesalePrice", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                              }
                              className="pl-6 h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Price Info */}
                        <div className="col-span-2 text-xs">
                          <p className="font-medium">₵{pricePerUnit.toFixed(2)}/unit</p>
                          {saving > 0 && (
                            <p className="text-green-600">Save {saving}%</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 text-right flex items-center justify-end gap-1">
                          {hasFractions && (
                            <button
                              type="button"
                              onClick={() => toggleTierExpanded(idx)}
                              className="p-1 rounded hover:bg-muted"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeTier(idx)}
                            className="p-1 rounded hover:bg-red-100 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Fractions Section - Collapsible */}
                    {hasFractions && isExpanded && (
                      <div className="border-t bg-muted/20 p-3 pl-8 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Fractions & Sub-tiers:</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Settings className="h-2.5 w-2.5" /> Click to configure</span>
                          </div>
                        </div>
                        
                        {fractions.map((fraction, fIdx) => {
                          const pricePerUnitFraction = fraction.units > 0 ? fraction.price / fraction.units : 0
                          const isSingleUnit = fraction.units === 1
                          
                          return (
                            <div key={fIdx} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4 flex items-center gap-2">
                                <span className="text-sm">{fraction.name}</span>
                                {renderFractionSettings(tier, idx, fraction.type)}
                              </div>
                              <div className="col-span-2 text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {fraction.units} {isSingleUnit ? 'unit' : 'units'}
                                </Badge>
                                {isSingleUnit && (
                                  <Badge variant="secondary" className="ml-1 text-[9px] bg-blue-100 text-blue-700">
                                    single
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-3">
                                ₵{fraction.price.toFixed(2)}
                              </div>
                              <div className="col-span-2 text-xs">
                                ₵{pricePerUnitFraction.toFixed(2)}/unit
                              </div>
                              <div className="col-span-1">
                                {fraction.isAuto ? (
                                  <Badge variant="secondary" className="text-[9px]">auto</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px]">manual</Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Warning for uneven splits */}
                        {tier.unitsPerPack >= 2 && (tier.unitsPerPack % 2 !== 0) && tier.enableHalf && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            ⚠️ {tier.unitsPerPack} units cannot be split evenly into halves
                          </p>
                        )}
                        {tier.unitsPerPack >= 4 && (tier.unitsPerPack % 4 !== 0) && tier.enableQuarter && (
                          <p className="text-[10px] text-amber-600">
                            ⚠️ {tier.unitsPerPack} units cannot be split evenly into quarters
                          </p>
                        )}
                        
                        {/* Info when fractions are disabled */}
                        {!tier.enableHalf && !tier.enableQuarter && (
                          <p className="text-[10px] text-blue-600 mt-1">
                            ℹ️ Fractions are disabled for this pack. Enable them via the settings icon.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            onClick={handleSaveTiers}
            disabled={isSavingTiers || tiersLoading}
            className="w-full"
            size="sm"
          >
            {isSavingTiers ? "Saving…" : "Save Wholesale & Pack Pricing"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            All pack types and their fractions will appear in POS for cashiers to select.
            Click <Settings className="h-3 w-3 inline" /> on any fraction to enable/disable or customize.
          </p>
        </CardContent>
      </Card>

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

      {/* Confirmation Dialog for removing location (already used above) */}
      <ConfirmationDialog
        open={unlinkDialogOpen}
        onOpenChange={setUnlinkDialogOpen}
        title="Remove from Location"
        description={
          locationToUnlink ? (
            <>
              Are you sure you want to remove <strong>{locationToUnlink.locationName}</strong> from this item?
              <br />
              This will delete all stock records for this item in that location.
            </>
          ) : (
            "Are you sure you want to remove this location from the item?"
          )
        }
        onConfirm={async () => {
          if (!locationToUnlink) return;
          const res = await unlinkItemFromLocation(item.id, locationToUnlink.locationId);
          if (res.success) {
            toast.success(`Removed from ${locationToUnlink.locationName}`);
            const updated = await getItemInventoryLocations(item.id);
            setInventoryLocations(updated);
          } else {
            toast.error(res.error || "Failed to remove location");
          }
          setUnlinkDialogOpen(false);
          setLocationToUnlink(null);
        }}
        isConfirming={false}
        confirmLabel="Remove"
        variant="destructive"
      />
    </div>
  )
}