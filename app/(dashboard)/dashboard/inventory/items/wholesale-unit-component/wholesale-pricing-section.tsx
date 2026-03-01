"use client"

import { useEffect } from "react"
import {
  Plus, Trash2, Package2, ExternalLink, RefreshCw,
  Scissors, XCircle, AlertTriangle, Info,
} from "lucide-react"
import { Input }  from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge }  from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { PackagingUnitRecord } from "@/actions/packaging-units"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WholesaleTierDraft = {
  _key:             string
  packagingUnitId:  string
  unitsPerPack:     string
  wholesalePrice:   string
  // auto-generated sub-tier metadata (not saved to DB directly)
  _parentKey?:      string
  _subFraction?:    "half" | "quarter"
  _userEditedPrice?: boolean   // true if user manually typed a price on a sub-tier
}

interface Props {
  sellingPrice:   number
  packagingUnits: PackagingUnitRecord[]
  tiers:          WholesaleTierDraft[]
  onChange:       (tiers: WholesaleTierDraft[]) => void
  onRefreshUnits: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function getUnitName(units: PackagingUnitRecord[], id: string) {
  return units.find(u => u.id === id)?.name ?? ""
}

function findSubUnit(units: PackagingUnitRecord[], prefix: string, baseName: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, " ").trim()
  const target = norm(`${prefix} ${baseName}`)
  return units.find(u => norm(u.name) === target)
}

function checkDiv(count: number, name: string) {
  const halfRaw    = count / 2
  const quarterRaw = count / 4
  const canHalf    = Number.isInteger(halfRaw)    && halfRaw    >= 1
  const canQuarter = Number.isInteger(quarterRaw) && quarterRaw >= 1
  return {
    canHalf,    halfUnits:    canHalf    ? halfRaw    : null,
    canQuarter, quarterUnits: canQuarter ? quarterRaw : null,
    halfWarn:    !canHalf    ? `${count} ÷ 2 = ${halfRaw} — "${name}" cannot be split into halves evenly`    : null,
    quarterWarn: !canQuarter ? `${count} ÷ 4 = ${quarterRaw.toFixed(2)} — "${name}" cannot be split into quarters evenly` : null,
  }
}

