// app/(dashboard)/dashboard/sales/orders/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import Link from "next/link"
import { toast } from "sonner"

// Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

// Icons
import { Calendar as CalendarIcon, Plus, Trash2, ArrowLeft, AlertCircle, Send } from "lucide-react"

// Utils & Actions
import { cn } from "@/lib/utils"
import { getSalesOrderById, updateSalesOrder, sendSalesOrderEmail } from "@/actions/sales-orders"
import { getCustomers } from "@/actions/customers"
import { getItems, getLocations } from "@/actions/purchase-order"

// Types
interface LineItem {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  taxRate: number
}

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

interface Location {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  sku: string
  sellingPrice?: number
}

// Validation Schema - UPDATED with paymentMethod
const salesOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  locationId: z.string().min(1, "Location is required"),
  orderDate: z.date(),
  deliveryDate: z.date().optional().nullable(),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().optional(), // ADDED
  shippingCost: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export default function EditSalesOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  // State Management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isCancelled, setIsCancelled] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Form Configuration - UPDATED with paymentMethod
  const form = useForm({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      orderNumber: "",
      customerId: "",
      locationId: "",
      orderDate: new Date(),
      deliveryDate: undefined as Date | undefined | null,
      status: "DRAFT",
      paymentStatus: "PENDING",
      paymentMethod: "", // ADDED
      shippingCost: 0,
      discount: 0,
      notes: "",
    },
  })

  // Data Loading
  useEffect(() => {
    loadData()
  }, [orderId])

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
        toast.error("Sales order not found")
        router.push("/dashboard/sales/orders")
        return
      }

      // Handle cancelled orders
      if (salesOrder.status === "CANCELLED") {
        setIsCancelled(true)
      }

      // Parse dates
      const orderDate = (salesOrder as any).orderDate 
        ? new Date((salesOrder as any).orderDate) 
        : salesOrder.createdAt 
        ? new Date(salesOrder.createdAt)
        : new Date()
      
      let deliveryDate: Date | undefined | null = undefined
      if ((salesOrder as any).deliveryDate) {
        deliveryDate = new Date((salesOrder as any).deliveryDate)
      }

      // Set form values - UPDATED with paymentMethod
      form.reset({
        orderNumber: (salesOrder as any).orderNumber || salesOrder.id,
        customerId: (salesOrder as any).customerId || "",
        locationId: salesOrder.location?.id || "",
        orderDate: orderDate,
        deliveryDate: deliveryDate,
        status: salesOrder.status,
        paymentStatus: (salesOrder as any).paymentStatus || "PENDING",
        paymentMethod: (salesOrder as any).paymentMethod || "", // ADDED
        shippingCost: salesOrder.shippingCost || 0,
        discount: salesOrder.discount || 0,
        notes: (salesOrder as any).notes || "",
      })

      // Set line items
      const formattedLines = salesOrder.lines?.map((line: any) => ({
        id: line.id,
        itemId: line.itemId,
        itemName: line.item?.name || "",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || 0,
      })) || []
      setLineItems(formattedLines)

      // Handle API responses
      const customersList = Array.isArray(customersRes) 
        ? customersRes 
        : (customersRes as any).customers || []
      
      setCustomers(customersList)
      setLocations(locationsRes)
      setItems(itemsRes)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load sales order")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoadingData(false)
    }
  }

  // Line Item Management
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `temp-${Date.now()}`,
      itemId: "",
      itemName: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
    }
    setLineItems([...lineItems, newItem])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Order must have at least one item")
      return
    }
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map((item) => {
      if (item.id === id) {
        if (field === "itemId") {
          const selectedItem = items.find(i => i.id === value)
          if (selectedItem) {
            return {
              ...item,
              itemId: value,
              itemName: selectedItem.name,
              unitPrice: selectedItem.sellingPrice || 0,
            }
          }
        }
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  // Calculations
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice)
    }, 0)

    const taxAmount = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice
      return sum + (itemSubtotal * item.taxRate / 100)
    }, 0)

    const shippingCost = form.watch("shippingCost") || 0
    const discount = form.watch("discount") || 0
    const total = subtotal + taxAmount + shippingCost - discount

    return { subtotal, taxAmount, total }
  }

  // Validation
  const validateLineItems = () => {
    for (const item of lineItems) {
      if (!item.itemId) {
        toast.error("Please select an item for all line items")
        return false
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than 0")
        return false
      }
      if (item.unitPrice < 0) {
        toast.error("Unit price cannot be negative")
        return false
      }
    }
    return true
  }

  // Email Handling
  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("Please enter an email address")
      return
    }

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
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("An error occurred while sending email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Form Submission - UPDATED with paymentMethod
  const onSubmit = async (data: any) => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    if (!validateLineItems()) {
      return
    }

    setIsSubmitting(true)
    try {
      const totals = calculateTotals()
      
      const salesOrderData = {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        locationId: data.locationId,
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || null,
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod || null, // ADDED
        shippingCost: data.shippingCost,
        discount: data.discount,
        notes: data.notes,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        lines: {
          create: lineItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: (item.quantity * item.unitPrice * item.taxRate) / 100,
            total: item.quantity * item.unitPrice * (1 + item.taxRate / 100),
            serialNumbers: [],
          })),
        },
      }

      const result = await updateSalesOrder(orderId, salesOrderData)
      
      if (result.success) {
        toast.success("Sales order updated successfully")
        router.push("/dashboard/sales/orders")
      } else {
        toast.error(result.error || "Failed to update sales order")
      }
    } catch (error) {
      console.error("Error updating sales order:", error)
      toast.error("An error occurred while updating the sales order")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading State
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  // Cancelled Order State
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This order has been cancelled and cannot be edited. 
              <Link href="/dashboard/sales/orders" className="underline ml-2">
                Return to orders list
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <Link
            href="/dashboard/sales/orders"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sales Orders
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Sales Order</h1>
              <p className="text-muted-foreground mt-1">
                Update order details and items
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(true)}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </div>
        </div>

        {/* Email Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-[500px]">
            < DialogHeader>
              <DialogTitle>Send Order Email</DialogTitle>
              <DialogDescription>
                Send this sales order confirmation via email
              </DialogDescription>
            </ DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Email will include:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Order details and summary</li>
                  <li>Customer information</li>
                  <li>Line items with quantities and prices</li>
                  <li>Total amount and payment status</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailAddress}>
                {isSendingEmail ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Details Card - UPDATED with paymentMethod */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Number */}
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  {...form.register("orderNumber")}
                  placeholder="SO-001"
                />
                {form.formState.errors.orderNumber && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.orderNumber.message as string}
                  </p>
                )}
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={form.watch("customerId")}
                  onValueChange={(value) => form.setValue("customerId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.customerId.message as string}
                  </p>
                )}
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label htmlFor="locationId">Location *</Label>
                <Select
                  value={form.watch("locationId")}
                  onValueChange={(value) => form.setValue("locationId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.locationId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.locationId.message as string}
                  </p>
                )}
              </div>

              {/* Order Date */}
              <div className="space-y-2">
                <Label>Order Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("orderDate") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("orderDate") ? (
                        format(form.watch("orderDate"), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("orderDate")}
                      onSelect={(date) => form.setValue("orderDate", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("deliveryDate") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("deliveryDate") ? (
                        format(form.watch("deliveryDate") as Date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("deliveryDate") || undefined}
                      onSelect={(date) => form.setValue("deliveryDate", date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={form.watch("paymentStatus")}
                  onValueChange={(value) => form.setValue("paymentStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method - NEW FIELD */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={form.watch("paymentMethod") || "NOT_SPECIFIED"}
                  onValueChange={(value) => form.setValue("paymentMethod", value === "NOT_SPECIFIED" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SPECIFIED">Not Specified</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Items</CardTitle>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added. Click "Add Item" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="col-span-4">
                        <Label>Item *</Label>
                        <Select
                          value={item.itemId}
                          onValueChange={(value) =>
                            updateLineItem(item.id, "itemId", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((itemOption) => (
                              <SelectItem key={itemOption.id} value={itemOption.id}>
                                {itemOption.name} - {itemOption.sku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "taxRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <div className="flex-1">
                          <Label>Total</Label>
                          <p className="text-sm font-semibold">
                            GHS {(item.quantity * item.unitPrice * (1 + item.taxRate / 100)).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Costs & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Additional Costs */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("shippingCost", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("discount", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    rows={4}
                    placeholder="Add any notes or special instructions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  <span className="font-semibold">
                    GHS {(form.watch("shippingCost") || 0).toFixed(2)}
                  </span>
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

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/sales/orders")}
              disabled={isSubmitting || isSendingEmail}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isSendingEmail}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                "Update Sales Order"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}