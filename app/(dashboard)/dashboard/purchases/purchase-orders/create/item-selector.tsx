"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState("")
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const selectedItem = useMemo(
    () => items.find(i => i.id === selectedItemId),
    [items, selectedItemId]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
    )
  }, [items, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const handleSelect = (item: Item) => {
    onItemSelect(item)
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onItemSelect({ id: "", name: "", sku: "" })
    setSearch("")
  }

  const isSelected = !!selectedItem

  return (
    <div className="w-full space-y-2 relative" ref={containerRef}>
      <Label className="text-sm font-medium">{label}</Label>

      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          disabled && "opacity-50 cursor-not-allowed",
          // ── SELECTED state: teal background + teal border ──
          isSelected
            ? "border-[#1D9E75] border-[1.5px] bg-[#E1F5EE] dark:bg-[#085041] dark:border-[#5DCAA5]"
            : "border-border bg-background hover:bg-muted/50",
          open && !isSelected && "ring-2 ring-ring ring-offset-1"
        )}
      >
        {selectedItem ? (
          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            <span className="font-medium truncate text-[#085041] dark:text-[#9FE1CB]">
              {selectedItem.name}
            </span>
            <span className="text-xs text-[#0F6E56] dark:text-[#5DCAA5]">
              {selectedItem.sku}
              {selectedItem.unitCost
                ? ` · GHS ${selectedItem.unitCost.toFixed(2)}`
                : ""}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground flex-1 text-left">Choose an item…</span>
        )}

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {isSelected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === "Enter" && handleClear(e as any)}
              className="p-0.5 rounded hover:bg-[#9FE1CB]/40 text-[#0F6E56] dark:text-[#5DCAA5]"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronsUpDown
            className={cn(
              "w-4 h-4",
              isSelected
                ? "text-[#1D9E75] dark:text-[#5DCAA5]"
                : "text-muted-foreground"
            )}
          />
        </div>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute z-50 w-full rounded-md border border-border bg-popover shadow-lg mt-1">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                className="h-8 pl-8 text-sm"
                onKeyDown={e => {
                  if (e.key === "Escape") { setOpen(false); setSearch("") }
                  if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0])
                }}
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No items match "{search}"
              </div>
            ) : (
              filtered.map(item => {
                const active = item.id === selectedItemId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      // ── SELECTED row in dropdown: teal left border + teal bg ──
                      active
                        ? "bg-[#E1F5EE] dark:bg-[#085041] border-l-[3px] border-l-[#1D9E75] dark:border-l-[#5DCAA5]"
                        : "hover:bg-accent hover:text-accent-foreground border-l-[3px] border-l-transparent"
                    )}
                  >
                    <Check
                      className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        active
                          ? "opacity-100 text-[#1D9E75] dark:text-[#5DCAA5]"
                          : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "font-medium truncate",
                        active ? "text-[#085041] dark:text-[#9FE1CB]" : ""
                      )}>
                        {item.name}
                      </p>
                      <p className={cn(
                        "text-xs truncate",
                        active
                          ? "text-[#0F6E56] dark:text-[#5DCAA5]"
                          : "text-muted-foreground"
                      )}>
                        SKU: {item.sku}
                        {item.unitCost ? ` · GHS ${item.unitCost.toFixed(2)}` : ""}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              {filtered.length} of {items.length} items · Enter to select first
            </div>
          )}
        </div>
      )}
    </div>
  )
}