function autoPrice(parentPrice: string, divisor: number) {
  const p = parseFloat(parentPrice)
  return !isNaN(p) && p > 0 ? (p / divisor).toFixed(2) : ""
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WholesalePricingSection({
  sellingPrice,
  packagingUnits,
  tiers,
  onChange,
}: Props & { onRefreshUnits: () => void }) {

  // ── Auto-inject / sync sub-tiers whenever tiers change ───────────────────
  useEffect(() => {
    let next = [...tiers]
    let dirty = false

    for (const parent of next.filter(t => !t._parentKey)) {
      const count = parseInt(parent.unitsPerPack)
      const valid = !isNaN(count) && count >= 2
      const name  = getUnitName(packagingUnits, parent.packagingUnitId)
      const div   = valid ? checkDiv(count, name || "pack") : null

      // ── Helper: upsert a sub-tier ────────────────────────────────────────
      const upsert = (
        fraction: "half" | "quarter",
        can: boolean,
        units: number | null,
        divisor: number,
        prefix: string,
      ) => {
        const existing = next.find(t => t._parentKey === parent._key && t._subFraction === fraction)

        if (can && valid && units !== null) {
          const price  = autoPrice(parent.wholesalePrice, divisor)
          const unitId = findSubUnit(packagingUnits, prefix, name)?.id ?? ""

          if (!existing) {
            // Insert after last child of this parent
            const insertAfter = next.reduceRight((found, t, i) =>
              found === -1 && (t._key === parent._key || t._parentKey === parent._key) ? i : found, -1)
            const row: WholesaleTierDraft = {
              _key: uid(), packagingUnitId: unitId,
              unitsPerPack: String(units), wholesalePrice: price,
              _parentKey: parent._key, _subFraction: fraction, _userEditedPrice: false,
            }
            next = [...next.slice(0, insertAfter + 1), row, ...next.slice(insertAfter + 1)]
            dirty = true
          } else {
            // Sync units always
            let updated = existing.unitsPerPack !== String(units)
              ? { ...existing, unitsPerPack: String(units) }
              : existing
            // Sync price only if user hasn't overridden it
            if (!existing._userEditedPrice && existing.wholesalePrice !== price) {
              updated = { ...updated, wholesalePrice: price }
            }
            // Sync unit id if it was blank and we now have a match
            if (!existing.packagingUnitId && unitId) {
              updated = { ...updated, packagingUnitId: unitId }
            }
            if (updated !== existing) {
              next = next.map(t => t._key === existing._key ? updated : t)
              dirty = true
            }
          }
        } else {
          // Division not possible → remove any existing sub-tier
          if (existing) {
            next = next.filter(t => t._key !== existing._key)
            dirty = true
          }
        }
      }

      upsert("half",    div?.canHalf    ?? false, div?.halfUnits    ?? null, 2, "Half")
      upsert("quarter", div?.canQuarter ?? false, div?.quarterUnits ?? null, 4, "Quarter")
    }

    if (dirty) onChange(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiers, packagingUnits])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addRow = () =>
    onChange([...tiers, { _key: uid(), packagingUnitId: "", unitsPerPack: "", wholesalePrice: "" }])

  const removeRow = (key: string) =>
    onChange(tiers.filter(t => t._key !== key && t._parentKey !== key))

  const updateRow = (
    key: string,
    field: keyof Omit<WholesaleTierDraft, "_key" | "_parentKey" | "_subFraction" | "_userEditedPrice">,
    value: string,
  ) => {
    onChange(tiers.map(t => {
      if (t._key !== key) return t
      const u: WholesaleTierDraft = { ...t, [field]: value }

      // Auto-fill parent price from sellingPrice × units when units change
      if (field === "unitsPerPack" && !t._parentKey && sellingPrice > 0) {
        const n = parseInt(value)
        if (!isNaN(n) && n >= 2) u.wholesalePrice = (sellingPrice * n).toFixed(2)
      }

      // Mark sub-tier price as user-edited
      if (field === "wholesalePrice" && t._parentKey) {
        u._userEditedPrice = true
      }

      return u
    }))
  }

  // ── Display ───────────────────────────────────────────────────────────────

  const ppu = (t: WholesaleTierDraft) => {
    const u = parseInt(t.unitsPerPack), p = parseFloat(t.wholesalePrice)
    return (!isNaN(u) && u >= 1 && !isNaN(p) && p > 0) ? (p / u).toFixed(2) : null
  }

  const saving = (t: WholesaleTierDraft) => {
    const v = parseFloat(ppu(t) ?? "")
    if (!isNaN(v) && sellingPrice > 0 && v < sellingPrice)
      return `${(((sellingPrice - v) / sellingPrice) * 100).toFixed(0)}% cheaper/unit vs single`
    return null
  }

  const usedIds   = new Set(tiers.map(t => t.packagingUnitId).filter(Boolean))
  const parentCount = tiers.filter(t => !t._parentKey).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded">
            <Package2 className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Wholesale / Bulk Pricing</h4>
            <p className="text-xs text-muted-foreground">
              Enter a quantity → Half &amp; Quarter tiers appear &amp; price automatically.
              Edit any price to override. Divisibility errors show inline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { /* onRefreshUnits handled by parent */ }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Reload packaging units</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link href="/dashboard/inventory/items/wholesale-unit-component" target="_blank"
            className="inline-flex items-center gap-1 text-xs text-primary underline">
            <ExternalLink className="h-3 w-3" />Manage units
          </Link>
        </div>
      </div>

      {/* Single-unit reference */}
      {sellingPrice > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md border border-dashed text-xs">
          <Badge variant="outline" className="font-normal shrink-0">Single unit</Badge>
          <span className="text-muted-foreground">1 unit</span>
          <span className="ml-auto font-semibold">GHS {sellingPrice.toFixed(2)}</span>
        </div>
      )}

      {/* No units warning */}
      {packagingUnits.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          <Package2 className="h-4 w-4 shrink-0" />
          <span>
            No packaging units found.{" "}
            <Link href="/dashboard/inventory/items/wholesale-unit-component" target="_blank"
              className="underline font-medium">Create some first</Link>{" "}
            (e.g. Box, Half Box, Quarter Box), then click refresh.
          </span>
        </div>
      )}

      {/* Tier list */}
      {tiers.length > 0 && packagingUnits.length > 0 && (
        <div className="space-y-1.5">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-1 pb-0.5">
            <p className="col-span-4 text-xs font-medium text-muted-foreground">Container Type</p>
            <p className="col-span-3 text-xs font-medium text-muted-foreground">Units / Pack</p>
            <p className="col-span-4 text-xs font-medium text-muted-foreground">Wholesale Price (GHS)</p>
            <div className="col-span-1" />
          </div>

          {tiers.map(tier => {
            const isChild   = !!tier._parentKey
            const ppuVal    = ppu(tier)
            const savingVal = saving(tier)

            // Divisibility info (parent only)
            const count     = parseInt(tier.unitsPerPack)
            const name      = getUnitName(packagingUnits, tier.packagingUnitId)
            const divInfo   = !isChild && !isNaN(count) && count >= 2 && tier.packagingUnitId
              ? checkDiv(count, name)
              : null

            // Available units for select (allow current id through)
            const available = packagingUnits.filter(u => !usedIds.has(u.id) || u.id === tier.packagingUnitId)

            const subLabel = tier._subFraction === "half"    ? "½ Half"
                           : tier._subFraction === "quarter" ? "¼ Quarter"
                           : null

            return (
              <div key={tier._key}
                className={`rounded-lg border transition-colors ${
                  isChild
                    ? "ml-6 border-dashed border-amber-200 bg-amber-50/40 dark:bg-amber-950/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="p-2.5 space-y-1.5">
                  <div className="grid grid-cols-12 gap-2 items-start">

                    {/* Container type */}
                    <div className="col-span-4 space-y-0.5">
                      <div className="flex items-center gap-1">
                        {subLabel && (
                          <Badge variant="outline"
                            className="shrink-0 text-[9px] px-1 py-0 h-[18px] font-bold text-amber-700 border-amber-300 bg-amber-100">
                            {subLabel}
                          </Badge>
                        )}
                        <Select
                          value={tier.packagingUnitId || ""}
                          onValueChange={v => updateRow(tier._key, "packagingUnitId", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Sub-tier missing unit hint */}
                      {isChild && !tier.packagingUnitId && (
                        <p className="text-[10px] text-amber-700 flex items-center gap-1 pl-0.5">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          Add a "{subLabel?.replace("½ ", "Half ").replace("¼ ", "Quarter ")}" unit to use this tier
                        </p>
                      )}
                    </div>

                    {/* Units per pack */}
                    <div className="col-span-3">
                      <Input
                        type="number" min={isChild ? "1" : "2"} step="1"
                        placeholder="e.g. 6"
                        value={tier.unitsPerPack}
                        onChange={e => updateRow(tier._key, "unitsPerPack", e.target.value)}
                        readOnly={isChild}
                        className={`h-8 text-sm ${isChild ? "bg-muted/50 cursor-default" : ""}`}
                        title={isChild ? "Auto-calculated from parent quantity" : undefined}
                      />
                    </div>

                    {/* Wholesale price */}
                    <div className="col-span-4 space-y-0.5">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground select-none">GHS</span>
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={tier.wholesalePrice}
                          onChange={e => updateRow(tier._key, "wholesalePrice", e.target.value)}
                          className={`h-8 text-sm pl-10 ${isChild && !tier._userEditedPrice ? "text-blue-600 dark:text-blue-400" : ""}`}
                        />
                      </div>
                      {isChild && !tier._userEditedPrice && tier.wholesalePrice && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 pl-0.5">
                          <Info className="h-2.5 w-2.5 shrink-0" />
                          Auto-calculated — type to override
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-center pt-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => removeRow(tier._key)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {isChild ? "Remove sub-tier" : "Remove tier + sub-tiers"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Price hints */}
                  {(ppuVal || savingVal) && (
                    <div className="flex items-center gap-3 pl-0.5 text-[10px] text-muted-foreground">
                      {ppuVal    && <span>GHS {ppuVal} / unit</span>}
                      {savingVal && <span className="text-green-600 font-medium">{savingVal}</span>}
                    </div>
                  )}
                </div>

                {/* Divisibility errors / success note (parent only) */}
                {divInfo && (divInfo.halfWarn || divInfo.quarterWarn || divInfo.canHalf || divInfo.canQuarter) && (
                  <div className="px-2.5 pb-2 space-y-1">
                    {divInfo.halfWarn && (
                      <div className="flex items-start gap-1.5 p-1.5 rounded bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
                        <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-700 dark:text-red-400">{divInfo.halfWarn}</p>
                      </div>
                    )}
                    {divInfo.quarterWarn && (
                      <div className="flex items-start gap-1.5 p-1.5 rounded bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
                        <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-700 dark:text-red-400">{divInfo.quarterWarn}</p>
                      </div>
                    )}
                    {(divInfo.canHalf || divInfo.canQuarter) && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Scissors className="h-3 w-3 shrink-0 text-amber-500" />
                        <span>
                          {[
                            divInfo.canHalf    && `½ Half = ${divInfo.halfUnits} units`,
                            divInfo.canQuarter && `¼ Quarter = ${divInfo.quarterUnits} units`,
                          ].filter(Boolean).join(" · ")}{" "}
                          sub-tiers auto-added below ↓
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add pack size */}
      {packagingUnits.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}
          className="gap-1.5 text-xs h-8 border-dashed"
          disabled={parentCount >= packagingUnits.length}>
          <Plus className="h-3.5 w-3.5" />Add Pack Size
        </Button>
      )}

      {tiers.length === 0 && packagingUnits.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Leave empty to sell at single-unit price only.
        </p>
      )}
    </div>
  )
}