// app/dashboard/pos/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart, Search, Trash2, User, MapPin,
  DollarSign, CreditCard, Banknote, X, Check,
  Receipt, Loader2, FileText, Plus, Minus,
  Package2, ChevronDown, ScanLine, Zap,
  CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, Camera, Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  getPOSItems,
  searchPOSItems,
  getPOSCategories,
  getPOSCustomers,
  getPOSLocations,
  createPOSSale,
  createQuickCustomer,
} from "@/actions/pos"
import { lookupByBarcode } from "@/actions/barcode-actions"
import type { PricingTierRecord } from "@/actions/pricing-tiers"
import { cn } from "@/lib/utils"
import { CameraBarcodeScanner } from "@/app/(dashboard)/dashboard/sales/pos/components/details/camera-barcode-scanner"
import { PhoneScannerPairing } from "@/app/(dashboard)/dashboard/sales/pos/components/details/phone-scanner-pairing"
import { usePermission } from "@/hooks/usePermissions"


// ─────────────────────────────────────────────────────────────────────────────
// BARCODE SCANNER HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxGap = 50,
}: {
  onScan: (value: string) => void
  enabled?: boolean
  minLength?: number
  maxGap?: number
}) {
  const buffer   = useRef("")
  const lastTime = useRef(0)
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const val = buffer.current.trim()
    buffer.current = ""
    lastTime.current = 0
    if (val.length >= minLength) onScan(val)
  }, [onScan, minLength])

  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const editable = (e.target as HTMLElement)?.isContentEditable
      if (tag === "input" || tag === "textarea" || tag === "select" || editable) return
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return

      const now = Date.now()
      if (lastTime.current && now - lastTime.current > maxGap) buffer.current = ""
      lastTime.current = now

      if (timer.current) clearTimeout(timer.current)

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        flush()
        return
      }

      if (e.key.length === 1) buffer.current += e.key

      timer.current = setTimeout(() => {
        if (buffer.current.trim().length >= minLength) flush()
        else buffer.current = ""
      }, maxGap * 3)
    }

    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [enabled, maxGap, minLength, flush])
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN FEEDBACK OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

type ScanStatus = "scanning" | "found" | "not_found" | "low_stock" | "error" | null
type ScanFeedback = { status: ScanStatus; itemName?: string; quantity?: number; message?: string }

