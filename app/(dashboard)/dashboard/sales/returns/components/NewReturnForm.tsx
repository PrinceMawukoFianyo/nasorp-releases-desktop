"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react"
import { createSalesReturn } from "@/actions/retuns"


// ─── Types ────────────────────────────────────────────────────────────────────

interface SOLine {
  id: string
  quantity: number
  unitPrice: number
  item: { id: string; name: string; sku: string; thumbnail?: string | null; sellingPrice: number }
}

interface SalesOrder {
  id: string
  orderNumber: string
  createdAt: string
  customer: { id: string; name: string } | null
  lines: SOLine[]
}

interface Location { id: string; name: string; type: string }
interface Customer { id: string; name: string; email?: string | null; phone?: string | null }

interface Props {
  salesOrders: SalesOrder[]
  locations: Location[]
  customers: Customer[]
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  itemId: z.string().min(1, "Item required"),
  itemName: z.string(),
  quantity: z.number().int().positive("Must be ≥ 1"),
  unitPrice: z.number().min(0),
  condition: z.enum(["GOOD", "DAMAGED", "DEFECTIVE"]),
  restockable: z.boolean(),
  notes: z.string().optional(),
})

const formSchema = z.object({
  salesOrderId: z.string().optional(),
  customerId: z.string().optional(),
  locationId: z.string().min(1, "Location required"),
  reason: z.string().optional(),
  refundMethod: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one item"),
})

type FormValues = z.infer<typeof formSchema>

const CONDITIONS = ["GOOD", "DAMAGED", "DEFECTIVE"] as const
const REFUND_METHODS = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "STORE_CREDIT"]

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewReturnForm({ salesOrders, locations, customers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [showOrderItems, setShowOrderItems] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salesOrderId: "",
      customerId: "",
      locationId: "",
      reason: "",
      refundMethod: "",
      notes: "",
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" })

  // When a SO is selected, pre-populate customer and items
  function handleOrderSelect(orderId: string) {
    form.setValue("salesOrderId", orderId)
    const order = salesOrders.find((o) => o.id === orderId)
    setSelectedOrder(order || null)
    if (order?.customer) {
      form.setValue("customerId", order.customer.id)
    }
    setShowOrderItems(true)
  }

  function addFromOrderLine(line: SOLine) {
    const existing = fields.findIndex((f) => f.itemId === line.item.id)
    if (existing >= 0) {
      toast.info("Item already added")
      return
    }
    append({
      itemId: line.item.id,
      itemName: line.item.name,
      quantity: 1,
      unitPrice: line.unitPrice,
      condition: "GOOD",
      restockable: true,
      notes: "",
    })
  }

  function addManualLine() {
    append({
      itemId: "",
      itemName: "",
      quantity: 1,
      unitPrice: 0,
      condition: "GOOD",
      restockable: true,
      notes: "",
    })
  }

  const lines = form.watch("lines")
  const totalRefund = lines.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0)

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await createSalesReturn({
        ...values,
        salesOrderId: values.salesOrderId || undefined,
        customerId: values.customerId || undefined,
        refundMethod: values.refundMethod || undefined,
        lines: values.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          condition: l.condition,
          restockable: l.restockable,
          notes: l.notes,
        })),
      })

      if (res.success) {
        toast.success(`Return ${(res.data as any).rmaNumber} created successfully`)
        router.push(`/dashboard/sales/returns/${(res.data as any).id}`)
      } else {
        toast.error(res.error || "Failed to create return")
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Return Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sales Order */}
            <FormField
              control={form.control}
              name="salesOrderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Sales Order (optional)</FormLabel>
                  <Select onValueChange={handleOrderSelect} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sales order…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesOrders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.orderNumber}{o.customer ? ` — ${o.customer.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` (${c.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return to Location *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Where should stock be returned?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} <span className="text-muted-foreground">({l.type})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Refund Method */}
            <FormField
              control={form.control}
              name="refundMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Method (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How will customer be refunded?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REFUND_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Defective product, wrong item…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Items from Order */}
        {selectedOrder && showOrderItems && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-800">
                  Items from {selectedOrder.orderNumber} — click to add
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOrderItems((v) => !v)}
                >
                  {showOrderItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.lines.map((line) => {
                  const alreadyAdded = fields.some((f) => f.itemId === line.item.id)
                  return (
                    <button
                      key={line.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addFromOrderLine(line)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                        alreadyAdded
                          ? "opacity-40 cursor-not-allowed bg-white border-gray-200"
                          : "bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                      }`}
                    >
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{line.item.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        ×{line.quantity}
                      </Badge>
                      {alreadyAdded && (
                        <Badge className="text-xs bg-green-100 text-green-700">Added</Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Return Lines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Return Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addManualLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No items added yet.</p>
                <p className="text-xs">Select an order above or click "Add Item".</p>
              </div>
            )}

            {fields.map((field, idx) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => remove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Item Name (display only if from order, editable if manual) */}
                  <div className="col-span-2 sm:col-span-1">
                    <FormField
                      control={form.control}
                      name={`lines.${idx}.itemName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Item Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Item name"
                              {...field}
                              readOnly={!!form.getValues(`lines.${idx}.itemId`)}
                              className={form.getValues(`lines.${idx}.itemId`) ? "bg-muted" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit Price */}
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Unit Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Condition */}
                  <FormField
                    control={form.control}
                    name={`lines.${idx}.condition`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Condition</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONDITIONS.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <div className="col-span-2 sm:col-span-1">
                    <FormField
                      control={form.control}
                      name={`lines.${idx}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Notes</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional note…" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Restockable */}
                <FormField
                  control={form.control}
                  name={`lines.${idx}.restockable`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs font-normal cursor-pointer">
                        Restockable — add this item back to inventory when received
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Line total */}
                <div className="text-right text-sm font-medium text-rose-600">
                  Line total: GHS {((form.watch(`lines.${idx}.quantity`) || 0) * (form.watch(`lines.${idx}.unitPrice`) || 0)).toFixed(2)}
                </div>
              </div>
            ))}

            {fields.length > 0 && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Refund Value</p>
                    <p className="text-xl font-bold text-rose-600">GHS {totalRefund.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/sales/returns")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || fields.length === 0}>
            {isPending ? "Creating…" : "Create Return"}
          </Button>
        </div>
      </form>
    </Form>
  )
}