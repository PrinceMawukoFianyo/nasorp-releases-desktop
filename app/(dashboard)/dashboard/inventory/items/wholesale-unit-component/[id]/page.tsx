"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  Calendar as CalendarIcon, Plus, Trash2, ArrowLeft,
  AlertCircle, Send, Package2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getSalesOrderById, updateSalesOrder, sendSalesOrderEmail } from "@/actions/sales-orders"
import { getCustomers } from "@/actions/customers"
import { getItems, getLocations } from "@/actions/purchase-order"
import { getPricingTiersForItems, PricingTierRecord } from "@/actions/pricing-tiers"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id:           string
  itemId:       string
  itemName:     string
  sellingPrice: number      // GHS 10.00 — normal single-unit retail price

  // Wholesale sell-as state
  saleMode:              "single" | "wholesale"
  tierId:                string | null     // null = single unit
  tierName:              string | null     // "Box", "Half Sack" etc.
  packQuantity:          number            // how many packs (e.g. 2 boxes)
  unitsPerPack:          number            // units per pack (e.g. 6)
  wholesalePricePerPack: number            // GHS 48.00 per box

  // Values stored in DB
  quantity:   number    // ACTUAL units = packQuantity × unitsPerPack (deducted from stock)
  unitPrice:  number    // per-single-unit accounting price = wholesalePrice / unitsPerPack
  taxRate:    number
}

interface Customer { id: string; name: string; email?: string }
interface Location  { id: string; name: string }
interface Item      { id: string; name: string; sku: string; sellingPrice?: number }

const salesOrderSchema = z.object({
  orderNumber:   z.string().min(1, "Order number is required"),
  customerId:    z.string().min(1, "Customer is required"),
  locationId:    z.string().min(1, "Location is required"),
  orderDate:     z.date(),
  deliveryDate:  z.date().optional().nullable(),
  status:        z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().optional(),
  shippingCost:  z.number().min(0).default(0),
  discount:      z.number().min(0).default(0),
  notes:         z.string().optional(),
})

