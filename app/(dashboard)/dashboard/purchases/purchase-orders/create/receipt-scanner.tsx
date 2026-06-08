"use client"

import { useState, useRef, useCallback, DragEvent, ChangeEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ScanLine,
  Upload,
  FileText,
  ImageIcon,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ClipboardPaste,
  Eye,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { getPricingTiersForItems } from "@/actions/pricing-tiers"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScannedLineItem {
  itemId:           string
  itemName:         string
  itemSku:          string
  quantity:         number
  unitPrice:        number
  taxRate:          number
  lineTotal:        number
  locationId?:      string
  locationName?:    string
  packagingTierId?: string
  packQuantity?:    number
  unitsPerPack?:    number
  wholesalePricePerPack?: number
}

export interface ScannedPOData {
  supplierName:         string
  supplierId:           string
  deliveryLocationId:   string
  orderDate:            string
  expectedDeliveryDate: string
  deliveryAddress:      string
  paymentTerms:         string
  shippingCost:         string
  notes:                string
  lineItems:            ScannedLineItem[]
}

interface AvailableItem {
  id: string
  name: string
  sku: string
  description?: string
  unitCost?: number
}

interface AvailableSupplier {
  id: string
  name: string
  email?: string
}

interface AvailableLocation {
  id: string
  name: string
  address?: string
}

interface ReceiptScannerProps {
  availableItems:     AvailableItem[]
  availableSuppliers: AvailableSupplier[]
  availableLocations: AvailableLocation[]
  onExtracted:        (data: ScannedPOData) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n)

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function buildSystemPrompt(
  items:     AvailableItem[],
  suppliers: AvailableSupplier[],
  locations: AvailableLocation[]
): string {
  return `You are an expert procurement document parser for a goods management system.

Your job: extract ALL structured purchase order data from receipts, invoices, delivery notes, or pasted text.
IMPORTANT: Extract EVERY single line item on the receipt — do not skip any rows.
Return ONLY valid JSON — no markdown, no explanation, no backticks.

SYSTEM CATALOGUE (match extracted names against these):

AVAILABLE ITEMS (id, name, sku):
${items.map(i => `  ${i.id} | ${i.name} | ${i.sku}`).join("\n") || "  (none — extract raw names only)"}

AVAILABLE SUPPLIERS (id, name):
${suppliers.map(s => `  ${s.id} | ${s.name}`).join("\n") || "  (none)"}

AVAILABLE DELIVERY LOCATIONS (id, name):
${locations.map(l => `  ${l.id} | ${l.name}`).join("\n") || "  (none)"}

MATCHING RULES:
- Extract EVERY line item — even if handwritten and hard to read, include your best guess
- For each item name, find closest match in AVAILABLE ITEMS using fuzzy name/sku matching. Set itemId to matched id, or "" if no match
- For supplier name, find closest in AVAILABLE SUPPLIERS. Set supplierId to matched id, or "" if unmatched
- For each line item, if a delivery location is specified (e.g., "store location: Accra", "deliver to: Kumasi"), try to match it to AVAILABLE DELIVERY LOCATIONS and set locationId to matched id, or "" if no match
- Set deliveryLocationId to "" if you cannot determine location
- Dates must be yyyy-MM-dd format. Use today's date if not found
- Quantities and prices must be numbers. Default taxRate to 0
- lineTotal = quantity * unitPrice
- shippingCost as string like "0" or "25.50"
- If a price is missing, set unitPrice to 0 and note it in the item notes

RETURN this exact JSON shape (no extra fields, no markdown):
{
  "supplierName": "",
  "supplierId": "",
  "deliveryLocationId": "",
  "orderDate": "",
  "expectedDeliveryDate": "",
  "deliveryAddress": "",
  "paymentTerms": "",
  "shippingCost": "0",
  "notes": "",
  "lineItems": [
    {
      "itemId": "",
      "itemName": "",
      "itemSku": "",
      "quantity": 1,
      "unitPrice": 0.00,
      "taxRate": 0,
      "lineTotal": 0.00,
      "locationId": "",
      "locationName": ""
    }
  ]
}`
}

function extractJSON(raw: string): ScannedPOData {
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()

  const start = cleaned.indexOf("{")
  const end   = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON found in response")
  }
  cleaned = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(cleaned)
  } catch {
    const fixed = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/:\s*undefined/g, ": null")
    return JSON.parse(fixed)
  }
}

