"use client"

import UpdateCard, { Option } from "./update-card"
import ImageUploadField from "./image-upload-field"
import type { ProductData } from "@/types/item"
import { useState, useEffect, useRef } from "react"
import { updateItemById } from "@/actions/items"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import FormSelectInput from "@/components/FormInputs/FormSelectInput"
import { toast } from "sonner"
import { assignBarcodeToItem, addSerialNumber } from "@/actions/barcode-actions"
import Link from "next/link"
import {
  Barcode, QrCode, Hash, ExternalLink, Copy, CheckCircle2,
  Plus, RefreshCw, Scan, Printer, Zap, ShieldCheck
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface BasicInfoTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
}

// ─────────────────────────────────────────────────────────────
// Barcode canvas renderer
// ─────────────────────────────────────────────────────────────

type BarcodeFormat = "CODE128" | "CODE39" | "QR" | "EAN13" | "EAN8" | "UPC_A"

function drawBarcode(
  canvas: HTMLCanvasElement,
  value: string,
  format: BarcodeFormat = "CODE128"
) {
  const ctx = canvas.getContext("2d")
  if (!ctx || !value.trim()) return

  const W = 260, H = 72
  canvas.width  = W
  canvas.height = H + 20

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H + 20)
  ctx.fillStyle = "#1a1a2e"

  if (format === "QR") {
    // QR placeholder grid
    const cellS = Math.floor(Math.min(W, H) / 21)
    const hash = value.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    const offX = (W - cellS * 21) / 2
    const offY = (H - cellS * 21) / 2

    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        const finder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)
        const cell = finder
          ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
          : Boolean(((hash >>> ((r * 21 + c) % 31)) ^ (r + c)) & 1)
        if (cell) ctx.fillRect(offX + c * cellS, offY + r * cellS, cellS - 0.5, cellS - 0.5)
      }
    }
  } else {
    // Linear barcode
    const chars   = value.split("").map(c => c.charCodeAt(0))
    const total   = chars.reduce((s, c) => s + (c % 7) + 3, 0) + 20
    const barW    = Math.max(1, (W - 20) / total)
    let x = 10

    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) ctx.fillRect(x, 4, barW * 2, H - 8)
      x += barW * 2
    }
    for (const code of chars) {
      const bc = (code % 7) + 3
      for (let i = 0; i < bc; i++) {
        const bw = i % 3 === 0 ? barW * 2 : i % 3 === 1 ? barW * 1.5 : barW
        if (i % 2 === 0) ctx.fillRect(x, 4, bw, H - 8)
        x += bw
      }
      x += barW * 0.5
    }
    ctx.fillRect(x, 4, barW * 3, H - 8)
  }

  ctx.fillStyle = "#1a1a2e"
  ctx.font = "10px 'Courier New', monospace"
  ctx.textAlign = "center"
  const display = value.length > 30 ? value.slice(0, 30) + "…" : value
  ctx.fillText(display, W / 2, H + 14)
}

// ─────────────────────────────────────────────────────────────
// Barcode field component — shows barcode canvas & actions
// ─────────────────────────────────────────────────────────────

