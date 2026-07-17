"use client"
// components/details/order-tabs-bar.tsx
//
// Tab strip for the POS cart panel: "Walk-in Customer" plus one tab per
// connected staff phone. Includes a "Combine orders" flow — pick 2+ tabs,
// then choose merge-into-one vs keep-separate-but-batch-print.

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OrderTabSummary {
  id: string
  label: string
  itemCount: number
}

interface OrderTabsBarProps {
  tabs: OrderTabSummary[]
  activeTabId: string
  onSelect: (id: string) => void
  onCloseTab: (id: string) => void
  onCombine: (ids: string[], mode: "merge" | "batch") => void
}

export function OrderTabsBar({ tabs, activeTabId, onSelect, onCloseTab, onCombine }: OrderTabsBarProps) {
  const [combineMode, setCombineMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const exitCombineMode = () => {
    setCombineMode(false)
    setSelected([])
  }

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-2 overflow-x-auto">
      {tabs.map((t) => (
        <div key={t.id} className="flex items-center shrink-0">
          {combineMode && t.id !== "walkin" && (
            <input
              type="checkbox"
              checked={selected.includes(t.id)}
              onChange={() => toggleSelect(t.id)}
              className="mr-1"
            />
          )}
          <button
            onClick={() => !combineMode && onSelect(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap",
              activeTabId === t.id ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
            {t.itemCount > 0 && (
              <span className="text-xs bg-slate-100 rounded-full px-1.5">{t.itemCount}</span>
            )}
          </button>
          {t.id !== "walkin" && !combineMode && (
            <button
              onClick={() => onCloseTab(t.id)}
              title="Close this tab"
              className="p-1 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      <div className="ml-auto flex items-center gap-2 py-1.5 shrink-0">
        {combineMode ? (
          <>
            <span className="text-xs text-slate-400">{selected.length} selected</span>
            <button
              disabled={selected.length < 2}
              onClick={() => {
                onCombine(selected, "merge")
                exitCombineMode()
              }}
              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 disabled:opacity-40"
            >
              Merge into one
            </button>
            <button
              disabled={selected.length < 2}
              onClick={() => {
                onCombine(selected, "batch")
                exitCombineMode()
              }}
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 disabled:opacity-40"
            >
              Print separately
            </button>
            <button onClick={exitCombineMode} className="text-xs text-slate-400">
              Cancel
            </button>
          </>
        ) : (
          tabs.length > 2 && (
            <button onClick={() => setCombineMode(true)} className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap">
              Combine orders
            </button>
          )
        )}
      </div>
    </div>
  )
}