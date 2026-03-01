"use client"

import React, {
  useState, useEffect, useRef, useCallback, useTransition,
} from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Scan, QrCode, Barcode, Printer, Search, Plus, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Package, MapPin,
  Hash, Link2, Copy, ChevronRight, Zap, History,
  ScanLine, Download, Upload, Edit3, Eye, Tag, Layers,
  ArrowRight, Shield, Cpu, Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  lookupByBarcode, assignBarcodeToItem, getOrgItemsForBarcode,
  bulkAssignBarcodes, addSerialNumber, getItemsNeedingBarcodes,
  getItemsWithBarcodes, BarcodeScanResult,
} from "@/actions/barcode-actions"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type BarcodeFormat = "CODE128" | "CODE39" | "QR" | "EAN13" | "EAN8" | "UPC_A" | "DATA_MATRIX" | "PDF417"

type ScanMode = "lookup" | "assign" | "serial" | "checkin" | "checkout"

type ScanHistoryEntry = {
  id: string
  value: string
  result: "FOUND" | "NOT_FOUND" | "ASSIGNED" | "ERROR"
  itemName?: string
  matchedBy?: string
  timestamp: Date
  mode: ScanMode
}

type OrgItem = {
  id: string
  name: string
  sku: string
  barcode: string | null
  upc: string | null
  ean: string | null
  thumbnail: string | null
  sellingPrice: number
  category: { title: string } | null
  inventories: { quantity: number; location: { name: string } }[]
}

// ─────────────────────────────────────────────────────────────
// Barcode Generator (client-side via canvas)
// ─────────────────────────────────────────────────────────────

function drawBarcode(
  canvas: HTMLCanvasElement,
  value: string,
  format: BarcodeFormat,
  opts: { width?: number; height?: number; showText?: boolean; color?: string } = {}
) {
  const ctx = canvas.getContext("2d")
  if (!ctx || !value) return

  const { width = 280, height = 80, showText = true, color = "#1a1a2e" } = opts

  canvas.width  = width
  canvas.height = showText ? height + 24 : height

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (format === "QR" || format === "DATA_MATRIX") {
    // For QR we'll show a placeholder pattern (real QR needs qrcode.js)
    drawQRPlaceholder(ctx, value, width, height, color)
  } else {
    drawLinearBarcode(ctx, value, width, height, color)
  }

  if (showText) {
    ctx.fillStyle = color
    ctx.font = "11px 'Courier New', monospace"
    ctx.textAlign = "center"
    ctx.fillText(value.length > 25 ? value.slice(0, 25) + "…" : value, width / 2, height + 16)
  }
}

function drawLinearBarcode(
  ctx: CanvasRenderingContext2D,
  value: string,
  width: number,
  height: number,
  color: string
) {
  // Simplified Code128-style rendering for display purposes
  const chars = value.split("").map(c => c.charCodeAt(0))
  const totalBars = chars.reduce((s, c) => s + (c % 7) + 3, 0) + 20
  const barW = Math.max(1, (width - 20) / totalBars)

  let x = 10
  ctx.fillStyle = color

  // Start bars
  for (let i = 0; i < 3; i++) {
    if (i % 2 === 0) ctx.fillRect(x, 4, barW * 2, height - 8)
    x += barW * 2
  }

  for (const code of chars) {
    const barCount  = (code % 7) + 3
    const barWidths = Array.from({ length: barCount }, (_, i) =>
      i % 3 === 0 ? barW * 2 : i % 3 === 1 ? barW * 1.5 : barW
    )
    barWidths.forEach((bw, i) => {
      if (i % 2 === 0) ctx.fillRect(x, 4, bw, height - 8)
      x += bw
    })
    x += barW * 0.5 // inter-char gap
  }

  // Stop bars
  ctx.fillRect(x, 4, barW * 3, height - 8)
}

