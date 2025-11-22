"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Plus, X, Loader2, Package } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBulkTransfer, getItemsForTransfer, getLocationsForTransfer } from "@/actions/transfer-stock-history"

interface TransferItem {
  itemId: string
  quantity: number
  notes?: string
}

export default function CreateTransferPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const [fromLocationId, setFromLocationId] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [notes, setNotes] = useState("")
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])

  const [selectedItem, setSelectedItem] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [selectedNotes, setSelectedNotes] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const [locResult, itemsResult] = await Promise.all([
          getLocationsForTransfer(), 
          getItemsForTransfer()
        ])

        if (locResult.success) setLocations(locResult.locations)
        if (itemsResult.success) setItems(itemsResult.items)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [items, searchQuery])

  const handleAddItem = () => {
    if (!selectedItem || selectedQuantity <= 0) return

    const newTransferItem: TransferItem = {
      itemId: selectedItem,
      quantity: selectedQuantity,
      notes: selectedNotes || undefined,
    }

    setTransferItems([...transferItems, newTransferItem])
    setSelectedItem("")
    setSelectedQuantity(1)
    setSelectedNotes("")
    setSearchQuery("")
  }

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fromLocationId || !toLocationId || transferItems.length === 0) {
      alert("Please fill in all required fields and add at least one item")
      return
    }

    if (fromLocationId === toLocationId) {
      alert("From and To locations must be different")
      return
    }

    setIsLoading(true)
    try {
      const result = await createBulkTransfer({
        fromLocationId,
        toLocationId,
        items: transferItems,
        notes: notes || undefined,
      })

      if (result.success && result.transferId) {
        router.push(`/dashboard/inventory/transfers/${result.transferId}`)
        router.refresh()
      } else {
        alert(result.error || "Failed to create transfer")
      }
    } catch (error) {
      alert("An error occurred while creating the transfer")
    } finally {
      setIsLoading(false)
    }
  }

  const getItemDetails = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    return {
      name: item?.name || "Unknown Item",
      sku: item?.sku || "N/A",
      category: item?.category?.title || item?.category?.name || "Uncategorized"
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading transfer data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/inventory/transfers" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Transfers
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Stock Transfer</h1>
          <p className="text-gray-600 mt-1">Transfer multiple items between locations in one operation</p>
        </div>
        <Link href="/dashboard/inventory/stock">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Stock
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">From Location *</label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source location" />
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
                <label className="block text-sm font-semibold text-gray-900">To Location *</label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((loc) => loc.id !== fromLocationId)
                      .map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Items to Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search and Select Items *</label>
              <Input
                placeholder="Search by item name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <Select 
                value={selectedItem} 
                onValueChange={(value) => {
                  setSelectedItem(value)
                  setSearchQuery("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Or select from dropdown" />
                </SelectTrigger>
                <SelectContent>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-gray-500">{item.sku}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-results" disabled>
                      No items found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {searchQuery && filteredItems.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto">
                  {filteredItems.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item.id)
                        setSearchQuery("")
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600">{item.sku}</p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {item.category?.title || item.category?.name || "Uncategorized"}
                      </span>
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
                      <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                      <Input
                        type="number"
                        min="1"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Item Notes</label>
                      <Input
                        placeholder="Add notes for this item (optional)..."
                        value={selectedNotes}
                        onChange={(e) => setSelectedNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    onClick={handleAddItem} 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Transfer
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {transferItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Items ({transferItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferItems.map((item, index) => {
                    const details = getItemDetails(item.itemId)
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{details.name}</p>
                              <p className="text-xs text-gray-500">{details.category}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-600">
                          {details.sku}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">{item.quantity}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                          {item.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transfer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any notes about this transfer (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/inventory/transfers">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading || transferItems.length === 0 || !fromLocationId || !toLocationId}
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
                Create Transfer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}