// app/(dashboard)/dashboard/sales/orders/components/sales-order-details-view.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  Eye, Edit, RotateCcw, Ban, CreditCard, MapPin, Phone,
  Mail, User, CheckCircle, AlertCircle, Send, FileText,
  DollarSign, ArrowUpDown, Printer, MoreVertical,
} from "lucide-react"
import {
  cancelSalesOrder,
  recordPayment,
  updateOrderStatus,
  sendSalesOrderEmail,
} from "@/actions/sales-orders"
import { quickReturnFromOrder } from "@/actions/retuns"
import type { SalesOrder } from "@/types/sales-order"
import { formatCurrency, formatDate, getPaymentStatusColor, getStatusColor } from "../so-utils"


// ─── Constants ────────────────────────────────────────────────────────────────
const RETURNABLE_STATUSES  = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]
const EDITABLE_STATUSES    = ["DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]
const CANCELLABLE_STATUSES = ["DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]
const STATUS_FLOW          = ["DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface SalesOrderWithReturns extends SalesOrder {
  salesReturns?: any[]
  returns?: any[]
}

// ─── Three-dot More Actions Menu ─────────────────────────────────────────────
function MoreActionsMenu({
  onDetails,
  onSendInvoice,
  onInvoice,
  onPrint,
  onEdit,
  onUpdateStatus,
  showEdit,
  showUpdateStatus,
}: {
  onDetails: () => void
  onSendInvoice: () => void
  onInvoice: () => void
  onPrint: () => void
  onEdit: () => void
  onUpdateStatus: () => void
  showEdit: boolean
  showUpdateStatus: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    className = ""
  ) => (
    <button
      key={label}
      onClick={() => { onClick(); setOpen(false) }}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left ${className}`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="outline"
        className="px-2"
        onClick={() => setOpen(v => !v)}
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[190px] bg-background border border-border rounded-lg shadow-lg py-1.5">
          {item(<Eye className="w-4 h-4 text-muted-foreground" />,      "Full Details",    onDetails)}
          {showEdit && item(<Edit className="w-4 h-4 text-muted-foreground" />, "Edit Order", onEdit)}
          {showUpdateStatus && item(<ArrowUpDown className="w-4 h-4 text-muted-foreground" />, "Update Status", onUpdateStatus)}
          <div className="my-1 border-t border-border" />
          {item(<Send className="w-4 h-4 text-muted-foreground" />,     "Send Invoice",    onSendInvoice)}
          {item(<FileText className="w-4 h-4 text-muted-foreground" />, "View Invoice",    onInvoice)}
          {item(<Printer className="w-4 h-4 text-muted-foreground" />,  "Print",           onPrint)}
        </div>
      )}
    </div>
  )
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────
function RecordPaymentDialog({
  open, onOpenChange, salesOrder, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  salesOrder: SalesOrderWithReturns | null
  onSuccess: () => void
}) {
  const [amount, setAmount]             = useState("")
  const [method, setMethod]             = useState<"CASH" | "MOMO" | "CREDIT_CARD">("CASH")
  const [reference, setReference]       = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const order       = salesOrder as any
  const total       = (order?.subtotal || 0) + (order?.taxAmount || 0) + (order?.shippingCost || 0) - (order?.discount || 0)
  const amountPaid  = Number(order?.amountPaid ?? 0)
  // FIX: ?? only catches null/undefined — but amountOwing can be 0 (number) for legacy
  // orders where the column was never set. Use explicit check:
  //   • If paymentStatus=PAID → 0 (nothing owed)
  //   • If amountOwing DB > 0 → use DB value (maintained by recordPayment)
  //   • Otherwise → compute from total - amountPaid (legacy rows)
  const amountOwing = order?.paymentStatus === "PAID"
    ? 0
    : Number(order?.amountOwing ?? 0) > 0
      ? Number(order.amountOwing)
      : Math.max(0, total - amountPaid)

  useEffect(() => {
    if (open) {
      setAmount(amountOwing > 0 ? amountOwing.toFixed(2) : "")
      setMethod("CASH")
      setReference("")
    }
  }, [open, amountOwing])

  const handleSubmit = async () => {
    if (!salesOrder) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return }
    if (amt > amountOwing + 0.001) { toast.error(`Amount exceeds balance of GHS ${amountOwing.toFixed(2)}`); return }

    setIsProcessing(true)
    try {
      const result = await recordPayment({
        orderId:   salesOrder.id,
        amount:    amt,
        method,
        reference: reference.trim() || undefined,
      })
      if (result.success) {
        toast.success(`Payment of GHS ${amt.toFixed(2)} recorded successfully`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Failed to record payment")
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Record Payment — {order?.orderNumber || "N/A"}
          </DialogTitle>
          <DialogDescription>
            Balance owing: <strong>GHS {amountOwing.toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Amount (GHS)</Label>
            <Input
              type="number" min="0.01" step="0.01"
              placeholder={amountOwing.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setAmount((amountOwing / 2).toFixed(2))}>
                Half (GHS {(amountOwing / 2).toFixed(2)})
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => setAmount(amountOwing.toFixed(2))}>
                Full (GHS {amountOwing.toFixed(2)})
              </Button>
            </div>
          </div>

          <div>
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="MOMO">Mobile Money (MoMo)</SelectItem>
                <SelectItem value="CREDIT_CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reference / Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="Transaction ID, cheque number..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
            {isProcessing
              ? <><Spinner className="w-4 h-4 mr-2" />Recording...</>
              : <><CheckCircle className="w-4 h-4 mr-2" />Record Payment</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Return Dialog ────────────────────────────────────────────────────────────
function ReturnDialog({
  open, onOpenChange, salesOrder, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  salesOrder: SalesOrderWithReturns | null
  onSuccess: () => void
}) {
  const [lines, setLines]               = useState<ReturnLine[]>([])
  const [reason, setReason]             = useState("")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const order = salesOrder as any
    if (order?.lines && Array.isArray(order.lines)) {
      setLines(order.lines.map((l: any) => ({
        itemId:      l.itemId,
        itemName:    l.item?.name ?? "Unknown",
        itemSku:     l.item?.sku  ?? "",
        maxQty:      l.quantity || 0,
        selectedQty: l.quantity || 0,
        unitPrice:   l.unitPrice || 0,
        selected:    false,
        condition:   "GOOD" as const,
        restockable: true,
      })))
      setReason("")
      setRefundMethod("CASH")
    }
  }, [salesOrder])

  const selectedLines = lines.filter((l) => l.selected)
  const refundTotal   = selectedLines.reduce((s, l) => s + (l.selectedQty * l.unitPrice), 0)

  const toggle = (idx: number) =>
    setLines((p) => p.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l))

  const update = (idx: number, field: keyof ReturnLine, value: any) =>
    setLines((p) => p.map((l, i) => i === idx ? { ...l, [field]: value } : l))

  const handleSubmit = async () => {
    if (!salesOrder) return
    if (selectedLines.length === 0) { toast.error("Select at least one item"); return }

    setIsProcessing(true)
    try {
      const order  = salesOrder as any
      const result = await quickReturnFromOrder({
        salesOrderId: salesOrder.id,
        locationId:   order.locationId ?? order.location?.id ?? "",
        customerId:   order.customerId ?? undefined,
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
        toast.success(`Return processed — GHS ${refundTotal.toFixed(2)} refunded & stock restocked`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Failed to process return")
      }
    } catch (error) {
      console.error("Return error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            Process Return — {(salesOrder as any)?.orderNumber || "N/A"}
          </DialogTitle>
          <DialogDescription>
            Select items to return. Stock will be restocked and the refund deducted immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div
              key={`${line.itemId}-${idx}`}
              className={`border rounded-lg p-3 transition-colors ${
                line.selected ? "border-orange-400 bg-orange-50" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={line.selected} onCheckedChange={() => toggle(idx)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{line.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {line.itemSku} · GHS {line.unitPrice.toFixed(2)}/unit · Sold qty: {line.maxQty}
                  </p>
                  {line.selected && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Return Qty (max {line.maxQty})</Label>
                        <Input
                          type="number" min={1} max={line.maxQty} value={line.selectedQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val)) update(idx, "selectedQty", Math.min(line.maxQty, Math.max(1, val)))
                          }}
                          className="h-8 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <Select value={line.condition} onValueChange={(v: "GOOD" | "DAMAGED" | "DEFECTIVE") => update(idx, "condition", v)}>
                          <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GOOD">Good</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-1 gap-2">
                        <Checkbox checked={line.restockable} onCheckedChange={(v) => update(idx, "restockable", !!v)} />
                        <Label className="text-xs">Restock</Label>
                      </div>
                    </div>
                  )}
                </div>
                {line.selected && (
                  <span className="text-sm font-semibold text-orange-600 whitespace-nowrap">
                    GHS {(line.selectedQty * line.unitPrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <Label>Reason for return</Label>
            <Textarea
              placeholder="Wrong item, defective, customer complaint..."
              value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 h-16 resize-none"
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

        {selectedLines.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm font-medium text-orange-800">Total refund:</span>
            <span className="text-lg font-bold text-orange-600">GHS {refundTotal.toFixed(2)}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedLines.length === 0 || isProcessing}
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

// ─── Send Email Dialog ────────────────────────────────────────────────────────
function SendEmailDialog({
  open, onOpenChange, salesOrder, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  salesOrder: SalesOrderWithReturns | null
  onSuccess: () => void
}) {
  const [email, setEmail]       = useState("")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const order = salesOrder as any
    if (open && order?.customer?.email) setEmail(order.customer.email)
  }, [open, salesOrder])

  const handleSend = async () => {
    if (!salesOrder || !email) { toast.error("Please enter an email address"); return }
    setIsSending(true)
    try {
      const result = await sendSalesOrderEmail(salesOrder.id, email)
      if (result.success) {
        toast.success("Invoice email sent successfully")
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Email error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Send Invoice — {(salesOrder as any)?.orderNumber || "N/A"}
          </DialogTitle>
          <DialogDescription>Send this invoice to the customer via email.</DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <Label>Email address</Label>
          <Input
            type="email" placeholder="customer@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || !email}>
            {isSending
              ? <><Spinner className="w-4 h-4 mr-2" />Sending...</>
              : <><Send className="w-4 h-4 mr-2" />Send Invoice</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Update Status Dialog ─────────────────────────────────────────────────────
function UpdateStatusDialog({
  open, onOpenChange, salesOrder, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  salesOrder: SalesOrderWithReturns | null
  onSuccess: () => void
}) {
  const currentIdx   = STATUS_FLOW.indexOf(salesOrder?.status ?? "")
  const nextStatuses = STATUS_FLOW.slice(currentIdx + 1)
  const [newStatus, setNewStatus]   = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (open && nextStatuses.length > 0) setNewStatus(nextStatuses[0])
  }, [open, salesOrder])

  const handleUpdate = async () => {
    if (!salesOrder || !newStatus) return
    setIsUpdating(true)
    try {
      const result = await updateOrderStatus(salesOrder.id, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? "Failed to update status")
      }
    } catch (error) {
      console.error("Status update error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-blue-500" />
            Update Status — {(salesOrder as any)?.orderNumber || "N/A"}
          </DialogTitle>
          <DialogDescription>
            Current: <strong>{salesOrder?.status || "N/A"}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Already at final status.</p>
          ) : (
            <>
              <Label>Move to status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Cancel</Button>
          {nextStatuses.length > 0 && (
            <Button onClick={handleUpdate} disabled={isUpdating || !newStatus}>
              {isUpdating
                ? <><Spinner className="w-4 h-4 mr-2" />Updating...</>
                : <><ArrowUpDown className="w-4 h-4 mr-2" />Update Status</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SalesOrderDetailViewProps {
  salesOrder: SalesOrder
  onEdit:    (order: SalesOrder) => void
  onCancel:  (order: SalesOrder) => void
  onPrint?:  () => void
  onExport?: () => void
  onRefresh: () => void
}

export default function SalesOrderDetailView({
  salesOrder, onEdit, onCancel, onPrint, onExport, onRefresh,
}: SalesOrderDetailViewProps) {
  const router = useRouter()
  const [showReturnDialog,  setShowReturnDialog]  = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showEmailDialog,   setShowEmailDialog]   = useState(false)
  const [showStatusDialog,  setShowStatusDialog]  = useState(false)
  const [isCancelling,      setIsCancelling]      = useState(false)

  if (!salesOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 mx-auto" />
      </div>
    )
  }

  const order = salesOrder as any

  const subtotal     = Number(order?.subtotal)     || 0
  const taxAmount    = Number(order?.taxAmount)    || 0
  const shippingCost = Number(order?.shippingCost) || 0
  const discount     = Number(order?.discount)     || 0
  const total        = subtotal + taxAmount + shippingCost - discount
  const amountPaid   = Number(order?.amountPaid)   || 0
  // FIX: same as payment dialog — use explicit check not || 
  // (|| would also catch a legitimate 0 after full payment, but that's intentional here)
  const amountOwing  = order?.paymentStatus === "PAID" || order?.paymentStatus === "COMPLETED"
    ? 0
    : Number(order?.amountOwing ?? 0) > 0
      ? Number(order.amountOwing)
      : Math.max(0, total - amountPaid)

  // ── FIX: Only show outstanding when genuinely unpaid ──────────────────────
  // PAID / CANCELLED / REFUNDED orders must never show the outstanding banner.
  const isSettled      = ["PAID", "CANCELLED", "REFUNDED"].includes(order?.paymentStatus ?? "")
  const showOutstanding = !isSettled && amountOwing > 0.01 && order?.status !== "CANCELLED"

  const returns    = order?.salesReturns || order?.returns || []
  const hasReturns = returns.length > 0

  const canReturn  = RETURNABLE_STATUSES.includes(order?.status || "")
  const canEdit    = EDITABLE_STATUSES.includes(order?.status || "")
  const canCancel  = CANCELLABLE_STATUSES.includes(order?.status || "")
  // Only offer Record Payment when there's actually something to pay
  const canPay     = !isSettled && amountOwing > 0.01 && order?.status !== "CANCELLED" && order?.status !== "RETURNED"
  const canAdvance = STATUS_FLOW.indexOf(order?.status || "") < STATUS_FLOW.length - 1 && canCancel

  const handleCancel = async () => {
    if (!order?.id || !order?.orderNumber) { toast.error("Invalid order data"); return }
    if (!confirm(`Cancel order ${order.orderNumber}? This cannot be undone.`)) return
    setIsCancelling(true)
    try {
      const result = await cancelSalesOrder(order.id)
      if (result.success) {
        toast.success("Order cancelled successfully")
        onRefresh()
      } else {
        toast.error(result.error || "Failed to cancel order")
      }
    } catch (error) {
      console.error("Cancel error:", error)
      toast.error("Failed to cancel order")
    } finally {
      setIsCancelling(false)
    }
  }

  const handleViewDetails = () => order?.id && router.push(`/dashboard/sales/orders/${order.id}/details`)
  const handlePrint       = () => onPrint ? onPrint() : window.print()

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-5">

          {/* ── Order header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{order?.orderNumber || "N/A"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {order?.customer?.name || "Unknown Customer"} · {formatDate(order?.orderDate || order?.createdAt || new Date())}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <Badge className={getStatusColor(order?.status || "DRAFT")}>
                {order?.status || "DRAFT"}
              </Badge>
              <Badge variant="outline" className={getPaymentStatusColor(order?.paymentStatus || "PENDING")}>
                {order?.paymentStatus || "PENDING"}
              </Badge>
            </div>
          </div>

          {/* ── Action buttons ── */}
          {/* PRIMARY: Record Payment · Return · Cancel — always visible when applicable */}
          {/* SECONDARY: Details, Edit, Update Status, Send Invoice, Invoice, Print — in three-dot */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Record Payment — primary, most important */}
            {canPay && (
              <Button
                size="sm"
                onClick={() => setShowPaymentDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Record Payment (GHS {amountOwing.toFixed(2)})
              </Button>
            )}

            {/* Return */}
            {canReturn && (
              <Button
                size="sm"
                onClick={() => setShowReturnDialog(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Return
              </Button>
            )}

            {/* Cancel */}
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling
                  ? <><Spinner className="w-3.5 h-3.5 mr-1.5" />Cancelling...</>
                  : <><Ban className="w-3.5 h-3.5 mr-1.5" />Cancel</>
                }
              </Button>
            )}

            {/* Three-dot: secondary actions tucked away */}
            <div className="ml-auto">
              <MoreActionsMenu
                onDetails={handleViewDetails}
                onSendInvoice={() => setShowEmailDialog(true)}
                onInvoice={handleViewDetails}
                onPrint={handlePrint}
                onEdit={() => onEdit(salesOrder)}
                onUpdateStatus={() => setShowStatusDialog(true)}
                showEdit={canEdit}
                showUpdateStatus={canAdvance}
              />
            </div>
          </div>

          <Separator />

          {/* ── Returns warning banner ── */}
          {hasReturns && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-800 text-sm">
                  {returns.length} return(s) on this order
                </p>
                <div className="text-xs text-orange-700 mt-1 space-y-0.5">
                  {returns.map((r: any) => (
                    <p key={r.id}>
                      {r.rmaNumber} · GHS {Number(r.refundAmount || 0).toFixed(2)} · {r.status}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Outstanding balance banner ── */}
          {/* Hidden when paymentStatus is PAID / CANCELLED / REFUNDED */}
          {showOutstanding && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-800">
                  Outstanding balance: GHS {amountOwing.toFixed(2)}
                </span>
              </div>
              {canPay && (
                <Button
                  size="sm"
                  onClick={() => setShowPaymentDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                >
                  <DollarSign className="w-3 h-3 mr-1" />Collect Now
                </Button>
              )}
            </div>
          )}

          {/* ── Customer & Order Info ── */}
          <div className="grid grid-cols-2 gap-5 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
              <p className="font-semibold">{order?.customer?.name || "Unknown"}</p>
              {order?.customer?.phone && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />{order.customer.phone}
                </p>
              )}
              {order?.customer?.email && (
                <p className="text-muted-foreground flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" />{order.customer.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Order Info</p>
              <p className="font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {order?.location?.name || "All Locations"}
              </p>
              {order?.paymentMethod && order.paymentMethod !== "NOT_SPECIFIED" && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  {order.paymentMethod.replace(/_/g, " ")}
                </p>
              )}
              {order?.createdBy && (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  {order.createdBy.name || order.createdBy.email || "Unknown"}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Line items ── */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">Items Ordered</p>
            <div className="space-y-2">
              {(order?.lines || []).map((line: any) => (
                <div key={line.id}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{line.item?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {line.item?.sku || "N/A"} · {line.quantity || 0} × GHS {Number(line.unitPrice || 0).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-semibold ml-4 shrink-0">
                    GHS {Number(line.total || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              {(!order?.lines || order.lines.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No items found</p>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Payment summary ── */}
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Payment Summary</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span><span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span><span>{formatCurrency(shippingCost)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />Paid
                </span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
            )}
            {/* Still Owing row — same guard as the banner */}
            {showOutstanding && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />Still Owing
                </span>
                <span>{formatCurrency(amountOwing)}</span>
              </div>
            )}
          </div>

          {/* ── Payment history ── */}
          {(order?.payments ?? []).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Payment History
                </p>
                <div className="space-y-1.5">
                  {order.payments.map((p: any) => {
                    const isRefund = p.amount < 0
                    return (
                      <div key={p.id}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          isRefund ? "bg-orange-50" : "bg-green-50"
                        }`}>
                        <div>
                          <span className={`font-medium text-xs ${isRefund ? "text-orange-700" : "text-green-700"}`}>
                            {isRefund ? "Refund" : "Payment"} · {p.method?.replace(/_/g, " ")}
                          </span>
                          <p className="text-xs text-muted-foreground">{formatDate(p.paidAt || p.createdAt)}</p>
                          {p.reference && <p className="text-xs text-muted-foreground">{p.reference}</p>}
                        </div>
                        <span className={`font-semibold text-sm ${isRefund ? "text-orange-600" : "text-green-600"}`}>
                          {isRefund ? "-" : "+"}GHS {Math.abs(p.amount).toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Notes ── */}
          {order?.notes && (
            <>
              <Separator />
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* ── Dialogs ── */}
      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        salesOrder={salesOrder}
        onSuccess={onRefresh}
      />
      <ReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        salesOrder={salesOrder}
        onSuccess={onRefresh}
      />
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        salesOrder={salesOrder}
        onSuccess={onRefresh}
      />
      <UpdateStatusDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        salesOrder={salesOrder}
        onSuccess={onRefresh}
      />
    </>
  )
}