function BarcodeField({
  label,
  value,
  field,
  itemId,
  onSaved,
  format = "CODE128",
}: {
  label: string
  value: string | null | undefined
  field: "barcode" | "upc" | "ean"
  itemId: string
  onSaved: (field: string, value: string) => void
  format?: BarcodeFormat
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [editing,   setEditing]   = useState(false)
  const [inputVal,  setInputVal]  = useState(value || "")
  const [isSaving,  setIsSaving]  = useState(false)

  useEffect(() => {
    setInputVal(value || "")
  }, [value])

  useEffect(() => {
    if (canvasRef.current && value) {
      drawBarcode(canvasRef.current, value, format)
    }
  }, [value, format])

  const handleSave = async () => {
    if (!inputVal.trim()) return
    setIsSaving(true)
    try {
      const result = await assignBarcodeToItem({
        itemId,
        barcode: inputVal.trim(),
        field,
      })
      if (result.success) {
        toast.success(`${label} updated!`)
        onSaved(field, inputVal.trim())
        setEditing(false)
      } else {
        toast.error(result.error || "Failed to update")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") {
      setEditing(false)
      setInputVal(value || "")
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          {field === "barcode" ? <Barcode className="h-3.5 w-3.5 text-muted-foreground" /> :
           field === "upc"     ? <Hash className="h-3.5 w-3.5 text-muted-foreground" />     :
                                 <QrCode className="h-3.5 w-3.5 text-muted-foreground" />}
          {label}
        </label>
        {value && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                navigator.clipboard.writeText(value)
                toast.success("Copied!")
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              asChild
            >
              <Link
                href={`/dashboard/inventory/barcodes?highlight=${encodeURIComponent(value)}`}
                target="_blank"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex gap-2">
          <Input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Scan or type ${label}…`}
            className="font-mono flex-1"
            autoFocus
          />
          <Button size="sm" onClick={handleSave} disabled={isSaving || !inputVal.trim()}>
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditing(false); setInputVal(value || "") }}
          >
            ✕
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "group rounded-lg border cursor-pointer transition-colors hover:border-primary/50",
            value ? "bg-card" : "bg-amber-50 dark:bg-amber-950/20 border-dashed border-amber-300"
          )}
          onClick={() => setEditing(true)}
        >
          {value ? (
            <div className="p-3 space-y-2">
              <div className="flex justify-center p-2 bg-white rounded border">
                <canvas
                  ref={canvasRef}
                  className="max-w-full"
                  style={{ height: "auto" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground truncate">{value}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                >
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Plus className="h-4 w-4" />
              <span>Click to assign {label}</span>
              <Badge variant="outline" className="ml-auto text-[9px] border-amber-300">Scan ready</Badge>
            </div>
          )}
        </div>
      )}

      {/* Link to barcode management page */}
      {value && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Scan className="h-3 w-3" />
          <Link
            href={`/dashboard/inventory/barcodes`}
            className="underline hover:text-foreground"
          >
            Open Barcode Manager
          </Link>
          {" "}to print or reassign
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Serial Number section
// ─────────────────────────────────────────────────────────────

function SerialNumberSection({
  item,
  onUpdate,
}: {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
}) {
  const [serialOpen,   setSerialOpen]   = useState(false)
  const [newSerial,    setNewSerial]    = useState("")
  const [isAdding,     setIsAdding]     = useState(false)
  const [serialCount,  setSerialCount]  = useState(
    (item as any).serialNumbers?.length || 0
  )

  const handleAdd = async () => {
    if (!newSerial.trim()) return
    setIsAdding(true)
    try {
      const result = await addSerialNumber({
        itemId:       item.id,
        serialNumber: newSerial.trim(),
      })
      if (result.success) {
        toast.success("Serial number added!")
        setSerialCount(c => c + 1)
        setNewSerial("")
        setSerialOpen(false)
        onUpdate({ _serialAdded: true })
      } else {
        toast.error(result.error || "Failed to add")
      }
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div
        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
        onClick={() => setSerialOpen(true)}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Serial Numbers</p>
            <p className="text-xs text-muted-foreground">
              {serialCount > 0 ? `${serialCount} registered` : "None registered"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {serialCount > 0 && (
            <Badge variant="secondary">{serialCount}</Badge>
          )}
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" asChild>
            <Link
              href={`/dashboard/inventory/barcodes?itemId=${item.id}&tab=serials`}
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3 mr-1" />View All
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={serialOpen} onOpenChange={setSerialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Serial Number</DialogTitle>
            <DialogDescription>
              Register a new serial number for <strong>{item.name}</strong>.
              You can scan it directly with your barcode scanner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newSerial}
                  onChange={e => setNewSerial(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd() }}
                  placeholder="Scan or type serial number…"
                  className="pl-10 font-mono"
                  autoFocus
                />
              </div>
              <Button onClick={handleAdd} disabled={!newSerial.trim() || isAdding}>
                {isAdding ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>
                Your USB/Bluetooth scanner works here automatically.
                Just scan and it submits instantly.
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href={`/dashboard/inventory/barcodes?itemId=${item.id}&tab=serials`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage All Serials in Barcode Manager
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function BasicInfoTab({ item, brandOptions, categoryOptions, onUpdate }: BasicInfoTabProps) {
  const [images, setImages] = useState({
    thumbnail: item.thumbnail || "",
    imageUrl:  item.imageUrl  || [],
  })

  const [selectedCategory, setSelectedCategory] = useState<Option | null>(
    categoryOptions.find(c => c.value === item.categoryId) || null
  )
  const [selectedBrand, setSelectedBrand] = useState<Option | null>(
    brandOptions.find(b => b.value === item.brandId) || null
  )
  const [isUpdating, setIsUpdating] = useState(false)

  // Live barcode field values (updated after saving)
  const [barcodeValues, setBarcodeValues] = useState({
    barcode: item.barcode || "",
    upc:     item.upc     || "",
    ean:     item.ean     || "",
    mpn:     item.mpn     || "",
    isbn:    item.isbn    || "",
  })

  const handleUpdate = async (data: Record<string, any>) => {
    try {
      const result = await updateItemById(item.id, data)
      if (result.success) {
        onUpdate(data)
        toast.success("Item updated successfully")
      } else {
        toast.error("Failed to update item")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred while updating")
    }
  }

  const handleImageUpdate = (thumbnail: string, imageUrl: string[]) => {
    setImages({ thumbnail, imageUrl })
    handleUpdate({ thumbnail, imageUrl })
  }

  const handleCategoryBrandUpdate = async () => {
    setIsUpdating(true)
    try {
      const updateData: Record<string, any> = {}
      if (selectedCategory?.value !== item.categoryId) updateData.categoryId = selectedCategory?.value || null
      if (selectedBrand?.value !== item.brandId)       updateData.brandId    = selectedBrand?.value    || null
      if (Object.keys(updateData).length > 0) await handleUpdate(updateData)
      else toast.info("No changes detected")
    } catch (e) {
      toast.error("Failed to update")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBarcodeSaved = (field: string, value: string) => {
    setBarcodeValues(prev => ({ ...prev, [field]: value }))
    onUpdate({ [field]: value })
  }

  return (
    <div className="grid gap-6">
      <UpdateCard
        title="Identity"
        subtitle="Name, SKU, and URL slug"
        fields={[
          { name: "name", label: "Item Name", type: "text", defaultValue: item.name, required: true },
          { name: "sku",  label: "SKU",       type: "text", defaultValue: item.sku, required: true, placeholder: "e.g., ITEM-001" },
          { name: "slug", label: "URL Slug",  type: "text", defaultValue: item.slug, required: true },
        ]}
        onSubmit={handleUpdate}
      />

      {/* ── Barcode & Identifiers ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Barcode className="h-4 w-4" />
                Barcodes & Identifiers
              </CardTitle>
              <CardDescription>
                Scan or type any code — all formats supported (1D, 2D, QR)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/inventory/barcodes">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Barcode Manager
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Scanner hint */}
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 text-xs">
            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">
              Click any barcode field below, then scan with your USB/Bluetooth scanner.
              Supports <strong>Code128, Code39, EAN-13, EAN-8, UPC-A, QR, Data Matrix, PDF417, Aztec</strong>.
            </span>
          </div>

          {/* Primary barcode */}
          <BarcodeField
            label="Primary Barcode"
            value={barcodeValues.barcode}
            field="barcode"
            itemId={item.id}
            onSaved={handleBarcodeSaved}
            format="CODE128"
          />

          <div className="grid grid-cols-2 gap-4">
            <BarcodeField
              label="UPC Code"
              value={barcodeValues.upc}
              field="upc"
              itemId={item.id}
              onSaved={handleBarcodeSaved}
              format="UPC_A"
            />
            <BarcodeField
              label="EAN Code"
              value={barcodeValues.ean}
              field="ean"
              itemId={item.id}
              onSaved={handleBarcodeSaved}
              format="EAN13"
            />
          </div>

          {/* MPN & ISBN remain as simple update fields */}
          <div className="grid grid-cols-2 gap-4">
            <UpdateCard
              title="MPN"
              subtitle="Manufacturer Part Number"
              fields={[{ name: "mpn", label: "MPN", type: "text", defaultValue: item.mpn }]}
              onSubmit={handleUpdate}
              singleField
            />
            <UpdateCard
              title="ISBN"
              subtitle="International Standard Book Number"
              fields={[{ name: "isbn", label: "ISBN", type: "text", defaultValue: item.isbn }]}
              onSubmit={handleUpdate}
              singleField
            />
          </div>

          {/* Serial numbers */}
          <div>
            <p className="text-sm font-medium mb-2">Serial Number Tracking</p>
            <SerialNumberSection item={item} onUpdate={onUpdate} />
          </div>
        </CardContent>
      </Card>

      <UpdateCard
        title="Description"
        subtitle="Product description and availability"
        fields={[
          { name: "description", label: "Description", type: "textarea", defaultValue: item.description },
          { name: "isActive",    label: "Active",      type: "checkbox", defaultValue: item.isActive },
        ]}
        onSubmit={handleUpdate}
      />

      <UpdateCard
        title="Physical Properties"
        subtitle="Weight and dimensions"
        fields={[
          { name: "weight",     label: "Weight",     type: "text", defaultValue: item.weight },
          { name: "dimensions", label: "Dimensions", type: "text", defaultValue: item.dimensions, placeholder: "e.g., 10x20x30cm" },
        ]}
        onSubmit={handleUpdate}
      />

      {/* Category & Brand */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category & Brand</CardTitle>
          <CardDescription>Product classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelectInput
                label="Category"
                options={categoryOptions}
                option={selectedCategory}
                setOption={setSelectedCategory}
                toolTipText="Add New Category"
                href="/dashboard/inventory/categories"
              />
              <FormSelectInput
                label="Brand"
                options={brandOptions}
                option={selectedBrand}
                setOption={setSelectedBrand}
                toolTipText="Add New Brand"
                href="/dashboard/inventory/brands"
              />
            </div>
            <Button type="button" onClick={handleCategoryBrandUpdate} disabled={isUpdating} className="w-full">
              {isUpdating ? "Updating…" : "Update Category & Brand"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <div className="bg-card border border-input rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Media</h3>
          <p className="text-sm text-muted-foreground">Product images and thumbnails</p>
        </div>
        <div className="grid gap-3 w-full">
          <ImageUploadField
            label="Product Images"
            currentThumbnail={images.thumbnail}
            currentImages={images.imageUrl}
            onChange={handleImageUpdate}
          />
        </div>
      </div>
    </div>
  )
}