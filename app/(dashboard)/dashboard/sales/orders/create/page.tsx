"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Plus, Trash2, ArrowLeft, UserPlus, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { createSalesOrder } from "@/actions/sales-orders"
import { getLocations } from "@/actions/purchase-order"
import { getSalesOrderItems } from "@/actions/sales-orders"
import { getBriefCustomers } from "@/actions/customers"
import { QuickCustomerDialog } from "../components/quick-customer-dialog"


const salesOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  locationId: z.string().min(1, "Location is required"), // "ALL_LOCATIONS" = show all items
  orderDate: z.date(),
  deliveryDate: z.date().optional().nullable(),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().optional(), // Add this line
  shippingCost: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

interface LineItem {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  taxRate: number
}

// Custom Calendar Component to avoid nesting issues
function SimpleCalendar({ 
  selected, 
  onSelect,
  className 
}: {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  className?: string
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return isSameDay(date, today)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = selected && isSameDay(date, selected)
      const isCurrentDay = isToday(date)

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => onSelect(date)}
          className={cn(
            "w-8 h-8 rounded-md text-sm transition-colors",
            isSelected
              ? "bg-primary text-primary-foreground"
              : isCurrentDay
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {day}
        </button>
      )
    }

    return days
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          ‹
        </Button>
        <span className="text-sm font-medium">
          {currentMonth.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          ›
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="w-8 h-4">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>
    </div>
  )
}

export default function CreateSalesOrderPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showQuickCustomer, setShowQuickCustomer] = useState(false)
  
  const [customers, setCustomers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])


