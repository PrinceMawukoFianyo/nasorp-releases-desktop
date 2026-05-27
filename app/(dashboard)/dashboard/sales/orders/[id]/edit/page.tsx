// app/(dashboard)/dashboard/sales/orders/[id]/edit/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getSalesOrderById, updateSalesOrder, getSalesOrderItems } from "@/actions/sales-orders"
import { getOrgLocations } from "@/actions/locations"
import { getOrgCustomer } from "@/actions/customers"



interface LineItem {
  itemId: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  total: number
  serialNumbers: string[]
  itemName?: string
}

export default function EditSalesOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [isLoading, setIsLoading]   = useState(true)
  const [isSaving, setIsSaving]     = useState(false)
  const [order, setOrder]           = useState<any>(null)

  // Form fields
  const [customerId, setCustomerId]       = useState("")
  const [locationId, setLocationId]       = useState("")
  const [status, setStatus]               = useState("DRAFT")
  const [paymentStatus, setPaymentStatus] = useState("PENDING")
  const [paymentMethod, setPaymentMethod] = useState("NOT_SPECIFIED")
  const [orderDate, setOrderDate]         = useState("")
  const [deliveryDate, setDeliveryDate]   = useState("")
  const [notes, setNotes]                 = useState("")
  const [discount, setDiscount]           = useState(0)
  const [shippingCost, setShippingCost]   = useState(0)
  const [lines, setLines]                 = useState<LineItem[]>([])

  // Reference data
  const [customers, setCustomers]   = useState<any[]>([])
  const [locations, setLocations]   = useState<any[]>([])
  const [items, setItems]           = useState<any[]>([])

  // ── Load everything in parallel ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const [existingOrder, locs, itms, custs] = await Promise.all([
          getSalesOrderById(orderId),
          getOrgLocations(),
          getSalesOrderItems(),
          getOrgCustomer(),
        ])

        if (!existingOrder) {
          toast.error("Order not found")
          router.push("/dashboard/sales/orders")
          return
        }

        // Cannot edit cancelled orders
        if (existingOrder.status === "CANCELLED") {
          toast.error("Cannot edit a cancelled order")
          router.push("/dashboard/sales/orders")
          return
        }

        setOrder(existingOrder)
        setLocations(locs)
        setItems(itms)
        setCustomers(custs)

        // ── Pre-populate form fields from the existing order ──────────────
        setCustomerId(existingOrder.customerId ?? "")
        setLocationId((existingOrder as any).locationId ?? "")
        setStatus(existingOrder.status)
        setPaymentStatus(existingOrder.paymentStatus)
        setPaymentMethod((existingOrder as any).paymentMethod ?? "NOT_SPECIFIED")
        setOrderDate(
          existingOrder.createdAt
            ? new Date(existingOrder.createdAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        )
        setDeliveryDate(
          (existingOrder as any).deliveryDate
            ? new Date((existingOrder as any).deliveryDate).toISOString().split("T")[0]
            : ""
        )
        setNotes((existingOrder as any).notes ?? "")
        setDiscount((existingOrder as any).discount ?? 0)
        setShippingCost((existingOrder as any).shippingCost ?? 0)

        // ── Pre-populate line items ────────────────────────────────────────
        const preLines: LineItem[] = (existingOrder.lines ?? []).map((l: any) => ({
          itemId:        l.itemId,
          quantity:      l.quantity,
          unitPrice:     l.unitPrice,
          taxRate:       l.taxRate   ?? 0,
          taxAmount:     l.taxAmount ?? 0,
          total:         l.total,
          serialNumbers: l.serialNumbers ?? [],
          itemName:      l.item?.name ?? l.itemId,
        }))
        setLines(preLines)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load order")
        router.push("/dashboard/sales/orders")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [orderId, router])

  // ── Computed totals ──────────────────────────────────────────────────────
  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0)
  const total     = subtotal + taxAmount + shippingCost - discount

  // ── Line helpers ─────────────────────────────────────────────────────────
  const addLine = () =>
    setLines((p) => [
      ...p,
      { itemId: "", quantity: 1, unitPrice: 0, taxRate: 0, taxAmount: 0, total: 0, serialNumbers: [], itemName: "" },
    ])

  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx))

  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    setLines((prev) => {
      const updated = [...prev]
      const line    = { ...updated[idx], [field]: value }

      if (field === "itemId") {
        const found = items.find((i) => i.id === value)
        if (found) {
          line.unitPrice = found.sellingPrice ?? 0
          line.taxRate   = found.tax ?? 0
          line.itemName  = found.name
        }
      }

      // Recompute line totals whenever qty, price, or tax changes
      const lineSubtotal = line.quantity * line.unitPrice
      line.taxAmount     = lineSubtotal * (line.taxRate / 100)
      line.total         = lineSubtotal + line.taxAmount

      updated[idx] = line
      return updated
    })
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!customerId) { toast.error("Please select a customer"); return }
    if (lines.length === 0) { toast.error("Add at least one item"); return }
    if (lines.some((l) => !l.itemId)) { toast.error("All line items must have an item selected"); return }

    setIsSaving(true)
    try {
      const result = await updateSalesOrder(orderId, {
        customerId,
        locationId: locationId || null,
        status,
        paymentStatus,
        paymentMethod,
        subtotal,
        taxAmount,
        shippingCost,
        discount,
        notes,
        lines: {
          deleteMany: {},
          create: lines.map((l) => ({
            itemId:        l.itemId,
            quantity:      l.quantity,
            unitPrice:     l.unitPrice,
            taxRate:       l.taxRate,
            taxAmount:     l.taxAmount,
            total:         l.total,
            serialNumbers: l.serialNumbers,
          })),
        },
      })

      if (result.success) {
        toast.success("Order updated successfully")
        router.push(`/dashboard/sales/orders/${orderId}/details`)
      } else {
        toast.error(result.error || "Failed to update order")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
        <p className="ml-4 text-muted-foreground">Loading order...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/sales/orders")} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Orders
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Credit Sales</h1>
            <p className="text-sm text-muted-foreground">{order?.orderNumber}</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">
            {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Order Information */}
        <Card>
          <CardHeader><CardTitle>Order Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Order Number (read-only) */}
            <div>
              <Label>Order Number</Label>
              <Input value={order?.orderNumber ?? ""} disabled className="mt-1 bg-muted" />
            </div>

            {/* Customer */}
            <div>
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location - FIXED: Use "_all" instead of empty string */}
            <div>
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Locations</SelectItem>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_SPECIFIED">Not Specified</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MOMO">Mobile Money</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT">Credit / On Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Date */}
            <div>
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="mt-1" />
            </div>

            {/* Delivery Date */}
            <div>
              <Label>Expected Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1" />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes (full width) */}
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." className="mt-1 h-20 resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No items. Click "Add Item" to begin.</p>
            )}
            {lines.map((line, idx) => {
              // Handle empty itemId for new lines
              const displayValue = line.itemId || "_empty"
              
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  {/* Item select */}
                  <div className="col-span-5">
                    <Label className="text-xs">Item</Label>
                    <Select 
                      value={displayValue} 
                      onValueChange={(v) => {
                        if (v === "_empty") {
                          updateLine(idx, "itemId", "")
                        } else {
                          updateLine(idx, "itemId", v)
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder="Select item">
                          {line.itemName || "Select item"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_empty">Select an item...</SelectItem>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name} — GHS {(i.sellingPrice ?? 0).toFixed(2)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-1 h-9" />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" min={0} step="0.01" value={line.unitPrice}
                      onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9" />
                  </div>

                  {/* Line total (read-only) */}
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input value={`GHS ${line.total.toFixed(2)}`} disabled className="mt-1 h-9 bg-muted text-right" />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} className="h-9 w-9 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* Order totals */}
            {lines.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 max-w-xs ml-auto">
                  <div>
                    <Label className="text-xs">Discount (GHS)</Label>
                    <Input type="number" min={0} step="0.01" value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Shipping (GHS)</Label>
                    <Input type="number" min={0} step="0.01" value={shippingCost}
                      onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                  </div>
                </div>
                <div className="text-right space-y-1 text-sm">
                  <div className="flex justify-end gap-8 text-muted-foreground">
                    <span>Subtotal</span><span>GHS {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-8 text-muted-foreground">
                    <span>Tax</span><span>GHS {taxAmount.toFixed(2)}</span>
                  </div>
                  {shippingCost > 0 && (
                    <div className="flex justify-end gap-8 text-muted-foreground">
                      <span>Shipping</span><span>GHS {shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-end gap-8 text-green-600">
                      <span>Discount</span><span>-GHS {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-8 font-bold text-base border-t pt-2">
                    <span>Total</span><span>GHS {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push("/dashboard/sales/orders")}>Discard</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">
            {isSaving ? <><Spinner className="w-4 h-4 mr-2" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  )
}