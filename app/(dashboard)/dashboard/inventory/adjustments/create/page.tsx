"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, X, Loader2, Package, AlertCircle, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBulkAdjustment, getItemsForAdjustment, getLocationsForAdjustment } from "@/actions/stock-adjustments"

interface AdjustmentItem {
  itemId: string
  beforeQuantity: number
  afterQuantity: number
  notes?: string
  serialNumbers?: string[]
}

const adjustmentTypes = [
  { value: "STOCk_COUNT", label: "Stock Count" },
  { value: "DAMAGE", label: "Damage" },
  { value: "THEFT", label: "Theft" },
  { value: "EXPIRED", label: "Expired" },
  { value: "WRITE_OFF", label: "Write Off" },
  { value: "CORRECTION", label: "Correction" },
  { value: "OTHER", label: "Other" },
]

export default function CreateAdjustmentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [locationId, setLocationId] = useState("")
  const [adjustmentType, setAdjustmentType] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([])

  const [selectedItem, setSelectedItem] = useState("")
  const [beforeQuantity, setBeforeQuantity] = useState<number>(0)
  // changeAmount: positive = add stock, negative = remove stock
  const [changeAmount, setChangeAmount] = useState<number | string>(0)
  const [itemNotes, setItemNotes] = useState("")

  // Derived — afterQuantity always = current stock + change entered
  const afterQuantity = beforeQuantity + (Number(changeAmount) || 0)
  const isChangeValid = afterQuantity >= 0

  useEffect(() => {
    const loadData = async () => {
      try {
        const locResult = await getLocationsForAdjustment()
        if (locResult.success) setLocations(locResult.locations)
      } catch (error) {
        console.error("Error loading locations:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (locationId) {
      loadItemsForLocation()
    }
  }, [locationId])

  const loadItemsForLocation = async () => {
    try {
      const itemsResult = await getItemsForAdjustment(locationId)
      if (itemsResult.success) {
        setItems(itemsResult.items)
      }
    } catch (error) {
      console.error("Error loading items:", error)
    }
  }

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [items, searchQuery])

  const getCurrentStock = (itemId: string): number => {
    const item = items.find(i => i.id === itemId)
    if (!item?.inventories || item.inventories.length === 0) return 0
    return item.inventories[0].quantity || 0
  }

  const handleSelectItem = (itemId: string) => {
    setSelectedItem(itemId)
    const currentStock = getCurrentStock(itemId)
    setBeforeQuantity(currentStock)
    setChangeAmount(0)          // start with no change
    setSearchQuery("")
    setIsDropdownOpen(false)
  }

  const handleAddItem = () => {
    if (!selectedItem) return
    if (!isChangeValid) {
      alert(`Cannot reduce stock by ${Math.abs(Number(changeAmount))} — current stock is only ${beforeQuantity}`)
      return
    }
    if (Number(changeAmount) === 0 || changeAmount === "") {
      alert("Please enter a change amount (positive to add, negative to reduce)")
      return
    }

    const newAdjustmentItem: AdjustmentItem = {
      itemId: selectedItem,
      beforeQuantity,
      afterQuantity,       // derived: beforeQuantity + changeAmount
      notes: itemNotes || undefined,
    }

    setAdjustmentItems([...adjustmentItems, newAdjustmentItem])
    setSelectedItem("")
    setBeforeQuantity(0)
    setChangeAmount(0)
    setItemNotes("")
    setSearchQuery("")
  }

  const handleRemoveItem = (index: number) => {
    setAdjustmentItems(adjustmentItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!locationId || !adjustmentType || !reason || adjustmentItems.length === 0) {
      alert("Please fill in all required fields and add at least one item")
      return
    }

    setIsLoading(true)
    try {
      const result = await createBulkAdjustment({
        locationId,
        adjustmentType: adjustmentType as any,
        reason,
        notes: notes || undefined,
        items: adjustmentItems,
      })

      if (result.success && result.adjustmentId) {
        router.push(`/dashboard/inventory/adjustments/${result.adjustmentId}`)
        router.refresh()
      } else {
        alert(result.error || "Failed to create adjustment")
      }
    } catch (error) {
      alert("An error occurred while creating the adjustment")
    } finally {
      setIsLoading(false)
    }
  }

  const getItemDetails = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    return {
      name: item?.name || "Unknown Item",
      sku: item?.sku || "N/A",
      category: item?.category?.title || "Uncategorized",
      currentStock: getCurrentStock(itemId)
    }
  }

  const calculateDifference = (before: number, after: number) => {
    const diff = after - before
    return {
      value: diff,
      isIncrease: diff > 0,
      isDecrease: diff < 0,
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading adjustment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/inventory/adjustments" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Adjustments
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Stock Adjustment</h1>
          <p className="text-gray-600 mt-1">Adjust inventory levels for multiple items in one operation</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">Location *</label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">Adjustment Type *</label>
                <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">Reason *</label>
              <Input
                placeholder="Provide a reason for this adjustment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {!locationId && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">Please select a location first to add items for adjustment</p>
              </div>
            </CardContent>
          </Card>
        )}

        {locationId && (
          <Card>
            <CardHeader>
              <CardTitle>Add Items to Adjust</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700">Search and Select Items *</label>
                
                <div className="relative">
                  <div className="relative">
                    <Input
                      placeholder="Search by item name or SKU..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setIsDropdownOpen(true)
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Dropdown Results */}
                  {isDropdownOpen && filteredItems.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b text-xs text-gray-600 font-medium">
                        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
                      </div>
                      {filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectItem(item.id)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-b-0 transition-colors focus:bg-blue-50 focus:outline-none"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.sku}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                              Stock: {item.inventories?.[0]?.quantity || 0}
                            </span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate max-w-[100px]">
                              {item.category?.title || "Uncategorized"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No Results */}
                  {isDropdownOpen && searchQuery && filteredItems.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No items found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedItem && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">{getItemDetails(selectedItem).name}</p>
                        <p className="text-sm text-gray-600">{getItemDetails(selectedItem).sku}</p>
                        <p className="text-sm text-blue-700 font-medium mt-1">
                          Current Stock: {getItemDetails(selectedItem).currentStock}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItem("")}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Current Stock — read-only */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Current Stock
                        </label>
                        <div className="h-10 px-3 rounded-md border border-gray-200 bg-gray-50 flex items-center font-semibold text-gray-700">
                          {beforeQuantity}
                        </div>
                        <p className="text-xs text-gray-400">Locked — actual stock on hand</p>
                      </div>

                      {/* Change Amount — the only editable field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Change Amount *
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 10 or -4"
                          value={changeAmount}
                          onChange={(e) => {
                            const raw = e.target.value
                            // Allow empty string (user is mid-typing) or any integer
                            if (raw === "" || raw === "-") {
                              setChangeAmount(raw)
                            } else {
                              setChangeAmount(Number.parseInt(raw) || 0)
                            }
                          }}
                          className={`font-semibold ${
                            !isChangeValid
                              ? "border-red-400 focus-visible:ring-red-400"
                              : Number(changeAmount) > 0
                                ? "border-green-400 focus-visible:ring-green-400"
                                : Number(changeAmount) < 0
                                  ? "border-orange-400 focus-visible:ring-orange-400"
                                  : ""
                          }`}
                        />
                        <p className="text-xs text-gray-400">
                          Positive to add &nbsp;·&nbsp; Negative to reduce
                        </p>
                      </div>

                      {/* New Stock — derived, shown for confirmation */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          New Stock Level
                        </label>
                        <div className={`h-10 px-3 rounded-md border flex items-center font-bold text-lg ${
                          !isChangeValid
                            ? "bg-red-50 border-red-300 text-red-600"
                            : Number(changeAmount) > 0
                              ? "bg-green-50 border-green-300 text-green-700"
                              : Number(changeAmount) < 0
                                ? "bg-orange-50 border-orange-300 text-orange-700"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                          {!isChangeValid
                            ? <span className="text-sm font-semibold">❌ Below zero</span>
                            : (
                              <>
                                {Number(changeAmount) > 0 && <span className="text-xs mr-1 font-normal text-green-600">▲</span>}
                                {Number(changeAmount) < 0 && <span className="text-xs mr-1 font-normal text-orange-500">▼</span>}
                                {afterQuantity}
                              </>
                            )
                          }
                        </div>
                        <p className="text-xs text-gray-400">
                          {beforeQuantity} {Number(changeAmount) >= 0 ? "+" : "−"} {Math.abs(Number(changeAmount))} = {isChangeValid ? afterQuantity : "invalid"}
                        </p>
                      </div>

                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700">Item Notes</label>
                      <Input
                        placeholder="Add notes for this item (optional)..."
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!isChangeValid || changeAmount === "" || Number(changeAmount) === 0}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Adjustment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {adjustmentItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Adjustment Items ({adjustmentItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adjustmentItems.map((item, index) => {
                  const details = getItemDetails(item.itemId)
                  const diff = calculateDifference(item.beforeQuantity, item.afterQuantity)
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{details.name}</p>
                          <p className="text-sm text-gray-500">{details.sku} • {details.category}</p>
                          {item.notes && (
                            <p className="text-xs text-gray-600 mt-1 italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Before</p>
                            <p className="text-lg font-semibold text-gray-900">{item.beforeQuantity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">After</p>
                            <p className="text-lg font-semibold text-gray-900">{item.afterQuantity}</p>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <p className="text-xs text-gray-500">Change</p>
                            <p className={`text-lg font-bold ${
                              diff.isIncrease ? 'text-green-600' :
                              diff.isDecrease ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {diff.isIncrease && '+'}{diff.value}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-4"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional notes about this adjustment (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/inventory/adjustments">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || adjustmentItems.length === 0 || !locationId || !adjustmentType || !reason}
            className="bg-pink-600 hover:bg-pink-700 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Adjustment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}