const form = useForm({
  resolver: zodResolver(salesOrderSchema),
  defaultValues: {
    orderNumber: `SO-${Date.now()}`,
    customerId: "",
    locationId: "",
    orderDate: new Date(),
    deliveryDate: null as Date | null,
    status: "DRAFT",
    paymentStatus: "PENDING",
    paymentMethod: "", 
    shippingCost: 0,
    discount: 0,
    notes: "",
  },
})

  // Items filtered by the selected order location — must be AFTER useForm.
  // If locationId is blank or "ALL_LOCATIONS" we show every item.
  const selectedLocationId = form.watch("locationId")
  const visibleItems = (() => {
    if (!selectedLocationId || selectedLocationId === "ALL_LOCATIONS") return items
    return items.filter((item) => {
      if (!item.inventories || item.inventories.length === 0) return true
      return item.inventories.some(
        (inv: any) => inv.locationId === selectedLocationId && inv.quantity > 0
      )
    })
  })()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoadingData(true)
      
      const [customersRes, locationsRes, itemsRes] = await Promise.all([
        getBriefCustomers(),
        getLocations(),
        getSalesOrderItems(),
      ])

      const customersList = Array.isArray(customersRes) 
        ? customersRes 
        : (customersRes as any).customers || []
      
      setCustomers(customersList)
      setLocations(locationsRes)
      setItems(itemsRes)

      form.setValue("orderNumber", `SO-${Date.now().toString().slice(-8)}`)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load form data")
    } finally {
      setIsLoadingData(false)
    }
  }

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

  const validateLineItems = () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one item")
      return false
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = form.getValues()
    
    if (!validateLineItems()) {
      return
    }

    setIsSubmitting(true)
    try {
      const totals = calculateTotals()
      
      const salesOrderData = {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        locationId: data.locationId === "ALL_LOCATIONS" ? undefined : data.locationId,
        status:     data.status,
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || null,
        paymentStatus: data.paymentStatus,
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

      const result = await createSalesOrder(salesOrderData)
      
      if (result.success) {
        toast.success("Sales order created successfully")
        router.push("/dashboard/sales/orders")
      } else {
        toast.error(result.error || "Failed to create sales order")
      }
    } catch (error) {
      console.error("Error creating sales order:", error)
      toast.error("An error occurred while creating the sales order")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-3xl font-bold">Create Sales Order</h1>
              <p className="text-muted-foreground mt-1">
                Create a new sales order for your customer
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  value={form.watch("orderNumber")}
                  onChange={(e) => form.setValue("orderNumber", e.target.value)}
                  placeholder="SO-001"
                />
                {form.formState.errors.orderNumber && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.orderNumber.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickCustomer(true)}
                    className="h-7 text-xs"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Quick Add
                  </Button>
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="locationId">Location *</Label>
                <Select
                  value={form.watch("locationId")}
                  onValueChange={(value) => {
                    form.setValue("locationId", value)
                    // Clear any line items whose item is no longer visible at the new location
                    if (value && value !== "ALL_LOCATIONS") {
                      setLineItems(prev => prev.map(li => ({
                        ...li,
                        // reset item selection if the chosen item has no stock at the new location
                        ...(li.itemId && !items.find(i => i.id === li.itemId)?.inventories?.some(
                          (inv: any) => inv.locationId === value && inv.quantity > 0
                        ) && items.find(i => i.id === li.itemId)?.inventories?.length > 0
                          ? { itemId: "", itemName: "", unitPrice: 0 }
                          : {}),
                      })))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* All Locations — shows every item regardless of location */}
                    <SelectItem value="ALL_LOCATIONS">
                      🌐 All Locations (show all items)
                    </SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Hints */}
                {form.watch("locationId") === "ALL_LOCATIONS" && (
                  <p className="text-xs text-blue-600">
                    📦 All items shown. Stock will be deducted automatically from the location with the most availability.
                  </p>
                )}
                {form.watch("locationId") && form.watch("locationId") !== "ALL_LOCATIONS" && (
                  <p className="text-xs text-muted-foreground">
                    Items are filtered to those available at this location.
                  </p>
                )}
                {form.formState.errors.locationId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.locationId.message as string}
                  </p>
                )}
              </div>
              {/* Add Payment Method Field Here */}

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
                    </SelectContent>
                </Select>
                </div>

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
                  <PopoverContent className="w-auto p-0" align="start">
                    <SimpleCalendar
                      selected={form.watch("orderDate")}
                      onSelect={(date) => form.setValue("orderDate", date || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <SimpleCalendar
                      selected={form.watch("deliveryDate") || undefined}
                      onSelect={(date) => form.setValue("deliveryDate", date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

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
                  </SelectContent>
                </Select>
              </div>

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
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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
                  <p>No items added yet.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLineItem}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-slate-50"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <Label className="text-xs">Item *</Label>
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
                            {visibleItems.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                No items available at this location
                              </div>
                            ) : (
                              visibleItems.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name} - {i.sku}
                                  {/* Show stock at selected location if we have data */}
                                  {selectedLocationId && selectedLocationId !== "ALL_LOCATIONS" && i.inventories && (
                                    ` (${i.inventories.find((inv: any) => inv.locationId === selectedLocationId)?.quantity ?? 0} in stock)`
                                  )}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Quantity *</Label>
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

                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Unit Price *</Label>
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

                      <div className="col-span-6 sm:col-span-2">
                        <Label className="text-xs">Tax Rate (%)</Label>
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

                      <div className="col-span-6 sm:col-span-2 flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Total (editable)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={(item.quantity * item.unitPrice * (1 + item.taxRate / 100)).toFixed(2)}
                            onChange={(e) => {
                              // Back-calculate unit price from entered total
                              const enteredTotal = parseFloat(e.target.value) || 0
                              const taxMult = 1 + (item.taxRate || 0) / 100
                              const qty = item.quantity || 1
                              const newUnitPrice = enteredTotal / (qty * taxMult)
                              updateLineItem(item.id, "unitPrice", Math.round(newUnitPrice * 10000) / 10000)
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          className="flex-shrink-0 mb-0"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.watch("shippingCost")}
                    onChange={(e) => form.setValue("shippingCost", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.watch("discount")}
                    onChange={(e) => form.setValue("discount", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.watch("notes")}
                    onChange={(e) => form.setValue("notes", e.target.value)}
                    rows={4}
                    placeholder="Add any notes or special instructions..."
                  />
                </div>
              </CardContent>
            </Card>

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

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/sales/orders")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Sales Order"
              )}
            </Button>
          </div>
        </div>

        {/* Quick Customer Dialog */}
        <QuickCustomerDialog
          open={showQuickCustomer}
          onOpenChange={setShowQuickCustomer}
          onCustomerCreated={(customer) => {
            // Add the new customer to the list and select it
            setCustomers([...customers, customer])
            form.setValue("customerId", customer.id)
            toast.success("Customer added successfully")
          }}
        />
      </div>
    </div>
  )
}