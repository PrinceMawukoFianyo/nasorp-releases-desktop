"use client"

import { useState, useEffect, useRef } from "react"
import { Package, BarChart3, AlertCircle, FileDown, Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrendingUp, ArrowUpRight } from "lucide-react"

import type { InventoryItem } from "@/types/inventory"
import { InventoryDetailsEnhanced } from "./inventory-details"
import { InventoryListEnhanced } from "./inventory-list"

interface InventoryPageContentProps {
  initialItems: InventoryItem[]
  initialSelectedItem: InventoryItem | null
  orgId: string
}

type StockFilter = "all" | "low_stock" | "out_of_stock"

/* ─── Print helpers (unchanged) ───────────────────────────────────────── */
const PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
  .report-title { font-size: 22px; font-weight: 700; color: #111; }
  .report-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .summary-pills { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
  .pill { padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .pill-red { background: #fee2e2; color: #b91c1c; }
  .pill-orange { background: #fff7ed; color: #c2410c; }
  .section-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; }
  .section-title.red { background: #fee2e2; color: #b91c1c; }
  .section-title.orange { background: #fff7ed; color: #c2410c; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead tr { background: #f3f4f6; }
  th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-orange { background: #fff7ed; color: #c2410c; }
  .red { color: #b91c1c; font-weight: 600; }
  .orange { color: #c2410c; font-weight: 600; }
  .mono { font-family: monospace; font-size: 12px; }
  .detail-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-top: 8px; page-break-inside: avoid; }
  .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 14px; }
  .detail-block { display: flex; flex-direction: column; gap: 4px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; font-weight: 600; }
  .value { font-size: 15px; font-weight: 700; color: #111; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: right; }
  @media print { body { padding: 16px; } @page { margin: 16mm; size: A4 landscape; } }
`

const TABLE_HEADER = `
  <thead>
    <tr>
      <th>Item Name</th><th>ID / SKU</th><th>Total Qty</th>
      <th>Reserved</th><th>Available</th><th>Status</th>
    </tr>
  </thead>`

function getStockStatusFromItem(item: InventoryItem): "out_of_stock" | "low_stock" | "ok" {
  if (item.stockStatus === "OUT_OF_STOCK") return "out_of_stock"
  if (item.stockStatus === "LOW_STOCK") return "low_stock"
  const available = item.totalQuantity - item.reservedQuantity
  if (available <= 0) return "out_of_stock"
  if (available < item.totalQuantity * 0.2) return "low_stock"
  return "ok"
}

function buildTableRows(list: InventoryItem[]): string {
  return list.map(item => {
    const available = item.totalQuantity - item.reservedQuantity
    const status = getStockStatusFromItem(item)
    const colorClass = status === "out_of_stock" ? "red" : "orange"
    const badgeClass = status === "out_of_stock" ? "badge-red" : "badge-orange"
    const label = status === "out_of_stock" ? "Out of Stock" : "Low Stock"
    return `
      <tr>
        <td>${item.name ?? "—"}</td>
        <td class="mono">${item.id}</td>
        <td>${item.totalQuantity}</td>
        <td>${item.reservedQuantity}</td>
        <td class="${colorClass}">${available}</td>
        <td><span class="badge ${badgeClass}">${label}</span></td>
      </tr>`
  }).join("")
}

function buildDetailBlock(item: InventoryItem): string {
  const available = item.totalQuantity - item.reservedQuantity
  const status = getStockStatusFromItem(item)
  return `
    <div class="detail-card">
      <h2 class="section-title ${status === "out_of_stock" ? "red" : "orange"}">Selected Item Detail</h2>
      <div class="detail-grid">
        <div class="detail-block"><span class="label">Item Name</span><span class="value">${item.name ?? "—"}</span></div>
        <div class="detail-block"><span class="label">ID / SKU</span><span class="value mono">${item.id}</span></div>
        <div class="detail-block"><span class="label">Total Quantity</span><span class="value">${item.totalQuantity}</span></div>
        <div class="detail-block"><span class="label">Reserved</span><span class="value">${item.reservedQuantity}</span></div>
        <div class="detail-block"><span class="label">Available</span><span class="value ${status === "out_of_stock" ? "red" : "orange"}">${available}</span></div>
        <div class="detail-block"><span class="label">Status</span><span class="badge ${status === "out_of_stock" ? "badge-red" : "badge-orange"}">${status === "out_of_stock" ? "Out of Stock" : "Low Stock"}</span></div>
      </div>
    </div>`
}

function wrapDocument(title: string, body: string, exportDate: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title} — ${exportDate}</title><style>${PRINT_CSS}</style></head><body>${body}<div class="footer">Inventory Management System — Confidential — ${exportDate}</div></body></html>`
}

function buildCombinedHTML(items: InventoryItem[], selectedItem: InventoryItem | null): string {
  const exportDate = new Date().toLocaleDateString()
  const outOfStock = items.filter(i => getStockStatusFromItem(i) === "out_of_stock")
  const lowStock = items.filter(i => getStockStatusFromItem(i) === "low_stock")
  const body = `
    <div class="report-header">
      <div>
        <div class="report-title">Inventory Alert Report</div>
        <div class="report-meta">Generated: ${exportDate}</div>
        <div class="summary-pills">
          <span class="pill pill-red">Out of Stock: ${outOfStock.length}</span>
          <span class="pill pill-orange">Low Stock: ${lowStock.length}</span>
        </div>
      </div>
    </div>
    ${outOfStock.length > 0 ? `<div class="section-title red">🔴 Out of Stock (${outOfStock.length})</div><table>${TABLE_HEADER}<tbody>${buildTableRows(outOfStock)}</tbody></table>` : ""}
    ${lowStock.length > 0 ? `<div class="section-title orange">🟠 Low Stock (${lowStock.length})</div><table>${TABLE_HEADER}<tbody>${buildTableRows(lowStock)}</tbody></table>` : ""}
    ${selectedItem ? buildDetailBlock(selectedItem) : ""}`
  return wrapDocument("Inventory Alert Report", body, exportDate)
}

function buildOutOfStockHTML(items: InventoryItem[], selectedItem: InventoryItem | null): string {
  const exportDate = new Date().toLocaleDateString()
  const outOfStock = items.filter(i => getStockStatusFromItem(i) === "out_of_stock")
  const isSelectedOutOfStock = selectedItem && getStockStatusFromItem(selectedItem) === "out_of_stock"
  const body = `
    <div class="report-header">
      <div>
        <div class="report-title">Out of Stock Report</div>
        <div class="report-meta">Generated: ${exportDate}</div>
        <div class="summary-pills"><span class="pill pill-red">Out of Stock: ${outOfStock.length}</span></div>
      </div>
    </div>
    ${outOfStock.length > 0 ? `<div class="section-title red">🔴 Out of Stock (${outOfStock.length})</div><table>${TABLE_HEADER}<tbody>${buildTableRows(outOfStock)}</tbody></table>` : "<p>No out of stock items.</p>"}
    ${isSelectedOutOfStock ? buildDetailBlock(selectedItem!) : ""}`
  return wrapDocument("Out of Stock Report", body, exportDate)
}

function buildLowStockHTML(items: InventoryItem[], selectedItem: InventoryItem | null): string {
  const exportDate = new Date().toLocaleDateString()
  const lowStock = items.filter(i => getStockStatusFromItem(i) === "low_stock")
  const isSelectedLowStock = selectedItem && getStockStatusFromItem(selectedItem) === "low_stock"
  const body = `
    <div class="report-header">
      <div>
        <div class="report-title">Low Stock Report</div>
        <div class="report-meta">Generated: ${exportDate}</div>
        <div class="summary-pills"><span class="pill pill-orange">Low Stock: ${lowStock.length}</span></div>
      </div>
    </div>
    ${lowStock.length > 0 ? `<div class="section-title orange">🟠 Low Stock (${lowStock.length})</div><table>${TABLE_HEADER}<tbody>${buildTableRows(lowStock)}</tbody></table>` : "<p>No low stock items.</p>"}
    ${isSelectedLowStock ? buildDetailBlock(selectedItem!) : ""}`
  return wrapDocument("Low Stock Report", body, exportDate)
}

/* ─── Main component with reduced padding ───────────────────────────────── */
export function InventoryPageContent({
  initialItems,
  initialSelectedItem,
  orgId,
}: InventoryPageContentProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(initialSelectedItem)
  const [activeFilter, setActiveFilter] = useState<StockFilter>("all")
  const printFrameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => { setItems(initialItems) }, [initialItems])
  useEffect(() => { setSelectedItem(initialSelectedItem) }, [initialSelectedItem])

  const totalStock = items.reduce((sum, i) => sum + i.totalQuantity, 0)
  const totalReserved = items.reduce((sum, i) => sum + i.reservedQuantity, 0)
  const totalAvailable = totalStock - totalReserved

  const outOfStockItems = items.filter(i => getStockStatusFromItem(i) === "out_of_stock")
  const lowStockItems = items.filter(i => getStockStatusFromItem(i) === "low_stock")

  const visibleItems = activeFilter === "out_of_stock" ? outOfStockItems
                     : activeFilter === "low_stock" ? lowStockItems
                     : items

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item)
    const url = new URL(window.location.href)
    url.searchParams.set("itemId", item.id)
    window.history.pushState({}, "", url.toString())
  }

  const handleItemsUpdate = (updatedItems: InventoryItem[]) => {
    setItems(updatedItems)
    if (selectedItem) {
      const updated = updatedItems.find(i => i.id === selectedItem.id)
      if (updated) setSelectedItem(updated)
    }
  }

  const handleFilterToggle = (filter: "low_stock" | "out_of_stock") => {
    setActiveFilter(prev => prev === filter ? "all" : filter)
  }

  const triggerPrint = (html: string) => {
    let frame = printFrameRef.current
    if (!frame) {
      frame = document.createElement("iframe")
      frame.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;"
      document.body.appendChild(frame)
      printFrameRef.current = frame
    }
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (!doc) return
    doc.open(); doc.write(html); doc.close()
    frame.contentWindow?.focus()
    setTimeout(() => frame!.contentWindow?.print(), 300)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault()
        triggerPrint(buildCombinedHTML(items, selectedItem))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [items, selectedItem])

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        {/* Header with reduced padding: px-6 -> px-4, py-5 -> py-3 */}
        <header className="border-b border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Management</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Monitor and manage stock across all locations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => triggerPrint(buildCombinedHTML(items, selectedItem))} size="sm" className="font-medium h-8">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print All
              </Button>
              <Button variant="outline" onClick={() => triggerPrint(buildLowStockHTML(items, selectedItem))} size="sm" className="font-medium h-8">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Low Stock
              </Button>
              <Button variant="outline" onClick={() => triggerPrint(buildOutOfStockHTML(items, selectedItem))} size="sm" className="font-medium h-8">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Out of Stock
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Reports
              </Button>
            </div>
          </div>

          {/* Stats row - reduced gap, smaller padding */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            <div className="bg-secondary rounded-md p-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center"><Package className="h-3.5 w-3.5 text-primary" /></div>
              <div><p className="text-[10px] text-muted-foreground font-medium">Total Stock</p><p className="text-base font-bold text-foreground">{totalStock}</p></div>
            </div>
            <div className="bg-secondary rounded-md p-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-accent" /></div>
              <div><p className="text-[10px] text-muted-foreground font-medium">Reserved</p><p className="text-base font-bold text-foreground">{totalReserved}</p></div>
            </div>
            <div className="bg-secondary rounded-md p-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center"><ArrowUpRight className="h-3.5 w-3.5 text-green-600" /></div>
              <div><p className="text-[10px] text-muted-foreground font-medium">Available</p><p className="text-base font-bold text-green-600">{totalAvailable}</p></div>
            </div>

            {/* Alert cards column (stacked) - reduced padding */}
            <div className="flex flex-col gap-1.5">
              {/* Out of Stock card */}
              {outOfStockItems.length > 0 && (
                <button onClick={() => handleFilterToggle("out_of_stock")}
                  className={`w-full rounded-md p-2 flex items-center justify-between gap-2 border transition-all
                    ${activeFilter === "out_of_stock" ? "bg-red-100 dark:bg-red-900/30 border-red-400 ring-1 ring-red-400" : "bg-red-50 dark:bg-red-900/10 border-red-200 hover:bg-red-100"}`}>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><AlertCircle className="h-3.5 w-3.5 text-red-600" /></div>
                    <div className="text-left">
                      <p className="text-[10px] text-red-700 font-medium">Out of Stock {activeFilter === "out_of_stock" && <span className="ml-1 text-[9px]">(filtered)</span>}</p>
                      <p className="text-base font-bold text-red-700 leading-tight">{outOfStockItems.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {activeFilter === "out_of_stock" && (
                      <span onClick={(e) => { e.stopPropagation(); setActiveFilter("all") }} className="text-red-400 hover:text-red-700 p-0.5 rounded"><X className="h-2.5 w-2.5" /></span>
                    )}
                    <span onClick={(e) => { e.stopPropagation(); triggerPrint(buildOutOfStockHTML(items, selectedItem)) }} className="text-red-400 hover:text-red-700 p-0.5 rounded"><Printer className="h-3 w-3" /></span>
                  </div>
                </button>
              )}

              {/* Low Stock card */}
              {lowStockItems.length > 0 && (
                <button onClick={() => handleFilterToggle("low_stock")}
                  className={`w-full rounded-md p-2 flex items-center justify-between gap-2 border transition-all
                    ${activeFilter === "low_stock" ? "bg-orange-100 dark:bg-orange-900/30 border-orange-400 ring-1 ring-orange-400" : "bg-orange-50 dark:bg-orange-900/10 border-orange-200 hover:bg-orange-100"}`}>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center"><AlertCircle className="h-3.5 w-3.5 text-orange-600" /></div>
                    <div className="text-left">
                      <p className="text-[10px] text-orange-700 font-medium">Low Stock {activeFilter === "low_stock" && <span className="ml-1 text-[9px]">(filtered)</span>}</p>
                      <p className="text-base font-bold text-orange-700 leading-tight">{lowStockItems.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {activeFilter === "low_stock" && (
                      <span onClick={(e) => { e.stopPropagation(); setActiveFilter("all") }} className="text-orange-400 hover:text-orange-700 p-0.5 rounded"><X className="h-2.5 w-2.5" /></span>
                    )}
                    <span onClick={(e) => { e.stopPropagation(); triggerPrint(buildLowStockHTML(items, selectedItem)) }} className="text-orange-400 hover:text-orange-700 p-0.5 rounded"><Printer className="h-3 w-3" /></span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Active filter banner - reduced padding */}
          {activeFilter !== "all" && (
            <div className={`mt-2 flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium
              ${activeFilter === "out_of_stock" ? "bg-red-50 text-red-700 border border-red-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
              <span>Showing <strong>{activeFilter === "out_of_stock" ? "Out of Stock" : "Low Stock"}</strong> items only ({activeFilter === "out_of_stock" ? outOfStockItems.length : lowStockItems.length})</span>
              <button onClick={() => setActiveFilter("all")} className="flex items-center gap-0.5 text-[10px] underline"><X className="h-2.5 w-2.5" /> Clear</button>
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          <InventoryListEnhanced
            items={visibleItems}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onItemsUpdate={handleItemsUpdate}
          />
          {selectedItem && (
            <InventoryDetailsEnhanced
              item={selectedItem}
              orgId={orgId}
              onItemUpdate={(updatedItem) => {
                const updatedItems = items.map(item => item.id === updatedItem.id ? updatedItem : item)
                setItems(updatedItems)
                setSelectedItem(updatedItem)
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}