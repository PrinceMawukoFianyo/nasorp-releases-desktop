"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from 'lucide-react'
import ItemSelector from "./item-selector"
import { formatCurrency } from "../po-utils"
import { Decimal } from "@prisma/client/runtime/library"

export interface LineItem {
  id?: string
  itemId: string
  itemName: string
  itemSku: string
  quantity: number
  unitPrice: string | number
  taxRate: number
  lineTotal: Decimal | number
}

interface LineItemsManagerProps {
  lineItems: LineItem[]
  onLineItemsChange: (items: LineItem[]) => void
  availableItems: Array<{ id: string; name: string; sku: string; description?: string }>
  disabled?: boolean
}

export default function LineItemsManager({
  lineItems,
  onLineItemsChange,
  availableItems,
  disabled = false,
}: LineItemsManagerProps) {
  const [localItems, setLocalItems] = useState<LineItem[]>(lineItems)

  const calculateLineTotal = useCallback((quantity: number, unitPrice: string | number, taxRate: number) => {
    const price = typeof unitPrice === "string" ? parseFloat(unitPrice) : unitPrice
    const subtotal = quantity * price
    const tax = subtotal * (taxRate / 100)
    return subtotal + tax
  }, [])

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      itemId: "",
      itemName: "",
      itemSku: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      lineTotal: 0,
    }
    const updated = [...localItems, newItem]
    setLocalItems(updated)
    onLineItemsChange(updated)
  }

  const removeLineItem = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index)
    setLocalItems(updated)
    onLineItemsChange(updated)
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...localItems]
    updated[index] = { ...updated[index], [field]: value }

    // Recalculate line total if quantity, unitPrice, or taxRate changes
    if (["quantity", "unitPrice", "taxRate"].includes(field)) {
      updated[index].lineTotal = calculateLineTotal(
        updated[index].quantity,
        updated[index].unitPrice,
        updated[index].taxRate
      )
    }

    setLocalItems(updated)
    onLineItemsChange(updated)
  }

  // Fixed: Accept index directly instead of trying to find it
  const handleItemSelect = (index: number, item: any) => {
    // Update all item fields at once
    const updated = [...localItems]
    updated[index] = {
      ...updated[index],
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      unitPrice: item.unitCost || updated[index].unitPrice,
    }
    
    // Recalculate line total with new price if unitCost exists
    if (item.unitCost) {
      updated[index].lineTotal = calculateLineTotal(
        updated[index].quantity,
        item.unitCost,
        updated[index].taxRate
      )
    }
    
    setLocalItems(updated)
    onLineItemsChange(updated)
  }

  const calculateTotal = () => {
    return localItems.reduce((sum, item) => {
      const total = typeof item.lineTotal === "number" 
        ? item.lineTotal 
        : typeof item.lineTotal === "string"
        ? parseFloat(item.lineTotal)
        : (item.lineTotal as any).toNumber()
      return sum + total
    }, 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Line Items</span>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {localItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No line items added yet. Click "Add Item" to get started.
          </div>
        ) : (
          <>
            {localItems.map((item, index) => (
              <div key={item.id || index} className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Item Selector - spans both columns on small screens */}
                  <div className="md:col-span-2">
                    <ItemSelector
                      items={availableItems}
                      selectedItemId={item.itemId}
                      onItemSelect={(selectedItem) =>
                        handleItemSelect(index, selectedItem)  // Fixed: Pass index
                      }
                      label="Item"
                      disabled={disabled}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, "quantity", parseInt(e.target.value) || 0)
                      }
                      disabled={disabled}
                      placeholder="1"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                      disabled={disabled}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Tax Rate */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={(e) =>
                        updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)
                      }
                      disabled={disabled}
                      placeholder="0"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Line Total</Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-semibold">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    disabled={disabled || localItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="border-t pt-4 flex justify-end">
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}