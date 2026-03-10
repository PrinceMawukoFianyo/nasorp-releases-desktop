// app/(dashboard)/dashboard/sales/orders/[id]/details/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Package,
  CreditCard, Send, FileText, Edit, RotateCcw, CheckCircle,
  AlertCircle, Ban,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { getSalesOrderById, sendSalesOrderEmail, cancelSalesOrder } from "@/actions/sales-orders"
import { formatCurrency, formatDate, getPaymentStatusColor, getStatusColor } from "../../so-utils"
import { quickReturnFromOrder } from "@/actions/retuns"

// ─── Return Dialog ────────────────────────────────────────────────────────────
interface ReturnLine {
  itemId: string
  itemName: string
  itemSku: string
  maxQty: number
  selectedQty: number
  unitPrice: number
  selected: boolean
  condition: "GOOD" | "DAMAGED" | "DEFECTIVE"
  restockable: boolean
}

function ReturnDialog({
  open, onOpenChange, salesOrder, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  salesOrder: any
  onSuccess: () => void
}) {
  const [lines, setLines]               = useState<ReturnLine[]>([])
  const [reason, setReason]             = useState("")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (salesOrder?.lines) {
      setLines(
        salesOrder.lines.map((l: any) => ({
          itemId:      l.itemId,
          itemName:    l.item?.name ?? "Unknown",
          itemSku:     l.item?.sku  ?? "",
          maxQty:      l.quantity,
          selectedQty: l.quantity,
          unitPrice:   l.unitPrice,
          selected:    false,
          condition:   "GOOD" as const,
          restockable: true,
        }))
      )
      setReason("")
      setRefundMethod("CASH")
    }
  }, [salesOrder])

  const selectedLines = lines.filter((l) => l.selected)
  const refundTotal   = selectedLines.reduce((s, l) => s + l.selectedQty * l.unitPrice, 0)
  const hasSelection  = selectedLines.length > 0

  const toggleLine = (idx: number) =>
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l))

  const updateLine = (idx: number, field: keyof ReturnLine, value: any) =>
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))

  const handleSubmit = async () => {
    if (!hasSelection) { toast.error("Select at least one item to return"); return }
    setIsProcessing(true)
    try {
      const result = await quickReturnFromOrder({
        salesOrderId: salesOrder.id,
        locationId:   salesOrder.locationId ?? salesOrder.location?.id ?? "",
        customerId:   salesOrder.customerId ?? undefined,
        reason,
        refundMethod,
        lines: selectedLines.map((l) => ({
          itemId:      l.itemId,
          quantity:    l.selectedQty,
          unitPrice:   l.unitPrice,
          condition:   l.condition,
          restockable: l.restockable,
        })),
      })
      if (result.success) {
        toast.success(`Return processed — GHS ${refundTotal.toFixed(2)} refunded. Stock has been restocked.`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Failed to process return")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            Process Return
          </DialogTitle>
          <DialogDescription>
            Select items to return. Stock will be restocked and the refund deducted from the order total immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Select items to return:</p>
          {lines.map((line, idx) => (
            <div
              key={line.itemId}
              className={`border rounded-lg p-3 transition-colors ${line.selected ? "border-orange-400 bg-orange-50" : "border-border"}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={line.selected} onCheckedChange={() => toggleLine(idx)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{line.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {line.itemSku} · GHS {line.unitPrice.toFixed(2)} each · Sold: {line.maxQty}
                  </p>
                  {line.selected && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Qty (max {line.maxQty})</Label>
                        <Input
                          type="number" min={1} max={line.maxQty}
                          value={line.selectedQty}
                          onChange={(e) => updateLine(idx, "selectedQty", Math.min(line.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="h-8 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <Select value={line.condition} onValueChange={(v) => updateLine(idx, "condition", v)}>
                          <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GOOD">Good</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-1 gap-2">
                        <Checkbox checked={line.restockable} onCheckedChange={(v) => updateLine(idx, "restockable", !!v)} />
                        <Label className="text-xs">Restock</Label>
                      </div>
                    </div>
                  )}
                </div>
                {line.selected && (
                  <div className="text-right text-sm font-semibold text-orange-600 whitespace-nowrap">
                    GHS {(line.selectedQty * line.unitPrice).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <Label>Reason for return</Label>
            <Textarea
              placeholder="Customer complaint, wrong item, defective..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 h-20 resize-none"
            />
          </div>
          <div>
            <Label>Refund method</Label>
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="MOMO">Mobile Money (MoMo)</SelectItem>
                <SelectItem value="CREDIT_CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasSelection && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-orange-800">Total refund amount:</span>
            <span className="text-lg font-bold text-orange-600">GHS {refundTotal.toFixed(2)}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasSelection || isProcessing}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isProcessing
              ? <><Spinner className="w-4 h-4 mr-2" />Processing...</>
              : <><RotateCcw className="w-4 h-4 mr-2" />Process Return & Refund</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesOrderDetailsPage() {
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.id as string

  const [isLoading, setIsLoading]           = useState(true)
  const [salesOrder, setSalesOrder]         = useState<any>(null)
  const [showEmailDialog, setShowEmailDialog]   = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [emailAddress, setEmailAddress]     = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isCancelling, setIsCancelling]     = useState(false)

  useEffect(() => { loadSalesOrder() }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      if (!order) {
        toast.error("Sales order not found")
        router.push("/dashboard/sales/orders")
        return
      }
      setSalesOrder(order)
      if (order.customer?.email) setEmailAddress(order.customer.email)
    } catch {
      toast.error("Failed to load sales order")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoading(false)
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
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch {
      toast.error("An error occurred while sending email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCancel = async () => {
    if (!salesOrder) return
    if (!confirm(`Are you sure you want to cancel order ${salesOrder.orderNumber}? This cannot be undone.`)) return
    setIsCancelling(true)
    try {
      const result = await cancelSalesOrder(orderId)
      if (result.success) {
        toast.success("Order cancelled successfully")
        await loadSalesOrder()
      } else {
        toast.error(result.error || "Failed to cancel order")
      }
    } catch {
      toast.error("An error occurred while cancelling")
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Spinner className="size-8" />
        <p className="ml-4 text-muted-foreground">Loading order details...</p>
      </div>
    )
  }

  if (!salesOrder) return null

  const subtotal     = salesOrder.subtotal     || 0
  const taxAmount    = salesOrder.taxAmount    || 0
  const shippingCost = salesOrder.shippingCost || 0
  const discount     = salesOrder.discount     || 0
  const total        = subtotal + taxAmount + shippingCost - discount
  const amountPaid   = salesOrder.amountPaid   ?? 0
  const amountOwing  = salesOrder.amountOwing  ?? Math.max(0, total - amountPaid)
  const customerInfo = salesOrder.customer
  const hasReturns   = (salesOrder.returns ?? []).length > 0

  // Status-aware button visibility
  const canReturn = !["CANCELLED", "RETURNED", "DRAFT"].includes(salesOrder.status)
  const canEdit   = !["CANCELLED", "RETURNED", "COMPLETED"].includes(salesOrder.status)
  const canCancel = !["CANCELLED", "RETURNED"].includes(salesOrder.status)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/sales/orders")} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sales Orders
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{salesOrder.orderNumber}</h1>
              <p className="text-muted-foreground">
                {customerInfo?.name || "Unknown Customer"} · {formatDate(salesOrder.orderDate || salesOrder.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge className={getStatusColor(salesOrder.status)}>{salesOrder.status}</Badge>
              <Badge className={getPaymentStatusColor(salesOrder.paymentStatus)}>{salesOrder.paymentStatus}</Badge>

              {/* RETURN — CONFIRMED, PROCESSING, SHIPPED, DELIVERED, COMPLETED only */}
              {canReturn && (
                <Button onClick={() => setShowReturnDialog(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />Return
                </Button>
              )}

              {/* EDIT — hide for CANCELLED, RETURNED, COMPLETED */}
              {canEdit && (
                <Button variant="outline" onClick={() => router.push(`/dashboard/sales/orders/${orderId}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />Edit
                </Button>
              )}

              <Button variant="outline" onClick={() => setShowEmailDialog(true)} disabled={isSendingEmail}>
                <Send className="w-4 h-4 mr-2" />Send Invoice
              </Button>

              <Button variant="outline" onClick={() => router.push(`/dashboard/sales/orders/${orderId}/invoice`)}>
                <FileText className="w-4 h-4 mr-2" />View Invoice
              </Button>

              {/* CANCEL — hide for CANCELLED and RETURNED */}
              {canCancel && (
                <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                  {isCancelling
                    ? <><Spinner className="w-4 h-4 mr-2" />Cancelling...</>
                    : <><Ban className="w-4 h-4 mr-2" />Cancel Order</>
                  }
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Returns history banner */}
        {hasReturns && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-800">
                This order has {salesOrder.returns.length} return(s)
              </p>
              <div className="text-sm text-orange-700 mt-1 space-y-1">
                {salesOrder.returns.map((r: any) => (
                  <p key={r.id}>
                    {r.rmaNumber} — GHS {r.refundAmount?.toFixed(2)} — {r.status}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{customerInfo?.name || "Unknown"}</p>
              {customerInfo?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />{customerInfo.email}
                </div>
              )}
              {customerInfo?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />{customerInfo.phone}
                </div>
              )}
              {customerInfo?.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />{customerInfo.address}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />Date
                </span>
                <span>{formatDate(salesOrder.orderDate || salesOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />Location
                </span>
                <span>{salesOrder.location?.name || "All Locations"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />Payment
                </span>
                <span>{salesOrder.paymentMethod?.replace(/_/g, " ") || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {amountPaid > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />Paid
                  </span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
              )}
              {amountOwing > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Still Owing</span>
                  <span>{formatCurrency(amountOwing)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Items Ordered</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium text-center">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salesOrder.lines?.map((line: any) => (
                    <tr key={line.id}>
                      <td className="py-2">
                        <p className="font-medium">{line.item?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.sku}</p>
                      </td>
                      <td className="py-2 text-center">{line.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment history */}
        {salesOrder.payments && salesOrder.payments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesOrder.payments.map((p: any) => {
                  const isRefund = p.amount < 0
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2 rounded text-sm ${isRefund ? "bg-orange-50" : "bg-green-50"}`}
                    >
                      <div>
                        <span className={`font-medium ${isRefund ? "text-orange-700" : "text-green-700"}`}>
                          {isRefund ? "Refund" : "Payment"} — {p.method?.replace(/_/g, " ")}
                        </span>
                        {p.reference && <p className="text-xs text-muted-foreground">{p.reference}</p>}
                      </div>
                      <span className={`font-semibold ${isRefund ? "text-orange-600" : "text-green-600"}`}>
                        {isRefund ? "-" : "+"}GHS {Math.abs(p.amount).toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Order Invoice</DialogTitle>
            <DialogDescription>Send this invoice confirmation via email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email" type="email" placeholder="customer@example.com"
                value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <Spinner className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      {salesOrder && (
        <ReturnDialog
          open={showReturnDialog}
          onOpenChange={setShowReturnDialog}
          salesOrder={salesOrder}
          onSuccess={loadSalesOrder}
        />
      )}
    </div>
  )
}