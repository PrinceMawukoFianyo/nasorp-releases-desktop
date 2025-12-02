/* "use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, X, Loader2, Package, AlertCircle } from "lucide-react"
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

  const [locationId, setLocationId] = useState("")
  const [adjustmentType, setAdjustmentType] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([])

  const [selectedItem, setSelectedItem] = useState("")
  const [beforeQuantity, setBeforeQuantity] = useState<number>(0)
  const [afterQuantity, setAfterQuantity] = useState<number>(0)
  const [itemNotes, setItemNotes] = useState("")

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

  const filteredItems = useMemo(() => {
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
    setAfterQuantity(currentStock)
    setSearchQuery("")
  }

  const handleAddItem = () => {
    if (!selectedItem || beforeQuantity < 0 || afterQuantity < 0) return

    const newAdjustmentItem: AdjustmentItem = {
      itemId: selectedItem,
      beforeQuantity,
      afterQuantity,
      notes: itemNotes || undefined,
    }

    setAdjustmentItems([...adjustmentItems, newAdjustmentItem])
    setSelectedItem("")
    setBeforeQuantity(0)
    setAfterQuantity(0)
    setItemNotes("")
    setSearchQuery("")
  }

  const handleRemoveItem = (index: number) => {
    setAdjustmentItems(adjustmentItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      category: item?.category?.title || item?.category?.name || "Uncategorized",
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Search and Select Items *</label>
                <Input
                  placeholder="Search by item name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                {searchQuery && filteredItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto">
                    {filteredItems.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item.id)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.sku}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            Stock: {item.inventories?.[0]?.quantity || 0}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {item.category?.title || item.category?.name || "Uncategorized"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Before Quantity *</label>
                        <Input
                          type="number"
                          min="0"
                          value={beforeQuantity}
                          onChange={(e) => setBeforeQuantity(Math.max(0, Number.parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">After Quantity *</label>
                        <Input
                          type="number"
                          min="0"
                          value={afterQuantity}
                          onChange={(e) => setAfterQuantity(Math.max(0, Number.parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Difference</label>
                        <div className={`h-10 px-3 rounded-md flex items-center font-semibold ${
                          afterQuantity > beforeQuantity ? 'bg-green-100 text-green-700' :
                          afterQuantity < beforeQuantity ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {afterQuantity > beforeQuantity && '+'}
                          {afterQuantity - beforeQuantity}
                        </div>
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
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
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
                        variant="USost"
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
            type="submit"
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
      </form>
    </div>
  )
} */