function drawQRPlaceholder(
  ctx: CanvasRenderingContext2D,
  value: string,
  width: number,
  height: number,
  color: string
) {
  const size  = Math.min(width, height) - 8
  const cellS = Math.floor(size / 21)
  const offX  = (width - cellS * 21) / 2
  const offY  = (height - cellS * 21) / 2

  // Deterministic cell pattern based on value hash
  const hash = value.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)

  ctx.fillStyle = color
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const isCornerFinder =
        (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
      const cell = isCornerFinder
        ? (r === 0 || r === 6 || c === 0 || c === 6
           || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
        : Boolean(((hash >>> ((r * 21 + c) % 31)) ^ (r + c)) & 1)

      if (cell) ctx.fillRect(offX + c * cellS, offY + r * cellS, cellS - 0.5, cellS - 0.5)
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Generate unique barcode string
// ─────────────────────────────────────────────────────────────

function generateBarcodeValue(
  format: BarcodeFormat,
  prefix = "ITM",
  existingCodes: Set<string> = new Set()
): string {
  let value = ""
  let attempts = 0
  do {
    const rand = Math.floor(Math.random() * 1e10).toString().padStart(10, "0")
    if (format === "EAN13") {
      value = rand.slice(0, 12) // 12 digits + check digit
      const checkDigit = calcEAN13Check(value)
      value = value + checkDigit
    } else if (format === "EAN8") {
      value = rand.slice(0, 7)
      const checkDigit = calcEAN8Check(value)
      value = value + checkDigit
    } else if (format === "UPC_A") {
      value = rand.slice(0, 11)
      value = value + calcUPCACheck(value)
    } else {
      value = `${prefix}-${rand.slice(0, 8).toUpperCase()}`
    }
    attempts++
  } while (existingCodes.has(value) && attempts < 100)
  return value
}

function calcEAN13Check(d: string) {
  const s = d.split("").reduce((a, c, i) => a + parseInt(c) * (i % 2 === 0 ? 1 : 3), 0)
  return String((10 - (s % 10)) % 10)
}
function calcEAN8Check(d: string) {
  const s = d.split("").reduce((a, c, i) => a + parseInt(c) * (i % 2 === 0 ? 3 : 1), 0)
  return String((10 - (s % 10)) % 10)
}
function calcUPCACheck(d: string) {
  const s = d.split("").reduce((a, c, i) => a + parseInt(c) * (i % 2 === 0 ? 3 : 1), 0)
  return String((10 - (s % 10)) % 10)
}

// ─────────────────────────────────────────────────────────────
// BarcodeCanvas sub-component
// ─────────────────────────────────────────────────────────────

function BarcodeCanvas({
  value,
  format,
  size = "md",
}: {
  value: string
  format: BarcodeFormat
  size?: "sm" | "md" | "lg"
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dims = { sm: [180, 50], md: [280, 80], lg: [360, 100] }[size]

  useEffect(() => {
    if (ref.current && value) {
      drawBarcode(ref.current, value, format, {
        width: dims[0], height: dims[1], showText: true,
      })
    }
  }, [value, format, dims])

  return (
    <canvas
      ref={ref}
      className="rounded border border-border bg-white"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function BarcodeManagementPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Scan state ──────────────────────────────────────────────
  const [scanMode,    setScanMode]    = useState<ScanMode>("lookup")
  const [scanValue,   setScanValue]   = useState("")
  const [isScanning,  setIsScanning]  = useState(false)
  const [scanResult,  setScanResult]  = useState<BarcodeScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])
  const scanInputRef = useRef<HTMLInputElement>(null)

  // ── Generator state ─────────────────────────────────────────
  const [genFormat,   setGenFormat]   = useState<BarcodeFormat>("CODE128")
  const [genPrefix,   setGenPrefix]   = useState("ITM")
  const [genItemId,   setGenItemId]   = useState("")
  const [genValue,    setGenValue]    = useState("")
  const [genField,    setGenField]    = useState<"barcode" | "upc" | "ean">("barcode")
  const [isSaving,    setIsSaving]    = useState(false)

  // ── Print state ─────────────────────────────────────────────
  const [printItems, setPrintItems]   = useState<Set<string>>(new Set())
  const [printFormat, setPrintFormat] = useState<BarcodeFormat>("CODE128")
  const [copies,      setCopies]      = useState(1)

  // ── Data state ──────────────────────────────────────────────
  const [orgItems,      setOrgItems]      = useState<OrgItem[]>([])
  const [itemsNoBcode,  setItemsNoBcode]  = useState<OrgItem[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [searchQuery,   setSearchQuery]   = useState("")

  // ── Assign dialog ───────────────────────────────────────────
  const [assignOpen,    setAssignOpen]    = useState(false)
  const [assignValue,   setAssignValue]   = useState("")
  const [assignItemId,  setAssignItemId]  = useState("")
  const [assignField,   setAssignField]   = useState<"barcode" | "upc" | "ean">("barcode")

  // ── Serial dialog ───────────────────────────────────────────
  const [serialOpen,    setSerialOpen]    = useState(false)
  const [serialValue,   setSerialValue]   = useState("")
  const [serialItemId,  setSerialItemId]  = useState("")

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => { loadData() }, [])

  // ── Auto-focus scan input on tab switch ─────────────────────
  useEffect(() => {
    if (scanInputRef.current) {
      setTimeout(() => scanInputRef.current?.focus(), 100)
    }
  }, [scanMode])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [all, noBcode] = await Promise.all([
        getOrgItemsForBarcode(),
        getItemsNeedingBarcodes(),
      ])
      if (all.success)     setOrgItems(all.data as OrgItem[])
      if (noBcode.success) setItemsNoBcode(noBcode.data as OrgItem[])
    } catch (e) {
      toast.error("Failed to load items")
    } finally {
      setIsLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Scan handler — triggered by Enter key (scanner suffix)
  // ─────────────────────────────────────────────────────────────

  const handleScan = useCallback(async (value: string) => {
    if (!value.trim()) return
    setIsScanning(true)
    setScanResult(null)

    try {
      if (scanMode === "assign") {
        setAssignValue(value.trim())
        setAssignOpen(true)
        setIsScanning(false)
        setScanValue("")
        return
      }

      if (scanMode === "serial") {
        setSerialValue(value.trim())
        setSerialOpen(true)
        setIsScanning(false)
        setScanValue("")
        return
      }

      const result = await lookupByBarcode(value.trim())
      setScanResult(result)

      const entry: ScanHistoryEntry = {
        id:        crypto.randomUUID(),
        value:     value.trim(),
        result:    result.found ? "FOUND" : "NOT_FOUND",
        itemName:  result.item?.name || result.serial?.item?.name,
        matchedBy: result.matchedBy,
        timestamp: new Date(),
        mode:      scanMode,
      }
      setScanHistory(prev => [entry, ...prev].slice(0, 100))

      if (result.found) {
        toast.success(`Found: ${result.item?.name || result.serial?.item?.name}`, {
          description: `Matched by ${result.matchedBy}`,
        })
      } else {
        toast.error("Not found", { description: result.message })
      }
    } catch (e: any) {
      toast.error("Scan error", { description: e.message })
    } finally {
      setIsScanning(false)
      setScanValue("")
      setTimeout(() => scanInputRef.current?.focus(), 50)
    }
  }, [scanMode])

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleScan(scanValue)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Generator
  // ─────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    const existing = new Set(orgItems.map(i => i.barcode).filter(Boolean) as string[])
    const value = generateBarcodeValue(genFormat, genPrefix, existing)
    setGenValue(value)
  }

  const handleSaveBarcode = async () => {
    if (!genValue || !genItemId) {
      toast.error("Select an item and generate a barcode first")
      return
    }
    setIsSaving(true)
    try {
      const result = await assignBarcodeToItem({
        itemId:  genItemId,
        barcode: genValue,
        field:   genField,
      })
      if (result.success) {
        toast.success("Barcode assigned!")
        setGenValue("")
        setGenItemId("")
        await loadData()
      } else {
        toast.error(result.error || "Failed to assign")
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Bulk generate & assign
  // ─────────────────────────────────────────────────────────────

  const handleBulkGenerate = async () => {
    if (itemsNoBcode.length === 0) return
    const existing = new Set(orgItems.map(i => i.barcode).filter(Boolean) as string[])
    const assignments = itemsNoBcode.map(item => ({
      itemId:  item.id,
      barcode: generateBarcodeValue(genFormat, genPrefix, existing),
    }))
    assignments.forEach(a => existing.add(a.barcode))

    try {
      const result = await bulkAssignBarcodes(assignments)
      if (result.success) {
        toast.success(`Assigned ${result.succeeded} barcodes`, {
          description: result.failed ? `${result.failed} failed` : undefined,
        })
        await loadData()
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const selected = orgItems.filter(i => printItems.has(i.id) && i.barcode)
    if (selected.length === 0) {
      toast.error("Select items with barcodes to print")
      return
    }

    const win = window.open("", "_blank", "width=800,height=600")
    if (!win) return

    const style = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier Prime', monospace; background: #fff; }
        .label { 
          display: inline-block; border: 1px solid #ccc; border-radius: 4px;
          padding: 8px 10px; margin: 6px; text-align: center; width: 200px;
          page-break-inside: avoid;
        }
        .name { font-size: 11px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .price { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .sku { font-size: 9px; color: #666; margin-top: 2px; }
        .barcode-area { background: #fff; padding: 4px; border: 1px solid #eee; border-radius: 2px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    `
    const labels = selected.flatMap(item =>
      Array.from({ length: copies }, () => `
        <div class="label">
          <div class="name">${item.name}</div>
          <div class="price">GHS ${item.sellingPrice.toFixed(2)}</div>
          <div class="barcode-area">
            <canvas id="bc-${item.id}" width="180" height="50"></canvas>
          </div>
          <div class="sku">${item.barcode}</div>
        </div>
      `)
    ).join("")

    win.document.write(`<html><head><title>Barcodes</title>${style}</head><body>${labels}</body></html>`)
    win.document.close()

    win.onload = () => {
      selected.forEach(item => {
        Array.from({ length: copies }).forEach((_, ci) => {
          const canvas = win.document.getElementById(`bc-${item.id}`) as HTMLCanvasElement
          if (canvas && item.barcode) {
            drawBarcode(canvas, item.barcode, printFormat, { width: 180, height: 50 })
          }
        })
      })
      setTimeout(() => win.print(), 300)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Assign dialog submit
  // ─────────────────────────────────────────────────────────────

  const handleAssignSubmit = async () => {
    if (!assignValue || !assignItemId) return
    setIsSaving(true)
    try {
      const result = await assignBarcodeToItem({
        itemId:  assignItemId,
        barcode: assignValue,
        field:   assignField,
      })
      if (result.success) {
        toast.success("Barcode assigned!")
        setAssignOpen(false)
        setAssignValue("")
        setAssignItemId("")
        await loadData()
      } else {
        toast.error(result.error || "Failed")
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Serial dialog submit
  // ─────────────────────────────────────────────────────────────

  const handleSerialSubmit = async () => {
    if (!serialValue || !serialItemId) return
    setIsSaving(true)
    try {
      const result = await addSerialNumber({
        itemId:       serialItemId,
        serialNumber: serialValue,
      })
      if (result.success) {
        toast.success("Serial number added!")
        setSerialOpen(false)
        setSerialValue("")
        setSerialItemId("")
        await loadData()
      } else {
        toast.error(result.error || "Failed")
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Filtered items
  // ─────────────────────────────────────────────────────────────

  const filteredItems = orgItems.filter(i =>
    !searchQuery ||
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.barcode?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  )

  const totalStock = orgItems.reduce(
    (s, i) => s + i.inventories.reduce((q, inv) => q + inv.quantity, 0), 0
  )
  const withBarcode = orgItems.filter(i => i.barcode).length
  const coverage    = orgItems.length ? Math.round((withBarcode / orgItems.length) * 100) : 0

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* ── Header ── */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Barcode Management</h1>
                <p className="text-sm text-muted-foreground">
                  Scan · Generate · Assign · Print
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/inventory/items">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  All Items
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: Package,
                label: "Total Items",
                value: orgItems.length,
                color: "text-blue-500",
                bg: "bg-blue-50 dark:bg-blue-950/20",
              },
              {
                icon: Barcode,
                label: "Have Barcode",
                value: withBarcode,
                color: "text-green-500",
                bg: "bg-green-50 dark:bg-green-950/20",
              },
              {
                icon: AlertTriangle,
                label: "Need Barcode",
                value: itemsNoBcode.length,
                color: "text-amber-500",
                bg: "bg-amber-50 dark:bg-amber-950/20",
              },
              {
                icon: Activity,
                label: "Coverage",
                value: `${coverage}%`,
                color: "text-purple-500",
                bg: "bg-purple-50 dark:bg-purple-950/20",
              },
            ].map(stat => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", stat.bg)}>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Main Tabs ── */}
          <Tabs defaultValue="scanner" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="scanner" className="gap-1.5">
                <Scan className="h-3.5 w-3.5" />Scanner
              </TabsTrigger>
              <TabsTrigger value="generator" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" />Generator
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5">
                <Tag className="h-3.5 w-3.5" />Items
              </TabsTrigger>
              <TabsTrigger value="print" className="gap-1.5">
                <Printer className="h-3.5 w-3.5" />Print
              </TabsTrigger>
            </TabsList>

            {/* ════════════ SCANNER TAB ════════════ */}
            <TabsContent value="scanner" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Scan input */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Mode selector */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "lookup",   icon: Search,  label: "Lookup"   },
                        { id: "assign",   icon: Link2,   label: "Assign"   },
                        { id: "serial",   icon: Hash,    label: "Serial"   },
                        { id: "checkin",  icon: ArrowRight, label: "Check-In" },
                        { id: "checkout", icon: ArrowRight, label: "Check-Out"},
                      ] as const
                    ).map(mode => (
                      <Button
                        key={mode.id}
                        variant={scanMode === mode.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setScanMode(mode.id as ScanMode)
                          setScanResult(null)
                          setTimeout(() => scanInputRef.current?.focus(), 50)
                        }}
                        className="gap-1.5"
                      >
                        <mode.icon className="h-3.5 w-3.5" />
                        {mode.label}
                      </Button>
                    ))}
                  </div>

                  {/* Scan input — auto-focused, handles scanner suffix */}
                  <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Zap className="h-4 w-4 text-primary animate-pulse" />
                        <span>
                          {scanMode === "lookup"   && "Scan or type a barcode · SKU · UPC · EAN · Serial"}
                          {scanMode === "assign"   && "Scan barcode to assign → select item in dialog"}
                          {scanMode === "serial"   && "Scan serial number to register"}
                          {scanMode === "checkin"  && "Scan barcode to check item IN to stock"}
                          {scanMode === "checkout" && "Scan barcode to check item OUT of stock"}
                        </span>
                      </div>

                      <div className="relative">
                        <ScanLine className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={scanInputRef}
                          value={scanValue}
                          onChange={e => setScanValue(e.target.value)}
                          onKeyDown={handleScanKeyDown}
                          placeholder="Scan or type barcode… (press Enter to submit)"
                          className="pl-10 h-12 text-base font-mono border-primary/40 focus:border-primary"
                          autoFocus
                          autoComplete="off"
                          disabled={isScanning}
                        />
                        {isScanning && (
                          <RefreshCw className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => handleScan(scanValue)}
                        disabled={!scanValue || isScanning}
                      >
                        {isScanning ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                        ) : (
                          <><Scan className="h-4 w-4 mr-2" />Submit Scan</>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        🔌 USB/Bluetooth scanners work automatically — just scan!
                        Supports 1D (Code128, EAN, UPC) and 2D (QR, Data Matrix, PDF417)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Scan result */}
                  {scanResult && (
                    <Card className={cn(
                      "border-2",
                      scanResult.found
                        ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                        : "border-red-300 bg-red-50 dark:bg-red-950/20"
                    )}>
                      <CardContent className="p-4">
                        {scanResult.found ? (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                Item Found
                              </span>
                              <Badge variant="secondary" className="ml-auto">
                                matched by {scanResult.matchedBy}
                              </Badge>
                            </div>

                            {scanResult.item && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  {scanResult.item.thumbnail && (
                                    <img
                                      src={scanResult.item.thumbnail}
                                      alt={scanResult.item.name}
                                      className="w-12 h-12 rounded object-cover border"
                                    />
                                  )}
                                  <div>
                                    <p className="font-bold text-lg">{scanResult.item.name}</p>
                                    <p className="text-sm text-muted-foreground font-mono">
                                      SKU: {scanResult.item.sku}
                                    </p>
                                    {scanResult.item.category && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {scanResult.item.category.title}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="ml-auto text-right">
                                    <p className="text-2xl font-bold">
                                      GHS {scanResult.item.sellingPrice.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                {/* Identifiers */}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {[
                                    ["Barcode", scanResult.item.barcode],
                                    ["UPC",     scanResult.item.upc],
                                    ["EAN",     scanResult.item.ean],
                                  ].map(([label, val]) => val && (
                                    <div key={label} className="p-2 bg-background rounded border font-mono">
                                      <p className="text-muted-foreground">{label}</p>
                                      <p className="font-semibold truncate">{val}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Stock by location */}
                                {scanResult.item.inventories.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                      Stock by Location
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {scanResult.item.inventories.map(inv => (
                                        <div
                                          key={inv.locationId}
                                          className="flex items-center justify-between p-2 bg-background rounded border text-xs"
                                        >
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            {inv.locationName}
                                          </span>
                                          <Badge
                                            variant={inv.quantity > 0 ? "default" : "destructive"}
                                            className="text-xs"
                                          >
                                            {inv.quantity}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/dashboard/inventory/items/${scanResult.item.id}/edit`}>
                                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit Item
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/dashboard/inventory/items/${scanResult.item.id}`}>
                                      <Eye className="h-3.5 w-3.5 mr-1.5" />View
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            )}

                            {scanResult.serial && (
                              <div className="space-y-2">
                                <p className="font-medium">Serial: <span className="font-mono">{scanResult.serial.serialNumber}</span></p>
                                <p className="text-sm">Item: {scanResult.serial.item.name}</p>
                                <Badge>{scanResult.serial.status}</Badge>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-red-700 dark:text-red-400">Not Found</p>
                              <p className="text-sm text-muted-foreground mt-1">{scanResult.message}</p>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAssignValue(scanValue || "")
                                    setAssignOpen(true)
                                  }}
                                >
                                  <Link2 className="h-3.5 w-3.5 mr-1.5" />Assign to Item
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <Link href="/dashboard/inventory/items/new">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />New Item
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right: Scan history */}
                <div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Scan History
                        {scanHistory.length > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {scanHistory.length}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[480px]">
                        {scanHistory.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            No scans yet. Start scanning to see history.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {scanHistory.map(entry => (
                              <div key={entry.id} className="px-4 py-2.5 text-xs hover:bg-muted/30">
                                <div className="flex items-start gap-2">
                                  <div className={cn(
                                    "mt-0.5 h-2 w-2 rounded-full shrink-0",
                                    entry.result === "FOUND"     ? "bg-green-500" :
                                    entry.result === "ASSIGNED"  ? "bg-blue-500"  :
                                    entry.result === "NOT_FOUND" ? "bg-red-500"   : "bg-amber-500"
                                  )} />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-mono truncate font-medium">{entry.value}</p>
                                    {entry.itemName && (
                                      <p className="text-muted-foreground truncate">{entry.itemName}</p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-[14px]">
                                        {entry.mode}
                                      </Badge>
                                      <span>{entry.timestamp.toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ════════════ GENERATOR TAB ════════════ */}
            <TabsContent value="generator" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Generate Barcode</CardTitle>
                    <CardDescription>
                      Create unique barcodes and assign them to items
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Barcode Format</label>
                      <Select value={genFormat} onValueChange={(v) => setGenFormat(v as BarcodeFormat)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CODE128">Code 128 (General purpose)</SelectItem>
                          <SelectItem value="CODE39">Code 39 (Alphanumeric)</SelectItem>
                          <SelectItem value="EAN13">EAN-13 (Retail standard)</SelectItem>
                          <SelectItem value="EAN8">EAN-8 (Small packages)</SelectItem>
                          <SelectItem value="UPC_A">UPC-A (North America retail)</SelectItem>
                          <SelectItem value="QR">QR Code (2D, URLs & data)</SelectItem>
                          <SelectItem value="DATA_MATRIX">Data Matrix (2D, compact)</SelectItem>
                          <SelectItem value="PDF417">PDF417 (2D, large data)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!["EAN13", "EAN8", "UPC_A"].includes(genFormat) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Prefix</label>
                        <Input
                          value={genPrefix}
                          onChange={e => setGenPrefix(e.target.value.toUpperCase())}
                          placeholder="ITM"
                          maxLength={6}
                          className="font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assign To Item</label>
                      <Select value={genItemId} onValueChange={setGenItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item…" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-48">
                            {itemsNoBcode.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                <span className="flex items-center gap-2">
                                  <span>{item.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {item.sku}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Field to Assign</label>
                      <Select value={genField} onValueChange={(v: any) => setGenField(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="barcode">Barcode</SelectItem>
                          <SelectItem value="upc">UPC</SelectItem>
                          <SelectItem value="ean">EAN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Generated Value</label>
                      <div className="flex gap-2">
                        <Input
                          value={genValue}
                          onChange={e => setGenValue(e.target.value)}
                          placeholder="Click Generate or type manually"
                          className="font-mono"
                        />
                        <Button variant="outline" size="icon" onClick={() => {
                          navigator.clipboard.writeText(genValue)
                          toast.success("Copied!")
                        }} disabled={!genValue}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1" onClick={handleGenerate}>
                        <RefreshCw className="h-4 w-4 mr-2" />Generate
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveBarcode}
                        disabled={!genValue || !genItemId || isSaving}
                      >
                        {isSaving ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4 mr-2" />Assign</>
                        )}
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">
                        Bulk Generate{" "}
                        <span className="text-muted-foreground font-normal">
                          ({itemsNoBcode.length} items need barcodes)
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleBulkGenerate}
                        disabled={itemsNoBcode.length === 0}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Auto-assign to All Unassigned Items
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                    <CardDescription>
                      Live preview updates as you type or generate
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {genValue ? (
                      <>
                        <div className="flex justify-center p-6 bg-white rounded-lg border">
                          <BarcodeCanvas
                            value={genValue}
                            format={genFormat}
                            size="lg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Format</p>
                            <p className="font-semibold">{genFormat}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Length</p>
                            <p className="font-semibold">{genValue.length} chars</p>
                          </div>
                          <div className="col-span-2 p-3 bg-muted/50 rounded-lg font-mono text-xs break-all">
                            {genValue}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                        <QrCode className="h-12 w-12 opacity-20" />
                        <p className="text-sm">Generate or enter a value to preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ════════════ ITEMS TAB ════════════ */}
            <TabsContent value="items" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, SKU, barcode…"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setAssignOpen(true)
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Assign Barcode
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map(item => {
                  const totalQty = item.inventories.reduce((s, i) => s + i.quantity, 0)
                  return (
                    <Card key={item.id} className="group hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={item.thumbnail || "/placeholder.png"}
                            alt={item.name}
                            className="w-10 h-10 rounded object-cover border shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                            {item.category && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-[14px] mt-0.5">
                                {item.category.title}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">GHS {item.sellingPrice.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{totalQty} units</p>
                          </div>
                        </div>

                        {/* Barcode display */}
                        {item.barcode ? (
                          <div className="space-y-2">
                            <div className="flex justify-center p-2 bg-white rounded border">
                              <BarcodeCanvas value={item.barcode} format="CODE128" size="sm" />
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-mono text-muted-foreground truncate">
                                {item.barcode}
                              </p>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        navigator.clipboard.writeText(item.barcode!)
                                        toast.success("Copied!")
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy barcode</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setPrintItems(new Set([item.id]))
                                      }}
                                    >
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Quick print</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-dashed border-amber-300">
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              No barcode assigned
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs border-amber-300"
                              onClick={() => {
                                setAssignItemId(item.id)
                                setAssignOpen(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />Assign
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {filteredItems.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Barcode className="h-12 w-12 mx-auto opacity-20 mb-3" />
                  <p>No items match your search</p>
                </div>
              )}
            </TabsContent>

            {/* ════════════ PRINT TAB ════════════ */}
            <TabsContent value="print" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Print settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Print Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Barcode Format</label>
                      <Select value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CODE128">Code 128</SelectItem>
                          <SelectItem value="CODE39">Code 39</SelectItem>
                          <SelectItem value="QR">QR Code</SelectItem>
                          <SelectItem value="EAN13">EAN-13</SelectItem>
                          <SelectItem value="UPC_A">UPC-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Copies per Item</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={copies}
                        onChange={e => setCopies(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Select Items</label>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="sm" className="text-xs h-6"
                            onClick={() => setPrintItems(new Set(
                              orgItems.filter(i => i.barcode).map(i => i.id)
                            ))}
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="text-xs h-6"
                            onClick={() => setPrintItems(new Set())}
                          >
                            None
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-48 border rounded">
                        {orgItems
                          .filter(i => i.barcode)
                          .map(item => (
                            <label
                              key={item.id}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm",
                                printItems.has(item.id) && "bg-primary/5"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={printItems.has(item.id)}
                                onChange={e => {
                                  const next = new Set(printItems)
                                  e.target.checked ? next.add(item.id) : next.delete(item.id)
                                  setPrintItems(next)
                                }}
                                className="rounded"
                              />
                              <span className="truncate">{item.name}</span>
                            </label>
                          ))
                        }
                      </ScrollArea>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handlePrint}
                      disabled={printItems.size === 0}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print {printItems.size > 0 ? `${printItems.size} Label${printItems.size > 1 ? "s" : ""}` : "Labels"}
                      {copies > 1 && ` × ${copies}`}
                    </Button>
                  </CardContent>
                </Card>

                {/* Print preview */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Label Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {orgItems
                          .filter(i => i.barcode && printItems.has(i.id))
                          .slice(0, 6)
                          .map(item => (
                            <div
                              key={item.id}
                              className="border rounded p-3 text-center w-[180px] bg-white"
                            >
                              <p className="text-xs font-semibold truncate mb-1">{item.name}</p>
                              <p className="text-sm font-bold mb-2">
                                GHS {item.sellingPrice.toFixed(2)}
                              </p>
                              <BarcodeCanvas value={item.barcode!} format={printFormat} size="sm" />
                              <p className="text-[9px] font-mono mt-1 text-muted-foreground truncate">
                                {item.barcode}
                              </p>
                            </div>
                          ))
                        }
                        {printItems.size === 0 && (
                          <div className="flex items-center justify-center w-full h-40 text-muted-foreground">
                            <div className="text-center">
                              <Printer className="h-8 w-8 mx-auto opacity-20 mb-2" />
                              <p className="text-sm">Select items to preview labels</p>
                            </div>
                          </div>
                        )}
                        {printItems.size > 6 && (
                          <div className="flex items-center justify-center w-[180px] h-32 border rounded bg-muted/50 text-sm text-muted-foreground">
                            +{printItems.size - 6} more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ════════════ ASSIGN DIALOG ════════════ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Barcode to Item</DialogTitle>
            <DialogDescription>
              Link a scanned or typed barcode to an inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Barcode Value</label>
              <Input
                value={assignValue}
                onChange={e => setAssignValue(e.target.value)}
                placeholder="Scan or type barcode…"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Item</label>
              <Select value={assignItemId} onValueChange={setAssignItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-56">
                    {orgItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="flex items-center gap-2">
                          {item.name}
                          <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Field</label>
              <Select value={assignField} onValueChange={(v: any) => setAssignField(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="barcode">Barcode (primary)</SelectItem>
                  <SelectItem value="upc">UPC Code</SelectItem>
                  <SelectItem value="ean">EAN Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignValue && (
              <div className="flex justify-center p-3 bg-white border rounded">
                <BarcodeCanvas value={assignValue} format="CODE128" size="sm" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAssignSubmit}
                disabled={!assignValue || !assignItemId || isSaving}
              >
                {isSaving ? "Assigning…" : "Assign Barcode"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ SERIAL DIALOG ════════════ */}
      <Dialog open={serialOpen} onOpenChange={setSerialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Serial Number</DialogTitle>
            <DialogDescription>
              Add a serial number to an inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number</label>
              <Input
                value={serialValue}
                onChange={e => setSerialValue(e.target.value)}
                placeholder="Scan or type serial number…"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Item</label>
              <Select value={serialItemId} onValueChange={setSerialItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-56">
                    {orgItems.filter(i => i.barcode !== null || true).map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}{" "}
                        <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSerialOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSerialSubmit}
                disabled={!serialValue || !serialItemId || isSaving}
              >
                {isSaving ? "Saving…" : "Add Serial"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}