async function callScanAPI(
  prompt:       string,
  imageBase64?: string,
  mediaType?:   string
): Promise<ScannedPOData> {
  const userContent: any[] = []

  if (imageBase64 && mediaType) {
    userContent.push({
      type:      "image_url",
      image_url: {
        url:    `data:${mediaType};base64,${imageBase64}`,
        detail: "high",
      },
    })
  }

  userContent.push({ type: "text", text: prompt })

  const response = await fetch("/api/ai/scan-receipt", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error ?? `API error ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("Empty response from AI")

  if (typeof content === "string") {
    return extractJSON(content)
  }
  return content as ScannedPOData
}

// ── Preview Card (unchanged, but uses fmtCurrency) ────────────────────────────
function PreviewCard({
  data,
  suppliers,
  locations,
  onConfirm,
  onDiscard,
}: {
  data:      ScannedPOData
  suppliers: AvailableSupplier[]
  locations: AvailableLocation[]
  onConfirm: () => void
  onDiscard: () => void
}) {
  const matchedItems   = data.lineItems.filter(l => l.itemId)
  const unmatchedItems = data.lineItems.filter(l => !l.itemId)
  const supplierName   = data.supplierId
    ? (suppliers.find(s => s.id === data.supplierId)?.name ?? data.supplierName)
    : data.supplierName
  const locationName   = data.deliveryLocationId
    ? (locations.find(l => l.id === data.deliveryLocationId)?.name ?? "—")
    : "— (select manually)"

  const total = data.lineItems.reduce((s, l) => s + (l.lineTotal || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">Extraction Complete</p>
          <p className="text-xs text-muted-foreground">
            {data.lineItems.length} items found · {matchedItems.length} matched ·{" "}
            {data.supplierId ? "Supplier matched" : "Supplier unmatched"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "Supplier",   value: supplierName || "—",      warn: !data.supplierId },
          { label: "Location",   value: locationName,              warn: !data.deliveryLocationId },
          { label: "Order Date", value: data.orderDate || "—",     warn: false },
          { label: "Payment",    value: data.paymentTerms || "—",  warn: false },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-muted/40 rounded-md px-3 py-2">
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">{label}</p>
            <p className={`font-semibold mt-0.5 truncate ${warn ? "text-amber-600" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex justify-between">
          <span>Items ({data.lineItems.length})</span>
          <span>Total</span>
        </div>
        <div className="divide-y max-h-56 overflow-y-auto">
          {data.lineItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.itemId ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.itemName}</p>
                  <p className="text-muted-foreground">
                    Qty {item.quantity} × {fmtCurrency(item.unitPrice)}
                    {!item.itemId && <span className="text-amber-600 ml-1">(select manually)</span>}
                  </p>
                </div>
              </div>
              <span className="font-semibold ml-2 flex-shrink-0">{fmtCurrency(item.lineTotal || 0)}</span>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 bg-muted/20 flex justify-between text-xs font-bold border-t">
          <span>Estimated Total</span>
          <span>{fmtCurrency(total)}</span>
        </div>
      </div>

      {(unmatchedItems.length > 0 || !data.supplierId) && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            {!data.supplierId && "Supplier could not be matched — select manually. "}
            {unmatchedItems.length > 0 &&
              `${unmatchedItems.length} item(s) unmatched — you can select them manually in the form after filling.`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDiscard}>
          <X className="w-3.5 h-3.5 mr-1.5" />Discard
        </Button>
        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm}>
          Fill Form
          <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Packaging Wizard Modal (new) ──────────────────────────────────────────────
function PackagingWizardModal({
  open,
  onOpenChange,
  items,
  tiersMap,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ScannedLineItem[]
  tiersMap: Record<string, any[]>
  onConfirm: (updatedItems: ScannedLineItem[]) => void
}) {
  const [localItems, setLocalItems] = useState(items)

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const handleSelectTier = (idx: number, tierId: string) => {
    const selected = tiersMap[localItems[idx].itemId]?.find(t => t.id === tierId)
    if (!selected) return
    const newItems = [...localItems]
    const original = localItems[idx]
    newItems[idx] = {
      ...original,
      packagingTierId: selected.id,
      packQuantity: original.quantity,
      unitsPerPack: selected.unitsPerPack,
      wholesalePricePerPack: selected.wholesalePrice,
      quantity: original.quantity * selected.unitsPerPack,
      unitPrice: selected.wholesalePrice / selected.unitsPerPack,
      lineTotal: (original.quantity * selected.unitsPerPack) * (selected.wholesalePrice / selected.unitsPerPack)
    }
    setLocalItems(newItems)
  }

  const hasAnyTier = localItems.some(item => (tiersMap[item.itemId]?.length || 0) > 0)

  if (!hasAnyTier) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Packaging Units</DialogTitle>
          <DialogDescription>
            Some items are sold in packs (boxes, sacks, etc.). Please confirm the pack type.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {localItems.map((item, idx) => {
            const tiers = tiersMap[item.itemId] || []
            if (tiers.length === 0) return null
            return (
              <div key={idx} className="border rounded-lg p-3">
                <p className="font-semibold">{item.itemName}</p>
                <p className="text-sm text-muted-foreground">AI detected quantity: {item.quantity}</p>
                <div className="mt-2">
                  <label className="text-xs font-medium">Select pack type:</label>
                  <Select onValueChange={(val) => handleSelectTier(idx, val)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Choose pack size" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.packagingUnitName} – {t.unitsPerPack} units @ {fmtCurrency(t.wholesalePrice)}/pack
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(localItems)}>Confirm & Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReceiptScanner({
  availableItems,
  availableSuppliers,
  availableLocations,
  onExtracted,
}: ReceiptScannerProps) {
  const [open, setOpen]                     = useState(false)
  const [tab, setTab]                       = useState<"paste" | "upload">("paste")
  const [pastedText, setPastedText]         = useState("")
  const [imageFile, setImageFile]           = useState<File | null>(null)
  const [imagePreview, setImagePreview]     = useState<string | null>(null)
  const [isDragging, setIsDragging]         = useState(false)
  const [isScanning, setIsScanning]         = useState(false)
  const [scannedData, setScannedData]       = useState<ScannedPOData | null>(null)
  const [scanError, setScanError]           = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Packaging wizard state
  const [packagingModalOpen, setPackagingModalOpen] = useState(false)
  const [packagingItems, setPackagingItems] = useState<ScannedLineItem[]>([])
  const [tiersMap, setTiersMap] = useState<Record<string, any[]>>({})

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image (JPG, PNG, WEBP)")
      return
    }
    setImageFile(file)
    setScanError(null)
    setScannedData(null)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleScan = async () => {
    const hasText  = tab === "paste"  && pastedText.trim().length > 5
    const hasImage = tab === "upload" && imageFile !== null

    if (!hasText && !hasImage) {
      toast.error(tab === "paste" ? "Paste some receipt text first" : "Upload or drop an image first")
      return
    }

    setIsScanning(true)
    setScanError(null)
    setScannedData(null)

    try {
      const systemPrompt = buildSystemPrompt(availableItems, availableSuppliers, availableLocations)
      let parsed: ScannedPOData

      if (hasText) {
        const userPrompt = `${systemPrompt}\n\n--- RECEIPT / INVOICE TEXT ---\n${pastedText}`
        parsed = await callScanAPI(userPrompt)
      } else {
        const base64    = await fileToBase64(imageFile!)
        const mediaType = imageFile!.type
        const userPrompt = `${systemPrompt}\n\nAnalyse this receipt/invoice image carefully. Extract ALL line items — even handwritten ones. Include every row you can see.`
        parsed = await callScanAPI(userPrompt, base64, mediaType)
      }

      if (!parsed.lineItems) parsed.lineItems = []

      // Fetch pricing tiers for items that have itemId
      const itemIds = parsed.lineItems.map(li => li.itemId).filter(Boolean)
      let tiers: Record<string, any[]> = {}
      if (itemIds.length > 0) {
        tiers = await getPricingTiersForItems(itemIds)
        setTiersMap(tiers)
      }

      // Check if any item has packaging tiers
      const hasTiers = parsed.lineItems.some(li => (tiers[li.itemId]?.length || 0) > 0)
      if (hasTiers) {
        setPackagingItems(parsed.lineItems)
        setPackagingModalOpen(true)
      } else {
        setScannedData(parsed)
      }
    } catch (err: any) {
      console.error("[ReceiptScanner]", err)
      setScanError(err?.message ?? "Failed to extract data. Please try again or use a clearer image.")
    } finally {
      setIsScanning(false)
    }
  }

  const handlePackagingConfirm = (updatedItems: ScannedLineItem[]) => {
    if (scannedData) {
      const finalData = { ...scannedData, lineItems: updatedItems }
      setScannedData(finalData)
    } else {
      // This case shouldn't happen, but fallback
      setScannedData({ supplierName: "", supplierId: "", deliveryLocationId: "", orderDate: "", expectedDeliveryDate: "", deliveryAddress: "", paymentTerms: "", shippingCost: "0", notes: "", lineItems: updatedItems })
    }
    setPackagingModalOpen(false)
  }

  const handleConfirm = () => {
    if (!scannedData) return
    onExtracted(scannedData)
    setOpen(false)
    toast.success(`Form filled! ${scannedData.lineItems.length} items extracted.`, {
      description: "Review and adjust any unmatched items or supplier.",
    })
    // Reset
    setPastedText("")
    setImageFile(null)
    setImagePreview(null)
    setScannedData(null)
    setPackagingItems([])
    setTiersMap({})
  }

  const handleDiscard = () => {
    setScannedData(null)
    setScanError(null)
  }

  const handleClose = () => {
    setOpen(false)
    setScannedData(null)
    setScanError(null)
    setPackagingModalOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Scan Receipt / Invoice
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base">AI Receipt Scanner</DialogTitle>
                <DialogDescription className="text-xs">
                  Drop an image or paste text from any receipt, invoice, or delivery note
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {scannedData ? (
            <PreviewCard
              data={scannedData}
              suppliers={availableSuppliers}
              locations={availableLocations}
              onConfirm={handleConfirm}
              onDiscard={handleDiscard}
            />
          ) : (
            <div className="space-y-4">
              <Tabs value={tab} onValueChange={v => setTab(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="paste" className="flex-1 gap-2 text-xs">
                    <ClipboardPaste className="w-3.5 h-3.5" />Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1 gap-2 text-xs">
                    <ImageIcon className="w-3.5 h-3.5" />Image / Photo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="mt-3 space-y-2">
                  <Textarea
                    placeholder={`Paste receipt or invoice text here…\n\nExample:\nSupplier: Bross Enterprise\nDate: 04/04/2026\nItem: Blanco 270g — 10 units @ GHS 12.50\nItem: Softcare Blue 40L — 6 units @ GHS 45.00\nTotal: GHS 395.00`}
                    value={pastedText}
                    onChange={e => { setPastedText(e.target.value); setScanError(null) }}
                    rows={9}
                    className="text-xs font-mono resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Accepts any format — structured or messy. The AI will figure it out.
                  </p>
                </TabsContent>

                <TabsContent value="upload" className="mt-3 space-y-2">
                  <div
                    className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
                      ${isDragging
                        ? "border-emerald-500 bg-emerald-50 scale-[1.01]"
                        : "border-muted-foreground/30 hover:border-emerald-400 hover:bg-muted/30"
                      }`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Receipt preview"
                          className="w-full max-h-56 object-contain rounded-xl"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-10 flex flex-col items-center gap-3 text-center px-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                          ${isDragging ? "bg-emerald-100" : "bg-muted/60"}`}>
                          <Upload className={`w-5 h-5 ${isDragging ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {isDragging ? "Drop it here!" : "Drop receipt image here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG, WEBP · or click to browse
                          </p>
                        </div>
                        {imageFile && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <FileText className="w-3 h-3" />{imageFile.name}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Works with photos, scans, screenshots of receipts or delivery notes.
                    For best results, ensure the image is clear and well-lit.
                  </p>
                </TabsContent>
              </Tabs>

              {scanError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{scanError}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 h-10"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning receipt… this may take 10–20 seconds
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract Purchase Data
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                AI will extract all items and match them to your catalogue automatically
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PackagingWizardModal
        open={packagingModalOpen}
        onOpenChange={setPackagingModalOpen}
        items={packagingItems}
        tiersMap={tiersMap}
        onConfirm={handlePackagingConfirm}
      />
    </>
  )
}