function newBlankLine(): LineItem {
  return {
    id:                    `temp-${Date.now()}-${Math.random()}`,
    itemId:                "",
    itemName:              "",
    sellingPrice:          0,
    saleMode:              "single",
    tierId:                null,
    tierName:              null,
    packQuantity:          1,
    unitsPerPack:          1,
    wholesalePricePerPack: 0,
    quantity:              1,
    unitPrice:             0,
    taxRate:               0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EditSalesOrderPage() {
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.id as string

  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [isLoadingData,   setIsLoadingData]   = useState(true)
  const [isCancelled,     setIsCancelled]     = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddress,    setEmailAddress]    = useState("")
  const [isSendingEmail,  setIsSendingEmail]  = useState(false)

  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [locations,  setLocations]  = useState<Location[]>([])
  const [items,      setItems]      = useState<Item[]>([])
  const [lineItems,  setLineItems]  = useState<LineItem[]>([])
  const [tiersMap,   setTiersMap]   = useState<Record<string, PricingTierRecord[]>>({})

  const form = useForm({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      orderNumber: "", customerId: "", locationId: "",
      orderDate: new Date(), deliveryDate: undefined as Date | undefined | null,
      status: "DRAFT", paymentStatus: "PENDING", paymentMethod: "",
      shippingCost: 0, discount: 0, notes: "",
    },
  })

  useEffect(() => { loadData() }, [orderId])

  const loadData = async () => {
    try {
      setIsLoadingData(true)
      const [salesOrder, customersRes, locationsRes, itemsRes] = await Promise.all([
        getSalesOrderById(orderId),
        getCustomers(),
        getLocations(),
        getItems(),
      ])

      if (!salesOrder) {
        toast.error("Credit Sales not found")
        router.push("/dashboard/sales/orders")
        return
      }

      if (salesOrder.status === "CANCELLED") setIsCancelled(true)

      const orderDate = (salesOrder as any).orderDate
        ? new Date((salesOrder as any).orderDate)
        : salesOrder.createdAt ? new Date(salesOrder.createdAt) : new Date()
      let deliveryDate: Date | undefined | null = undefined
      if ((salesOrder as any).deliveryDate)
        deliveryDate = new Date((salesOrder as any).deliveryDate)

      form.reset({
        orderNumber:   (salesOrder as any).orderNumber || salesOrder.id,
        customerId:    (salesOrder as any).customerId  || "",
        locationId:    salesOrder.location?.id || "",
        orderDate,
        deliveryDate,
        status:        salesOrder.status,
        paymentStatus: (salesOrder as any).paymentStatus || "PENDING",
        paymentMethod: (salesOrder as any).paymentMethod || "",
        shippingCost:  salesOrder.shippingCost || 0,
        discount:      salesOrder.discount     || 0,
        notes:         (salesOrder as any).notes || "",
      })

      // Parse existing lines — reconstruct tier metadata from notes JSON
      const formattedLines: LineItem[] = (salesOrder.lines ?? []).map((line: any) => {
        let tierName:              string | null = null
        let tierId:                string | null = null
        let packQty              = 1
        let unitsPerPack         = 1
        let wholesalePricePerPack = line.unitPrice || 0

        try {
          if (line.notes) {
            const meta = JSON.parse(line.notes)
            tierName              = meta.tierName              ?? null
            tierId                = meta.tierId                ?? null
            packQty               = meta.packQty               ?? 1
            unitsPerPack          = meta.unitsPerPack          ?? 1
            wholesalePricePerPack = meta.wholesalePricePerPack ?? line.unitPrice
          }
        } catch { /* plain text notes */ }

        return {
          id:                    line.id,
          itemId:                line.itemId,
          itemName:              line.item?.name || "",
          sellingPrice:          line.item?.sellingPrice || 0,
          saleMode:              tierId ? "wholesale" : "single",
          tierId,
          tierName,
          packQuantity:          packQty,
          unitsPerPack,
          wholesalePricePerPack,
          quantity:              line.quantity,
          unitPrice:             line.unitPrice,
          taxRate:               line.taxRate || 0,
        }
      })
      setLineItems(formattedLines)

      const customersList = Array.isArray(customersRes)
        ? customersRes
        : (customersRes as any).customers || []
      setCustomers(customersList)
      setLocations(locationsRes)
      setItems(itemsRes)

      // Batch-load pricing tiers for all items
      const itemIds = (itemsRes as Item[]).map((i) => i.id)
      if (itemIds.length > 0) {
        const tm = await getPricingTiersForItems(itemIds)
        setTiersMap(tm)
      }
    } catch (error) {
      console.error("Failed to load:", error)
      toast.error("Failed to load Credit Sales")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoadingData(false)
    }
  }

  // ── Line item helpers ────────────────────────────────────────────────────────

  const addLineItem = () => setLineItems(prev => [...prev, newBlankLine()])

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) { toast.error("Order must have at least one item"); return }
    setLineItems(prev => prev.filter(l => l.id !== id))
  }

  // When item is selected from dropdown — reset to single-unit defaults
  const handleItemSelect = (lineId: string, itemId: string) => {
    const selected = items.find(i => i.id === itemId)
    if (!selected) return
    setLineItems(prev => prev.map(line => line.id !== lineId ? line : {
      ...line,
      itemId,
      itemName:              selected.name,
      sellingPrice:          selected.sellingPrice || 0,
      saleMode:              "single",
      tierId:                null,
      tierName:              null,
      packQuantity:          1,
      unitsPerPack:          1,
      wholesalePricePerPack: selected.sellingPrice || 0,
      quantity:              1,
      unitPrice:             selected.sellingPrice || 0,
    }))
  }

  // When "Sell as" dropdown changes — Single or a wholesale tier
  const handleSaleModeChange = (lineId: string, value: string) => {
    setLineItems(prev => prev.map(line => {
      if (line.id !== lineId) return line

      if (value === "__single__") {
        // Switched back to single — pack qty becomes unit qty
        return {
          ...line,
          saleMode:             "single",
          tierId:               null,
          tierName:             null,
          unitsPerPack:         1,
          wholesalePricePerPack: line.sellingPrice,
          quantity:             line.packQuantity,
          unitPrice:            line.sellingPrice,
        }
      }

      // Wholesale tier selected
      const tier = (tiersMap[line.itemId] ?? []).find(t => t.id === value)
      if (!tier) return line

      return {
        ...line,
        saleMode:             "wholesale",
        tierId:               tier.id,
        tierName:             tier.packagingUnitName,
        unitsPerPack:         tier.unitsPerPack,
        wholesalePricePerPack: tier.wholesalePrice,
        quantity:             line.packQuantity * tier.unitsPerPack,
        unitPrice:            tier.pricePerUnit,  // for accounting = GHS 8.00/unit
      }
    }))
  }

  // When pack quantity (number of boxes/sacks) changes
  const handlePackQtyChange = (lineId: string, rawVal: string) => {
    const packQty = Math.max(1, parseInt(rawVal) || 1)
    setLineItems(prev => prev.map(line => {
      if (line.id !== lineId) return line
      const actualUnits = line.saleMode === "wholesale"
        ? packQty * line.unitsPerPack
        : packQty
      return { ...line, packQuantity: packQty, quantity: actualUnits }
    }))
  }

  const handleTaxChange = (lineId: string, val: string) =>
    setLineItems(prev => prev.map(l => l.id !== lineId ? l : { ...l, taxRate: parseFloat(val) || 0 }))

  // ── Line totals ──────────────────────────────────────────────────────────────

  function lineBase(line: LineItem) {
    return line.saleMode === "wholesale"
      ? line.packQuantity * line.wholesalePricePerPack
      : line.packQuantity * line.sellingPrice
  }

  function lineTotal(line: LineItem) {
    return lineBase(line) * (1 + line.taxRate / 100)
  }

  // ── Order totals ────────────────────────────────────────────────────────────

  const calculateTotals = () => {
    const subtotal  = lineItems.reduce((s, l) => s + lineBase(l),     0)
    const taxAmount = lineItems.reduce((s, l) => s + lineBase(l) * (l.taxRate / 100), 0)
    const shipping  = form.watch("shippingCost") || 0
    const discount  = form.watch("discount")     || 0
    return { subtotal, taxAmount, total: subtotal + taxAmount + shipping - discount }
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateLineItems = () => {
    for (const line of lineItems) {
      if (!line.itemId)           { toast.error("Please select an item for all lines"); return false }
      if (line.packQuantity <= 0) { toast.error("Pack quantity must be at least 1");    return false }
    }
    return true
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: any) => {
    if (!lineItems.length)      { toast.error("Please add at least one item"); return }
    if (!validateLineItems())   return

    setIsSubmitting(true)
    try {
      const totals = calculateTotals()

      const salesOrderData = {
        orderNumber:   data.orderNumber,
        customerId:    data.customerId,
        locationId:    data.locationId,
        orderDate:     data.orderDate,
        deliveryDate:  data.deliveryDate || null,
        status:        data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod || null,
        shippingCost:  data.shippingCost,
        discount:      data.discount,
        notes:         data.notes,
        subtotal:      totals.subtotal,
        taxAmount:     totals.taxAmount,
        lines: {
          create: lineItems.map(line => ({
            itemId:    line.itemId,
            quantity:  line.quantity,       // ← ACTUAL UNITS (for stock deduction)
            unitPrice: line.unitPrice,      // ← per-single unit price (for accounting)
            taxRate:   line.taxRate,
            taxAmount: lineBase(line) * (line.taxRate / 100),
            total:     lineTotal(line),
            serialNumbers: [],
            // Pack metadata — read by receipt + wholesale report
            notes: line.tierId
              ? JSON.stringify({
                  tierId:                line.tierId,
                  tierName:              line.tierName,
                  packQty:               line.packQuantity,
                  unitsPerPack:          line.unitsPerPack,
                  wholesalePricePerPack: line.wholesalePricePerPack,
                })
              : undefined,
          })),
        },
      }

      const result = await updateSalesOrder(orderId, salesOrderData)
      if (result.success) {
        toast.success("Credit Sales updated successfully")
        router.push("/dashboard/sales/orders")
      } else {
        toast.error(result.error || "Failed to update Credit Sales")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailAddress) { toast.error("Please enter an email address"); return }
    setIsSendingEmail(true)
    try {
      const result = await sendSalesOrderEmail(orderId, emailAddress)
      if (result.success) {
        toast.success("Email sent successfully")
        setShowEmailDialog(false)
        setEmailAddress("")
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } finally { setIsSendingEmail(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoadingData) return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center gap-4">
      <Spinner className="size-8" />
      <p className="text-muted-foreground">Loading order…</p>
    </div>
  )

  if (isCancelled) return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This order has been cancelled and cannot be edited.{" "}
            <Link href="/dashboard/sales/orders" className="underline ml-2">Return to orders</Link>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard/sales/orders"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />Back to Credit Saless
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Credit Sales</h1>
              <p className="text-muted-foreground mt-1">Update order details and items</p>
            </div>
            <Button variant="outline" onClick={() => setShowEmailDialog(true)} disabled={isSendingEmail}>
              {isSendingEmail ? <Spinner className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Email
            </Button>
          </div>
        </div>

        {/* Email dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Send Order Email</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="customer@example.com"
                  value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)} disabled={isSendingEmail}>Cancel</Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailAddress}>
                {isSendingEmail ? <><Spinner className="mr-2 h-4 w-4" />Sending…</> : <><Send className="mr-2 h-4 w-4" />Send</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Order Details */}
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Number *</Label>
                <Input {...form.register("orderNumber")} placeholder="SO-001" />
                {form.formState.errors.orderNumber && (
                  <p className="text-sm text-red-600">{form.formState.errors.orderNumber.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={form.watch("customerId")} onValueChange={(v) => form.setValue("customerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select value={form.watch("locationId")} onValueChange={(v) => form.setValue("locationId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.watch("orderDate") && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("orderDate") ? format(form.watch("orderDate"), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.watch("orderDate")}
                      onSelect={(d) => form.setValue("orderDate", d || new Date())} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.watch("deliveryDate") && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("deliveryDate") ? format(form.watch("deliveryDate") as Date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.watch("deliveryDate") || undefined}
                      onSelect={(d) => form.setValue("deliveryDate", d || null)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DRAFT","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","COMPLETED"].map(s => (
                      <SelectItem key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={form.watch("paymentStatus")} onValueChange={(v) => form.setValue("paymentStatus", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["PENDING","PARTIAL","PAID","REFUNDED"].map(s => (
                      <SelectItem key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={form.watch("paymentMethod") || "NOT_SPECIFIED"}
                  onValueChange={(v) => form.setValue("paymentMethod", v === "NOT_SPECIFIED" ? "" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["NOT_SPECIFIED","Not Specified"],["CASH","Cash"],["CARD","Card"],
                      ["BANK_TRANSFER","Bank Transfer"],["MOBILE_MONEY","Mobile Money"],
                      ["CHECK","Check"],["OTHER","Other"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── Order Items ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use "Sell as" to choose wholesale pack pricing. Stock always deducts by actual units.
                  </p>
                </div>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No items added. Click "Add Item" to get started.</p>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((line) => {
                    const itemTiers  = tiersMap[line.itemId] ?? []
                    const hasWholesale = itemTiers.length > 0
                    const isWholesale  = line.saleMode === "wholesale"

                    return (
                      <div key={line.id} className={cn(
                        "p-4 border rounded-lg space-y-3 transition-colors",
                        isWholesale ? "border-amber-200 bg-amber-50/40" : "border-border"
                      )}>

                        {/* Row 1: item, sell-as, qty, tax, remove */}
                        <div className="grid grid-cols-12 gap-3 items-end">

                          {/* Item selector */}
                          <div className={cn("space-y-1", hasWholesale ? "col-span-4" : "col-span-5")}>
                            <Label className="text-xs">Item *</Label>
                            <Select value={line.itemId} onValueChange={(v) => handleItemSelect(line.id, v)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map(i => (
                                  <SelectItem key={i.id} value={i.id}>
                                    {i.name} — {i.sku}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* "Sell as" — only when item has wholesale tiers */}
                          {hasWholesale && (
                            <div className="col-span-3 space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Package2 className="h-3 w-3 text-amber-600" />
                                Sell as
                              </Label>
                              <Select
                                value={line.tierId ?? "__single__"}
                                onValueChange={(v) => handleSaleModeChange(line.id, v)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__single__">
                                    <span className="text-xs">Single · GHS {line.sellingPrice.toFixed(2)} ea</span>
                                  </SelectItem>
                                  {itemTiers.map(tier => (
                                    <SelectItem key={tier.id} value={tier.id}>
                                      <span className="text-xs">
                                        {tier.packagingUnitName} · {tier.unitsPerPack} units · GHS {tier.wholesalePrice.toFixed(2)}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Qty / Pack qty — label changes based on mode */}
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs truncate">
                              {isWholesale ? `# ${line.tierName}s` : "Qty"}
                            </Label>
                            <Input
                              type="number" min="1"
                              className="h-8 text-sm"
                              value={line.packQuantity}
                              onChange={(e) => handlePackQtyChange(line.id, e.target.value)}
                            />
                          </div>

                          {/* Tax */}
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Tax %</Label>
                            <Input type="number" min="0" max="100" step="0.01"
                              className="h-8 text-sm" value={line.taxRate}
                              onChange={(e) => handleTaxChange(line.id, e.target.value)} />
                          </div>

                          {/* Remove */}
                          <div className="col-span-1 flex justify-end">
                            <Button type="button" variant="ghost" size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeLineItem(line.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Row 2: info strip */}
                        <div className="flex items-center justify-between text-xs px-1">
                          {isWholesale ? (
                            <div className="flex flex-wrap items-center gap-2 text-amber-800">
                              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] gap-1">
                                <Package2 className="h-2.5 w-2.5" />
                                Wholesale · {line.tierName}
                              </Badge>
                              <span>
                                {line.packQuantity} × {line.tierName} ({line.unitsPerPack} units ea)
                                = <strong>{line.quantity} units</strong> deducted from stock
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span>GHS {line.wholesalePricePerPack.toFixed(2)} per {line.tierName}</span>
                              {line.sellingPrice > 0 && line.unitPrice < line.sellingPrice && (
                                <span className="text-green-600 font-medium">
                                  (saves GHS {(line.sellingPrice - line.unitPrice).toFixed(2)}/unit vs single)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {line.packQuantity} unit{line.packQuantity !== 1 ? "s" : ""} × GHS {line.sellingPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="font-semibold text-foreground">
                            GHS {lineTotal(line).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Costs & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Additional Costs</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shipping Cost</Label>
                  <Input type="number" step="0.01" min="0"
                    {...form.register("shippingCost", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input type="number" step="0.01" min="0"
                    {...form.register("discount", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...form.register("notes")} rows={4} placeholder="Add notes or instructions…" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {/* Wholesale breakdown mini-panel */}
                {lineItems.some(l => l.saleMode === "wholesale") && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1.5 mb-1">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                      <Package2 className="h-3 w-3" />Wholesale lines
                    </p>
                    {lineItems.filter(l => l.saleMode === "wholesale").map(l => (
                      <div key={l.id} className="flex justify-between text-xs text-amber-700">
                        <span>{l.itemName} — {l.packQuantity} × {l.tierName} ({l.quantity} units)</span>
                        <span className="font-semibold">GHS {(l.packQuantity * l.wholesalePricePerPack).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">GHS {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-semibold">GHS {totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-semibold">GHS {(form.watch("shippingCost") || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-semibold text-red-600">
                    -GHS {(form.watch("discount") || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold text-lg">Total:</span>
                  <span className="font-bold text-xl">GHS {totals.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline"
              onClick={() => router.push("/dashboard/sales/orders")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Spinner className="mr-2 h-4 w-4" />Updating…</>
                : "Update Credit Sales"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}