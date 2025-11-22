"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Item {
  id: string
  name: string
  sku: string
  description?: string
  unitCost?: number
}

interface ItemSelectorProps {
  items: Item[]
  selectedItemId?: string
  onItemSelect: (item: Item) => void
  label?: string
  disabled?: boolean
}

export default function ItemSelector({
  items,
  selectedItemId,
  onItemSelect,
  label = "Select Item",
  disabled = false,
}: ItemSelectorProps) {
  // Find the selected item to display its name
  const selectedItem = useMemo(() => 
    items.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  )

  const handleSelect = (itemId: string) => {
    const selectedItem = items.find((item) => item.id === itemId)
    if (selectedItem) {
      onItemSelect(selectedItem)
    }
  }

  return (
    <div className="w-full space-y-2">
      <Label htmlFor="item-select" className="text-sm font-medium">
        {label}
      </Label>
      <Select 
        value={selectedItemId || undefined} 
        onValueChange={handleSelect} 
        disabled={disabled}
      >
        <SelectTrigger id="item-select" className="w-full">
          {selectedItem ? (
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{selectedItem.name}</span>
              <span className="text-xs text-muted-foreground">{selectedItem.sku}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Choose an item...</span>
          )}
        </SelectTrigger>
        <SelectContent>
          {items.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">No items available</div>
          ) : (
            items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.sku}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}