function ScanOverlay({ fb }: { fb: ScanFeedback }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!fb.status) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 1100)
    return () => clearTimeout(t)
  }, [fb])

  if (!show || !fb.status) return null

  const cfg = {
    found:     { bg: "bg-green-50 dark:bg-green-950/60",  border: "border-green-400",  Icon: CheckCircle2,  ic: "text-green-500",  label: "Added to Cart" },
    not_found: { bg: "bg-red-50   dark:bg-red-950/60",    border: "border-red-400",    Icon: XCircle,       ic: "text-red-500",    label: "Not Found"     },
    low_stock: { bg: "bg-amber-50 dark:bg-amber-950/60",  border: "border-amber-400",  Icon: AlertTriangle, ic: "text-amber-500",  label: "Low Stock"     },
    scanning:  { bg: "bg-blue-50  dark:bg-blue-950/60",   border: "border-blue-400",   Icon: ScanLine,      ic: "text-blue-500",   label: "Looking up…"   },
    error:     { bg: "bg-red-50   dark:bg-red-950/60",    border: "border-red-400",    Icon: XCircle,       ic: "text-red-500",    label: "Error"         },
  }[fb.status]

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-end p-4">
      <div className={cn(
        "flex items-center gap-3 px-5 py-3 rounded-xl border-2 backdrop-blur-sm shadow-2xl",
        cfg.bg, cfg.border,
        "animate-in slide-in-from-top-3 fade-in duration-150"
      )}>
        <cfg.Icon className={cn("h-6 w-6 shrink-0", cfg.ic)} />
        <div>
          <p className="font-bold text-sm leading-tight">{cfg.label}</p>
          {fb.itemName && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{fb.itemName}</p>
          )}
          {fb.message && !fb.itemName && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{fb.message}</p>
          )}
        </div>
        {fb.quantity !== undefined && fb.quantity > 0 && (
          <span className="ml-2 px-2.5 py-1 rounded-lg text-sm font-bold bg-white/70 dark:bg-black/30">
            {fb.quantity} left
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CartLine {
  cartLineId:            string
  itemId:                string
  name:                  string
  sku:                   string
  stock:                 number
  taxRate:               number
  sellingPrice:          number
  saleMode:              "single" | "wholesale"
  tierId:                string | null
  tierName:              string | null
  packQuantity:          number
  unitsPerPack:          number
  wholesalePricePerPack: number
  totalUnits:            number
  lineUnitPrice:         number
  lineTotal:             number
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function makeSingleLine(item: any, stock: number): CartLine {
  const taxRate = typeof item.tax === "number" && item.tax > 0 ? item.tax : 0
  return {
    cartLineId: uid(), itemId: item.id, name: item.name,
    sku: item.sku || "", stock, taxRate,
    sellingPrice: item.sellingPrice || 0,
    saleMode: "single", tierId: null, tierName: null,
    packQuantity: 1, unitsPerPack: 1,
    wholesalePricePerPack: item.sellingPrice || 0,
    totalUnits: 1, lineUnitPrice: item.sellingPrice || 0,
    lineTotal: item.sellingPrice || 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL TIER GENERATION
// ─────────────────────────────────────────────────────────────────────────────

type VirtualTier = PricingTierRecord & { isVirtual: true; fracLabel: "½" | "¼" | "⅓"; fracDisplay: string }
type DisplayTier = PricingTierRecord | VirtualTier

function isVirtual(t: DisplayTier): t is VirtualTier { return (t as VirtualTier).isVirtual === true }

function buildDisplayTiers(dbTiers: PricingTierRecord[]): DisplayTier[] {
  if (dbTiers.length === 0) return []
  const sorted   = [...dbTiers].sort((a, b) => b.unitsPerPack - a.unitsPerPack)
  const maxUnits = sorted[0].unitsPerPack
  const maxTier  = sorted[0]
  const existingRatios = new Set(sorted.map(t => Math.round((t.unitsPerPack / maxUnits) * 100)))
  const virtuals: VirtualTier[] = []

  const halfUnits = Math.floor(maxUnits / 2)
  if (halfUnits >= 1 && !existingRatios.has(50)) {
    virtuals.push({
      id: `virtual-half-${maxTier.id}`, itemId: maxTier.itemId,
      packagingUnitId: maxTier.packagingUnitId,
      packagingUnitName: `½ Half ${maxTier.packagingUnitName}`,
      unitsPerPack: halfUnits, wholesalePrice: maxTier.wholesalePrice / 2,
      pricePerUnit: maxTier.pricePerUnit,
      isVirtual: true, fracLabel: "½", fracDisplay: `½ Half ${maxTier.packagingUnitName}`,
    })
  }
  const quarterUnits = Math.floor(maxUnits / 4)
  if (quarterUnits >= 1 && !existingRatios.has(25)) {
    virtuals.push({
      id: `virtual-quarter-${maxTier.id}`, itemId: maxTier.itemId,
      packagingUnitId: maxTier.packagingUnitId,
      packagingUnitName: `¼ Quarter ${maxTier.packagingUnitName}`,
      unitsPerPack: quarterUnits, wholesalePrice: maxTier.wholesalePrice / 4,
      pricePerUnit: maxTier.pricePerUnit,
      isVirtual: true, fracLabel: "¼", fracDisplay: `¼ Quarter ${maxTier.packagingUnitName}`,
    })
  }
  return [...sorted, ...virtuals].sort((a, b) => b.unitsPerPack - a.unitsPerPack)
}

function tierStyle(t: DisplayTier) {
  if (isVirtual(t)) {
    if (t.fracLabel === "½") return { icon: "½", sel: "bg-orange-500 border-orange-500", hover: "hover:bg-orange-50 border-slate-200", badge: "bg-orange-100 text-orange-700", selBadge: "bg-white/20 text-white", price: "text-orange-600" }
    if (t.fracLabel === "¼") return { icon: "¼", sel: "bg-yellow-500 border-yellow-500", hover: "hover:bg-yellow-50 border-slate-200", badge: "bg-yellow-100 text-yellow-700", selBadge: "bg-white/20 text-white", price: "text-yellow-600" }
    return { icon: "⅓", sel: "bg-lime-500 border-lime-500", hover: "hover:bg-lime-50 border-slate-200", badge: "bg-lime-100 text-lime-700", selBadge: "bg-white/20 text-white", price: "text-lime-600" }
  }
  return { icon: null, sel: "bg-amber-500 border-amber-500", hover: "hover:bg-amber-50 border-slate-200", badge: "bg-amber-100 text-amber-700", selBadge: "bg-white/20 text-white", price: "text-amber-600" }
}

// ─────────────────────────────────────────────────────────────────────────────
// PACK SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function PackSelector({
  line, tiers, onChange, disabled,
}: {
  line: CartLine; tiers: PricingTierRecord[]
  onChange: (update: Partial<CartLine>) => void; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const isWholesale     = line.saleMode === "wholesale"
  const displayTiers    = buildDisplayTiers(tiers)

  const selectSingle = () => {
    onChange({ saleMode: "single", tierId: null, tierName: null, unitsPerPack: 1,
      wholesalePricePerPack: line.sellingPrice, totalUnits: 1,
      lineUnitPrice: line.sellingPrice, lineTotal: line.sellingPrice, packQuantity: 1 })
    setOpen(false)
  }

  const selectTier = (tier: DisplayTier) => {
    onChange({ saleMode: "wholesale",
      tierId: isVirtual(tier) ? `${tier.fracLabel}-${tier.id}` : tier.id,
      tierName: tier.packagingUnitName, packQuantity: 1, unitsPerPack: tier.unitsPerPack,
      wholesalePricePerPack: tier.wholesalePrice, totalUnits: tier.unitsPerPack,
      lineUnitPrice: tier.pricePerUnit, lineTotal: tier.wholesalePrice })
    setOpen(false)
  }

  const adjustQty = (delta: number) => {
    const next = Math.max(1, line.packQuantity + delta)
    const nextUnits = next * line.unitsPerPack
    if (nextUnits > line.stock) { toast.error(`Only ${line.stock} units in stock`); return }
    onChange({ packQuantity: next, totalUnits: nextUnits, lineTotal: line.wholesalePricePerPack * next })
  }

  const setQty = (raw: string) => {
    const n = parseInt(raw)
    if (isNaN(n) || n < 1) return
    const nextUnits = n * line.unitsPerPack
    if (nextUnits > line.stock) { toast.error(`Only ${line.stock} units in stock`); return }
    onChange({ packQuantity: n, totalUnits: nextUnits, lineTotal: line.wholesalePricePerPack * n })
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}
            className={`h-7 text-[10px] px-2 gap-1 max-w-[150px] ${
              isWholesale
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-slate-200 text-slate-700"
            }`}>
            {isWholesale
              ? <Package2 className="h-3 w-3 text-amber-600 shrink-0" />
              : <ShoppingCart className="h-3 w-3 text-slate-400 shrink-0" />}
            <span className="truncate">{isWholesale && line.tierName ? line.tierName : "Single"}</span>
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" side="top" className="w-[280px] p-0 shadow-xl">
          <div className="px-3 py-2 bg-slate-50 border-b">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sell as</p>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            <button type="button" onClick={selectSingle}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-[3px] ${
                !isWholesale ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-slate-50"
              }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${!isWholesale ? "bg-blue-500" : "bg-slate-100"}`}>
                <ShoppingCart className={`h-3.5 w-3.5 ${!isWholesale ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${!isWholesale ? "text-blue-700" : "text-slate-800"}`}>Single unit</p>
                <p className="text-[10px] text-slate-500">GHS {line.sellingPrice.toFixed(2)} / unit</p>
              </div>
              {!isWholesale && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
            </button>

            {displayTiers.length > 0 && <div className="mx-3 my-1 border-t border-dashed border-slate-200" />}

            {displayTiers.map(tier => {
              const isSelected = line.tierId === tier.id ||
                (isVirtual(tier) && line.tierId === `${tier.fracLabel}-${tier.id}`)
              const s = tierStyle(tier)
              const saving = line.sellingPrice > 0 && tier.pricePerUnit < line.sellingPrice
                ? Math.round(((line.sellingPrice - tier.pricePerUnit) / line.sellingPrice) * 100) : 0

              return (
                <button key={tier.id} type="button" onClick={() => selectTier(tier)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-[3px] ${
                    isSelected
                      ? `border-l-[3px] ${s.sel.split(" ")[0].replace("bg-", "border-")} bg-opacity-10 ${s.hover.replace("hover:", "")}`
                      : `border-transparent ${s.hover}`
                  }`}
                  style={isSelected ? { backgroundColor: "rgba(var(--row-sel-rgb,245,158,11),0.08)" } : {}}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${isSelected ? s.sel : s.badge}`}>
                    {s.icon
                      ? <span className={isSelected ? "text-white" : ""}>{s.icon}</span>
                      : <Package2 className={`h-3.5 w-3.5 ${isSelected ? "text-white" : s.price}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-slate-800">{tier.packagingUnitName}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? s.selBadge : s.badge} ${isSelected ? s.sel : ""}`}>
                        {tier.unitsPerPack} units
                      </span>
                      {isVirtual(tier) && <span className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 font-medium">auto</span>}
                      {saving > 0 && <span className="text-[9px] font-bold text-green-600">↓{saving}%</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      GHS {tier.wholesalePrice.toFixed(2)} / pack · GHS {tier.pricePerUnit.toFixed(2)}/unit
                    </p>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                </button>
              )
            })}
            {tiers.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-muted-foreground italic text-center">
                No pack tiers set for this item.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
        <button type="button" onClick={() => adjustQty(-1)}
          disabled={disabled || line.packQuantity <= 1}
          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors">
          <Minus className="w-3 h-3" />
        </button>
        <div className="flex flex-col items-center justify-center px-1 min-w-[2.4rem] border-x border-slate-200">
          <Input type="number" min="1" value={line.packQuantity}
            onChange={e => setQty(e.target.value)} onFocus={e => e.target.select()}
            disabled={disabled}
            className="h-4 w-8 text-center font-bold text-xs p-0 border-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0" />
          {isWholesale && (
            <span className="text-[8px] text-amber-500 font-semibold leading-none whitespace-nowrap">
              {line.totalUnits} units
            </span>
          )}
        </div>
        <button type="button" onClick={() => adjustQty(1)} disabled={disabled}
          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-40 transition-colors">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN POS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function POSPage() {
  const router = useRouter()

  const [categories,       setCategories]       = useState<any[]>([])
  const [items,            setItems]            = useState<any[]>([])
  const [customers,        setCustomers]        = useState<any[]>([])
  const [locations,        setLocations]        = useState<any[]>([])
  const [tiersMap,         setTiersMap]         = useState<Record<string, PricingTierRecord[]>>({})

  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery,      setSearchQuery]      = useState("")
  const [cart,             setCart]             = useState<CartLine[]>([])

  // ── CHANGED: default to "ALL" so products load immediately on mount ────────
  const [selectedLocation, setSelectedLocation] = useState("ALL")

  // ──────────────────────────────────────────────────────────────────────────

  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [customerSearch,   setCustomerSearch]   = useState("")

  const [showCustomerModal,    setShowCustomerModal]    = useState(false)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [showPaymentModal,     setShowPaymentModal]     = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [showPhonePairing, setShowPhonePairing] = useState(false)
  const [showInvoiceModal,     setShowInvoiceModal]     = useState(false)

  // "Connect Phone Scanner" is gated behind its own dedicated permission,
  // pos.phone_scanner (added as a POS sub-module in permissions.ts). Existing
  // roles created before this permission existed need the one-time patch on
  // the Roles & Permissions page to pick it up; new roles get it as a normal
  // checkbox in RoleForm going forward.
  const { hasPermission } = usePermission()
  const canConnectPhoneScanners = hasPermission("pos.phone_scanner")

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE_MONEY">("CASH")
  const [discount,      setDiscount]      = useState(0)
  const [shipping,      setShipping]      = useState(0)

  const [newCustomer,     setNewCustomer]     = useState({ name: "", email: "", phone: "" })
  const [lastOrderId,     setLastOrderId]     = useState("")
  const [lastOrderNumber, setLastOrderNumber] = useState("")

  const [isLoading,        setIsLoading]        = useState(true)
  const [isProcessing,     setIsProcessing]     = useState(false)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scanFeedback,  setScanFeedback]  = useState<ScanFeedback>({ status: null })
  const [lastScanValue, setLastScanValue] = useState<string | null>(null)
  const [isLookingUp,   setIsLookingUp]   = useState(false)
  const scanLock = useRef(false)

  const scannerEnabled =
    !showCustomerModal && !showAddCustomerModal &&
    !showPaymentModal  && !showInvoiceModal     && !isLoading

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => { loadData() }, [])

  // ── CHANGED: "" = nothing selected → skip loading; "ALL" = all items ───────
  useEffect(() => {
    if (selectedLocation === "") return // no location chosen yet — show nothing

    const locId = selectedLocation === "ALL" ? undefined : selectedLocation
    loadItems(locId)


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation])
  // ──────────────────────────────────────────────────────────────────────────

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [catRes, custRes, locRes] = await Promise.all([
        getPOSCategories(), getPOSCustomers(), getPOSLocations(),
      ])
      if (catRes.success  && catRes.data)  setCategories(catRes.data)
      if (custRes.success && custRes.data) setCustomers(custRes.data)
      if (locRes.success  && locRes.data)  setLocations(locRes.data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load POS data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadItems = async (locationId?: string) => {
    try {
      const result = await getPOSItems(locationId)
      if (result.success && result.data) {
        // Normalise stock: if totalStock/availableStock is missing or zero,
        // fall back to summing the raw inventories array so no item is hidden.
        const normalised = result.data.map((item: any) => {
          const inventoryTotal = Array.isArray(item.inventories)
            ? item.inventories.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0)
            : 0
          return {
            ...item,
            totalStock:     ((item.totalStock     ?? 0) > 0) ? item.totalStock     : inventoryTotal,
            availableStock: ((item.availableStock  ?? 0) > 0) ? item.availableStock : inventoryTotal,
          }
        })
        setItems(normalised)
        buildTiersMap(normalised)
        setSearchQuery("")
      }
    } catch (err) { console.error(err) }
  }

  const buildTiersMap = (itemList: any[]) => {
    const map: Record<string, PricingTierRecord[]> = {}
    for (const item of itemList) {
      if (item.pricingTiers?.length) map[item.id] = item.pricingTiers
    }
    setTiersMap(map)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredItems = items.filter(item =>
    selectedCategory === "all" || item.categoryId === selectedCategory
  )

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  )

  // ── Scan feedback helper ───────────────────────────────────────────────────

  const showFb = useCallback((fb: ScanFeedback, ms = 1200) => {
    setScanFeedback(fb)
    setTimeout(() => setScanFeedback({ status: null }), ms)
  }, [])

  // ── addToCart ──────────────────────────────────────────────────────────────

  const addToCart = useCallback((item: any): boolean => {
    // "ALL" and specific locations are both valid — never block adding to cart

    const inventoryTotal = Array.isArray(item.inventories)
      ? item.inventories.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0)
      : 0
    const isAllLocations = selectedLocation === "ALL"
    const stock = isAllLocations
      ? (item.totalStock ?? item.availableStock ?? inventoryTotal)
      : (item.inventories?.find((i: any) => i.locationId === selectedLocation)?.quantity ?? 0)

    if (stock <= 0) { toast.error(`${item.name} is out of stock`); return false }

    setCart(prev => {
      const existing = prev.find(l => l.itemId === item.id && l.saleMode === "single")
      if (existing) {
        if (existing.totalUnits >= stock) { toast.error(`Only ${stock} in stock`); return prev }
        return prev.map(l => l.cartLineId === existing.cartLineId
          ? { ...l, packQuantity: l.packQuantity + 1, totalUnits: l.totalUnits + 1,
              lineTotal: l.wholesalePricePerPack * (l.packQuantity + 1) }
          : l
        )
      }
      return [...prev, makeSingleLine(item, stock)]
    })
    return true
  }, [selectedLocation])

  // ── Barcode scan handler ───────────────────────────────────────────────────

  const handleScan = useCallback(async (scannedValue: string) => {
    if (scanLock.current) return
    scanLock.current = true

    setLastScanValue(scannedValue)
    setIsLookingUp(true)
    showFb({ status: "scanning" }, 6000)

    try {
      const lv    = scannedValue.trim().toLowerCase()
      const local = items.find(item =>
        item.barcode?.toLowerCase() === lv ||
        item.sku?.toLowerCase()     === lv
      )

      if (local) {
        const isAll = !selectedLocation || selectedLocation === "ALL"
        const stock = isAll
          ? (local.totalStock ?? local.inventories?.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0) ?? 0)
          : (local.inventories?.find((i: any) => i.locationId === selectedLocation)?.quantity ?? 0)

        if (stock <= 0) {
          showFb({ status: "not_found", itemName: local.name, message: "Out of stock here" })
          toast.warning(`"${local.name}" is out of stock at this location`)
          return
        }

        const added = addToCart(local)
        if (added) {
          showFb({ status: stock <= 5 ? "low_stock" : "found", itemName: local.name, quantity: stock })
          if (stock <= 5) toast.warning(`Added "${local.name}" — only ${stock} left!`)
          else toast.success(`${local.name} added to cart`)
        }
        return
      }

      const result = await lookupByBarcode(scannedValue.trim())

      if (!result.found || !result.item) {
        showFb({ status: "not_found", message: `"${scannedValue}" not found` })
        toast.error("Item not found", {
          description: `No item matched barcode "${scannedValue}"`,
          action: {
            label:   "Assign Barcode",
            onClick: () => window.open(
              `/dashboard/inventory/barcodes?assign=${encodeURIComponent(scannedValue)}`,
              "_blank"
            ),
          },
        })
        return
      }

      const matched = items.find(i => i.id === result.item!.id)

      if (!matched) {
        showFb({ status: "error", message: `"${result.item.name}" not available here` })
        toast.error("Item not available at this location")
        return
      }

      const isAllLoc = !selectedLocation || selectedLocation === "ALL"
      const stock = isAllLoc
        ? (matched.totalStock ?? matched.inventories?.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0) ?? 0)
        : (matched.inventories?.find((i: any) => i.locationId === selectedLocation)?.quantity ?? 0)

      if (stock <= 0) {
        showFb({ status: "not_found", itemName: matched.name, message: "Out of stock" })
        toast.warning(`"${matched.name}" is out of stock`)
        return
      }

      const added = addToCart(matched)
      if (added) {
        showFb({ status: stock <= 5 ? "low_stock" : "found", itemName: matched.name, quantity: stock })
        if (stock <= 5) toast.warning(`Added "${matched.name}" — only ${stock} left!`)
        else toast.success(`${matched.name} added to cart`)
      }

    } catch (err: any) {
      showFb({ status: "error", message: err.message })
      toast.error("Scan error", { description: err.message })
    } finally {
      setIsLookingUp(false)
      setTimeout(() => { scanLock.current = false }, 300)
    }
  }, [items, selectedLocation, addToCart, showFb])

  useBarcodeScanner({ onScan: handleScan, enabled: scannerEnabled })

  const handleCameraScan = useCallback((value: string) => {
    setShowCameraScanner(false)
    handleScan(value)
  }, [handleScan])

  const closeCameraScanner = useCallback(() => {
    setShowCameraScanner(false)
  }, [])

  // Scans coming in from a paired staff phone land here the same way a
  // local camera scan does — the dialog stays open since multiple staff
  // scans can arrive over time, not just one.
  const closePhonePairing = useCallback(() => {
    setShowPhonePairing(false)
  }, [])

  // ── Cart helpers ───────────────────────────────────────────────────────────

  const updateLine = useCallback((cartLineId: string, update: Partial<CartLine>) => {
    setCart(prev => prev.map(l => l.cartLineId === cartLineId ? { ...l, ...update } : l))
  }, [])

  const removeLine = (cartLineId: string) =>
    setCart(prev => prev.filter(l => l.cartLineId !== cartLineId))

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal   = cart.reduce((s, l) => s + l.lineTotal, 0)
  const totalTax   = cart.reduce((s, l) => s + (l.taxRate > 0 ? l.lineTotal * (l.taxRate / 100) : 0), 0)
  const grandTotal = subtotal + totalTax + shipping - discount

  // ── Sale submission ────────────────────────────────────────────────────────

  const handleCompleteSale = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return }

    // "ALL" or empty = All Locations mode — pass null and let the server
    // resolve the best location per item from actual stock levels.
    const effectiveLocation = (!selectedLocation || selectedLocation === "ALL")
      ? null
      : selectedLocation

    for (const line of cart) {
      if (line.totalUnits > line.stock) {
        toast.error(
          `Not enough stock for "${line.name}". Need ${line.totalUnits} units but only ${line.stock} available.`,
          { duration: 5000 }
        )
        return
      }
    }

    setIsProcessing(true)
    try {
      const result = await createPOSSale({
        customerId:   selectedCustomer || undefined,
        locationId:   effectiveLocation ?? undefined,
        paymentMethod,
        discount,
        shippingCost: shipping,
        notes:        "POS Sale",
        lines: cart.map(line => ({
          itemId:    line.itemId,
          quantity:  line.totalUnits,
          unitPrice: line.lineUnitPrice,
          taxRate:   line.taxRate,
          notes: line.saleMode === "wholesale"
            ? JSON.stringify({
                tierId: line.tierId, tierName: line.tierName,
                packQty: line.packQuantity, unitsPerPack: line.unitsPerPack,
                wholesalePricePerPack: line.wholesalePricePerPack,
              })
            : undefined,
        })),
      })

      if (result.success && result.orderId && result.orderNumber) {
        setLastOrderId(result.orderId)
        setLastOrderNumber(result.orderNumber)
        setShowPaymentModal(false)
        setShowInvoiceModal(true)
        toast.success("Sale completed!")
        await loadItems(effectiveLocation ?? undefined)
      } else {
        toast.error(result.error || "Failed to complete sale")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while processing the sale")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomer.name) { toast.error("Name is required"); return }
    setIsAddingCustomer(true)
    try {
      const result = await createQuickCustomer(newCustomer)
      if (result.success && result.data) {
        toast.success("Customer added")
        setCustomers(prev => [...prev, result.data])
        setSelectedCustomer(result.data.id)
        setShowAddCustomerModal(false)
        setShowCustomerModal(false)
        setNewCustomer({ name: "", email: "", phone: "" })
      } else {
        toast.error(result.error || "Failed to add customer")
      }
    } catch { toast.error("An error occurred") }
    finally { setIsAddingCustomer(false) }
  }

  const resetPOS = () => {
    setCart([]); setSelectedCustomer(""); setDiscount(0); setShipping(0)
    setShowInvoiceModal(false); setLastOrderId(""); setLastOrderNumber("")
    setLastScanValue(null)
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
  const selectedLocationData  = locations.find(l => l.id === selectedLocation)

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading POS...</p>
        </div>
      </div>
    )
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">

      {/* ── Scan feedback overlay ── */}
      <ScanOverlay fb={scanFeedback} />

      {/* ── Header ── */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 truncate">BUSINESS INVENTORY</h1>
              <p className="hidden sm:block text-xs text-slate-500">Point of Sale System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">

            {/* ── Scanner status badge ── */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all",
              scannerEnabled
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            )}>
              <div className={cn(
                "h-2 w-2 rounded-full",
                scannerEnabled
                  ? isLookingUp ? "bg-blue-500 animate-ping" : "bg-green-500 animate-pulse"
                  : "bg-slate-300"
              )} />
              <ScanLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isLookingUp
                  ? "Looking up…"
                  : scannerEnabled
                    ? lastScanValue ? `Last: ${lastScanValue.slice(0, 16)}` : "Scanner ready"
                    : "Scanner paused"
                }
              </span>
              {isLookingUp && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>

              {/* ── Scan menu: this device's camera, or a paired staff phone ── */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                    title="Scan a barcode"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Scan with Camera</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-1.5">
                  <button
                    onClick={() => setShowCameraScanner(true)}
                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50"
                  >
                    <Camera className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Scan with Camera</p>
                      <p className="text-xs text-slate-400">Use this device's own camera</p>
                    </div>
                  </button>

                  {canConnectPhoneScanners ? (
                    <button
                      onClick={() => setShowPhonePairing(true)}
                      className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50"
                    >
                      <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Connect Phone Scanner</p>
                        <p className="text-xs text-slate-400">Let a staff member's phone scan into this register</p>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed">
                      <Smartphone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-500">Connect Phone Scanner</p>
                        <p className="text-xs text-slate-400">Requires POS scanner permission</p>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

            {lastOrderId && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                <Button onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/simple-receipt`, "_blank")}
                  size="sm" variant="ghost" className="h-8 gap-1 px-2 text-blue-700 hover:bg-blue-100" title="Simple Receipt">
                  <Receipt className="w-3 h-3" /> <span className="hidden sm:inline">Simple Receipt</span>
                </Button>
                <div className="h-4 w-px bg-blue-300 hidden sm:block" />
                <Button onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/invoice`, "_blank")}
                  size="sm" variant="ghost" className="h-8 gap-1 px-2 text-blue-700 hover:bg-blue-100" title="Full Invoice">
                  <FileText className="w-3 h-3" /> <span className="hidden sm:inline">Full Invoice</span>
                </Button>
              </div>
            )}

            <Button onClick={() => router.push("/dashboard/sales/pos")}
              size="sm" variant="outline" className="h-8 gap-1 px-2 sm:px-3" title="View Orders">
              <Receipt className="w-3 h-3" /> <span className="hidden sm:inline">View Orders</span>
            </Button>

            <div className="hidden md:block text-right">
             <p className="text-sm font-semibold text-slate-900">
                Invoice No: #{lastOrderNumber || "000000"}
              </p>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString("en-GH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Selection bar ── */}
        <div className="px-3 sm:px-6 py-3 bg-slate-50 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto sm:min-w-[200px]">
              <User className="w-4 h-4 text-slate-400" />
              <button onClick={() => setShowCustomerModal(true)}
                className="flex-1 text-left text-sm font-medium text-slate-700 truncate hover:text-blue-600 transition-colors">
                {selectedCustomerData ? selectedCustomerData.name : "Select Customer"}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-lg border shadow-sm w-full sm:w-auto sm:min-w-[200px]">
              <MapPin className="w-4 h-4 text-slate-400" />
              <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
                className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer">
                {/* ── CHANGED: "Select Location" is now a true placeholder that hides products ── */}
                <option value="">Select Location</option>
                <option value="ALL">📦 All Locations</option>
                <option disabled>──────────────</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>

            {/* Scan hint strip */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-600">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>Scan any barcode, QR or SKU anywhere on this page to instantly add to cart</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* ── Products panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="Search product code or name… (or just scan!)"
                value={searchQuery}
                onChange={e => {
                  const q = e.target.value
                  setSearchQuery(q)
                  clearTimeout((window as any).__posSearchTimer)
                  ;(window as any).__posSearchTimer = setTimeout(async () => {
                    try {
                      // Convert "ALL" → undefined so the backend returns all items.
                      // Passing the literal string "ALL" would be treated as a real
                      // location ID, match nothing, and return an empty list.
                      const locId = (!selectedLocation || selectedLocation === "ALL")
                        ? undefined
                        : selectedLocation
                      const res = q.trim()
                        ? await searchPOSItems(q.trim(), locId)
                        : await getPOSItems(locId)
                      if (res.success && res.data) {
                        setItems(res.data)
                        buildTiersMap(res.data)
                      }
                    } catch (err) { console.error("POS search error:", err) }
                  }, 300)
                }}
                className="pl-11 h-11" />
            </div>
          </div>

          <div className="p-4 bg-white border-b overflow-x-auto">
            <div className="flex gap-2">
              <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm"
                onClick={() => setSelectedCategory("all")} className="whitespace-nowrap">
                All Products
              </Button>
              {categories.map(cat => (
                <Button key={cat.id} size="sm"
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.id)} className="whitespace-nowrap">
                  {cat.title}
                  {cat._count?.items > 0 && <Badge variant="secondary" className="ml-2">{cat._count.items}</Badge>}
                </Button>
              ))}
            </div>
          </div>

          {/* ── CHANGED: gate products behind a location selection ── */}
          <ScrollArea className="flex-1 p-4">
            {selectedLocation === "" ? (
              <div className="text-center py-16 text-slate-400">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No location selected</p>
                <p className="text-sm mt-2">
                  Choose a specific location or <strong>"All Locations"</strong> above to browse products
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {filteredItems.map(item => {
                    const inventoryTotal = Array.isArray(item.inventories)
                      ? item.inventories.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0)
                      : 0
                    const stock = (selectedLocation && selectedLocation !== "ALL")
                      ? (item.inventories?.find((i: any) => i.locationId === selectedLocation)?.quantity ?? 0)
                      : (item.totalStock ?? item.availableStock ?? inventoryTotal)
                    const hasTiers = (tiersMap[item.id]?.length || 0) > 0

                    return (
                      <Card key={item.id}
                        onClick={() => stock > 0 && addToCart(item)}
                        className={`overflow-hidden group ${stock > 0 ? "cursor-pointer hover:shadow-xl hover:scale-105" : "opacity-60"} transition-all duration-200`}>
                        <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                          {item.imageUrl?.length > 0
                            ? <img src={item.imageUrl[0]} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="text-6xl">📦</div>
                          }
                          {stock <= 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                            </div>
                          )}
                          {stock > 0 && stock <= 5 && (
                            <Badge variant="destructive" className="absolute top-2 right-2 text-xs">Low Stock</Badge>
                          )}
                          {hasTiers && stock > 0 && (
                            <div className="absolute bottom-2 left-2">
                              <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <Package2 className="w-2.5 h-2.5" /> Wholesale
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-slate-500 mb-1">{item.sku}</p>
                          <h3 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                            {item.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-blue-600">
                              GHS{(item.sellingPrice || 0).toFixed(2)}
                            </span>
                            <span className={`text-xs font-medium ${stock <= 5 ? "text-red-600" : "text-slate-500"}`}>
                              {stock} in stock
                            </span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
                {filteredItems.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No products found</p>
                    <p className="text-sm mt-2">Try adjusting your search or scan a barcode</p>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </div>

        {/* ── Cart panel ── */}
        <div className={cn(
          "bg-white flex flex-col shadow-xl",
          "fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto lg:w-[440px] lg:border-l",
          mobileCartOpen ? "flex" : "hidden lg:flex"
        )}>
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order List ({cart.length} {cart.length === 1 ? "line" : "lines"})
              </h2>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="lg:hidden text-white/90 hover:text-white flex items-center gap-1 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Products
              </button>
            </div>
          </div>

          {/* Customer chip */}
          {(selectedCustomerData || selectedCustomer === "") && (
            <div className="p-2 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-xs truncate">
                    {selectedCustomerData ? selectedCustomerData.name : "Walk-in Customer"}
                  </p>
                  {selectedCustomerData?.email && <p className="text-[10px] text-slate-600 truncate">{selectedCustomerData.email}</p>}
                  {selectedCustomerData?.phone && <p className="text-[10px] text-slate-600">{selectedCustomerData.phone}</p>}
                  {!selectedCustomerData && <p className="text-[10px] text-slate-600">No customer details</p>}
                </div>
                {selectedCustomer && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer("")}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Cart lines */}
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <ShoppingCart className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm text-center mt-2">Click an item or scan a barcode to add</p>
                <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <ScanLine className="h-3.5 w-3.5" />
                  <span>Scanner active — scan any barcode</span>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(line => (
                  <Card key={line.cartLineId} className={`p-2 hover:shadow-md transition-shadow ${
                    line.saleMode === "wholesale" ? "border-amber-200" : ""
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                        {line.saleMode === "wholesale"
                          ? <Package2 className="w-5 h-5 text-amber-500" />
                          : <span className="text-xl">📦</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-slate-900 line-clamp-1 leading-tight">{line.name}</h4>
                            <p className="text-[10px] text-slate-500">{line.sku}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeLine(line.cartLineId)}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <PackSelector
                          line={line}
                          tiers={tiersMap[line.itemId] || []}
                          onChange={update => updateLine(line.cartLineId, update)}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {line.saleMode === "wholesale" && line.tierName
                          ? `${line.packQuantity} × ${line.tierName} (${line.totalUnits} units)`
                          : `${line.totalUnits} × GHS${line.sellingPrice.toFixed(2)}`
                        }
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-xs text-blue-600">GHS{line.lineTotal.toFixed(2)}</span>
                        {line.saleMode === "wholesale" && (
                          <p className="text-[9px] text-amber-600">GHS{line.lineUnitPrice.toFixed(2)}/unit</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart summary */}
          {cart.length > 0 && (
            <div className="border-t bg-slate-50">
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-slate-600 w-16 shrink-0">Discount</Label>
                  <Input type="number" value={discount} min="0" step="0.01"
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="h-8 text-xs" placeholder="0.00" />
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Sub-Total:</span>
                    <span className="font-semibold">GHS{subtotal.toFixed(2)}</span>
                  </div>
                  {totalTax > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Tax:</span>
                      <span className="font-semibold">GHS{totalTax.toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Discount:</span>
                      <span className="font-semibold text-red-600">-GHS{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-300">
                    <span className="font-bold text-slate-900 text-sm">Total:</span>
                    <span className="font-bold text-lg text-blue-600">GHS{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {cart.some(l => l.totalUnits > l.stock) && (
                  <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-1.5">
                    <span className="shrink-0">⚠️</span>
                    <span>
                      {cart.filter(l => l.totalUnits > l.stock).map(l =>
                        `"${l.name}": need ${l.totalUnits}, only ${l.stock} available`
                      ).join(" · ")}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setCart([])}
                    className="flex-1 h-9 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300">
                    Reset
                  </Button>
                  <Button onClick={() => setShowPaymentModal(true)}
                    disabled={cart.some(l => l.totalUnits > l.stock)}
                    className="flex-1 h-9 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Mobile "view cart" floating bar ── */}
      {cart.length > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3.5 shadow-2xl active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" />
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
          <span className="font-bold text-base">GHS{grandTotal.toFixed(2)}</span>
        </button>
      )}

        {/* ── Camera barcode scanner (this device) ── */}
        <CameraBarcodeScanner
          open={showCameraScanner}
          onClose={closeCameraScanner}
          onScan={handleCameraScan}
        />

        {/* ── Paired staff phone scanner ── */}
        {canConnectPhoneScanners && (
          <PhoneScannerPairing
            open={showPhonePairing}
            onClose={closePhonePairing}
            onScan={handleScan}
          />
        )}

      {/* ════════════════ MODALS ════════════════ */}

      {/* Customer Selection */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>Choose a customer or add a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Search customers..." value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)} />
            <Card onClick={() => { setSelectedCustomer(""); setShowCustomerModal(false); setCustomerSearch("") }}
              className="p-3 cursor-pointer hover:bg-slate-50 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Walk-in Customer</p>
                  <p className="text-xs text-blue-700">For customers not in the system</p>
                </div>
              </div>
            </Card>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredCustomers.map(c => (
                  <Card key={c.id}
                    onClick={() => { setSelectedCustomer(c.id); setShowCustomerModal(false); setCustomerSearch("") }}
                    className="p-3 cursor-pointer hover:bg-slate-50">
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                    {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                  </Card>
                ))}
                {filteredCustomers.length === 0 && customerSearch && (
                  <p className="text-center text-slate-500 py-8">No customers found</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowCustomerModal(false); setShowAddCustomerModal(true) }} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add New Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Enter customer details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={newCustomer.name} placeholder="Customer name"
                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={newCustomer.email} placeholder="customer@example.com"
                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={newCustomer.phone} placeholder="+233 123 456 789"
                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isAddingCustomer}
              onClick={() => { setShowAddCustomerModal(false); setNewCustomer({ name: "", email: "", phone: "" }) }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={isAddingCustomer || !newCustomer.name}>
              {isAddingCustomer
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                : <><Plus className="w-4 h-4 mr-2" />Add Customer</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Select payment method and confirm</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">GHS{grandTotal.toFixed(2)}</p>
              {cart.some(l => l.saleMode === "wholesale") && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <Package2 className="h-3 w-3" /> Includes wholesale pack pricing
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "CASH",         label: "Cash",   icon: Banknote   },
                  { value: "CARD",         label: "Card",   icon: CreditCard },
                  { value: "MOBILE_MONEY", label: "Mobile", icon: DollarSign },
                ].map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value as any)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === m.value ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}>
                    <m.icon className={`w-6 h-6 ${paymentMethod === m.value ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium ${paymentMethod === m.value ? "text-blue-600" : "text-slate-600"}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>



            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Ready to complete sale</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{cart.length} line{cart.length !== 1 ? "s" : ""} ({cart.reduce((s, l) => s + l.totalUnits, 0)} total units)</li>
                    <li>Location: {selectedLocation === "ALL" ? "All Locations" : (selectedLocationData?.name ?? "—")}</li>
                    {selectedCustomerData && <li>Customer: {selectedCustomerData.name}</li>}
                    {cart.some(l => l.saleMode === "wholesale") && (
                      <li className="text-amber-700">
                        {cart.filter(l => l.saleMode === "wholesale").length} wholesale line(s)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isProcessing} onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteSale}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50">
              {isProcessing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                : <><Check className="w-5 h-5 mr-2" />Confirm Payment</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[450px]">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-xl mb-2">Payment Successful!</h3>
            <p className="text-slate-600 mb-4">Your transaction has been completed</p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600 mb-1">Receipt Number</p>
              <p className="font-bold text-lg text-slate-900">{lastOrderNumber}</p>
              <p className="text-sm text-slate-500 mt-2">{new Date().toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/simple-receipt`, "_blank")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <Receipt className="w-4 h-4 mr-2" /> View Simple Receipt
              </Button>
              <Button onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/invoice`, "_blank")}
                variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" /> View Detailed Invoice
              </Button>
              <Button variant="ghost" onClick={resetPOS} className="w-full hover:bg-slate-100">
                New Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}