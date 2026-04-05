"use client"

// ============================================================
// CREDIT & PAYMENT TRACKER
// File: app/dashboard/sales/orders/components/credit-payment-tracker.tsx
// ============================================================

import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  CreditCard, Smartphone, Banknote, Download, ChevronDown, FileText,
  Receipt, Plus, Calendar, AlertCircle, CheckCircle2, Clock, Search,
  TrendingUp, Users, DollarSign, BellRing, X,
} from "lucide-react"
import { toast } from "sonner"
import { recordPayment } from "@/actions/sales-orders"
import { formatCurrency, formatDate } from "../so-utils"


// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string
  amount: number
  method: "CASH" | "MOMO" | "CREDIT_CARD"
  reference?: string
  paidAt: Date
  recordedBy?: string
}

export interface CreditOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone?: string
  totalAmount: number
  amountPaid: number
  amountOwing: number
  orderDate: Date
  deliveryDate?: Date | null
  // PENDING is the DB value for "unpaid" — normalised to UNPAID for display
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "PENDING"
  payments: PaymentRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseStatus(s: CreditOrder["paymentStatus"], amountOwing?: number): "UNPAID" | "PARTIAL" | "PAID" {
  // If amountOwing is 0 or less the order is fully paid regardless of DB status
  // This handles stale PARTIAL status when full payment was recorded
  if (amountOwing !== undefined && amountOwing < 0.01) return "PAID"
  if (s === "PAID")    return "PAID"
  if (s === "PARTIAL") return "PARTIAL"
  return "UNPAID"
}

function getPaymentBadge(status: CreditOrder["paymentStatus"], amountOwing?: number) {
  const s = normaliseStatus(status, amountOwing)
  if (s === "PAID")
    return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>
  if (s === "PARTIAL")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Clock className="w-3 h-3" />Partial</Badge>
  return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />Unpaid</Badge>
}

function getMethodIcon(method: PaymentRecord["method"]) {
  if (method === "CASH")        return <Banknote className="w-3.5 h-3.5 text-green-600" />
  if (method === "MOMO")        return <Smartphone className="w-3.5 h-3.5 text-yellow-600" />
  if (method === "CREDIT_CARD") return <CreditCard className="w-3.5 h-3.5 text-blue-600" />
}

function isOverdue(order: CreditOrder): boolean {
  if (!order.deliveryDate) return false
  if (normaliseStatus(order.paymentStatus, order.amountOwing) === "PAID") return false
  return new Date(order.deliveryDate) < new Date()
}

// ─── Due-date alert logic ─────────────────────────────────────────────────────

const ALERT_WINDOW_DAYS = 3
const SESSION_KEY = "credit_alert_shown"

interface DueAlert { order: CreditOrder; daysUntilDue: number }

function getDueAlerts(orders: CreditOrder[]): DueAlert[] {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  return orders
    .filter(o => o.deliveryDate && normaliseStatus(o.paymentStatus, o.amountOwing) !== "PAID")
    .map(o => {
      const dueDay = new Date(o.deliveryDate!); dueDay.setHours(0, 0, 0, 0)
      const daysUntilDue = Math.round((dueDay.getTime() - midnight.getTime()) / 86_400_000)
      return { order: o, daysUntilDue }
    })
    .filter(({ daysUntilDue }) => daysUntilDue >= -ALERT_WINDOW_DAYS && daysUntilDue <= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
}

function getAlreadyShownSet(): Set<string> {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? new Set(JSON.parse(r)) : new Set() }
  catch { return new Set() }
}
function markAlertShown(id: string) {
  try { const s = getAlreadyShownSet(); s.add(id); sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s])) }
  catch { /* ignore */ }
}

// ─── Due-Alert Banner ─────────────────────────────────────────────────────────

function DueAlertBanner({ alerts, onDismissOne, onDismissAll, onPayNow }: {
  alerts: DueAlert[]
  onDismissOne: (id: string) => void
  onDismissAll: () => void
  onPayNow: (order: CreditOrder) => void
}) {
  if (alerts.length === 0) return null
  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-100 border-b border-orange-200">
        <div className="flex items-center gap-2 text-orange-800 font-semibold text-sm">
          <BellRing className="w-4 h-4" />
          {alerts.length === 1 ? "1 payment is due" : `${alerts.length} payments are due or overdue`}
        </div>
        <button onClick={onDismissAll} className="text-xs text-orange-600 hover:text-orange-900 underline underline-offset-2">Dismiss all</button>
      </div>
      <div className="divide-y divide-orange-200 max-h-60 overflow-y-auto">
        {alerts.map(({ order, daysUntilDue }) => {
          const label = daysUntilDue === 0 ? "Due TODAY" : `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""}`
          const labelColor = daysUntilDue === 0 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100"
          return (
            <div key={order.id} className="flex items-center gap-3 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {order.customerName}<span className="ml-1 text-gray-500 font-normal">· {order.orderNumber}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Owing: <span className="font-semibold text-red-600">{formatCurrency(order.amountOwing)}</span>
                  {order.deliveryDate && <span className="ml-2">· Due: {formatDate(order.deliveryDate)}</span>}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${labelColor}`}>{label}</span>
              <Button size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => onPayNow(order)}>Pay Now</Button>
              <button onClick={() => onDismissOne(order.id)} className="text-orange-400 hover:text-orange-700 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({ open, onOpenChange, order, onPaymentRecorded }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  order: CreditOrder | null
  onPaymentRecorded: (orderId: string, payment: PaymentRecord) => void
}) {
  const [amount, setAmount]       = useState("")
  const [method, setMethod]       = useState<PaymentRecord["method"]>("CASH")
  const [reference, setReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!order) return null
  const maxAmount    = Math.round(order.amountOwing * 100) / 100
  const parsedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100
  const isValid      = parsedAmount > 0 && parsedAmount <= maxAmount
  const newBalance   = maxAmount - parsedAmount

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    try {
      const result = await recordPayment({ orderId: order.id, amount: Math.min(parsedAmount, maxAmount), method, reference: reference || undefined })
      if (result.success && result.data) {
        const p = result.data as any
        const newPayment: PaymentRecord = {
          id: p.id, amount: p.amount, method: p.method,
          reference: p.reference ?? undefined,
          paidAt: new Date(p.paidAt),
          recordedBy: p.recordedById ?? undefined,
        }
        onPaymentRecorded(order.id, newPayment)
        toast.success(`Payment of ${formatCurrency(parsedAmount)} recorded!`)
        onOpenChange(false); setAmount(""); setReference("")
      } else {
        toast.error((result as any).error || "Failed to record payment")
      }
    } catch (err) { console.error(err); toast.error("Something went wrong") }
    finally { setIsSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{order.orderNumber} · {order.customerName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Invoice</span><span className="font-medium">{formatCurrency(order.totalAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="font-medium text-green-600">{formatCurrency(order.amountPaid)}</span></div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold"><span>Balance Owing</span><span className="text-red-600">{formatCurrency(maxAmount)}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label>Amount Received (GHS)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min={0.01} max={maxAmount} />
            {parsedAmount > maxAmount && <p className="text-xs text-red-500">Cannot exceed balance of {formatCurrency(maxAmount)}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={v => setMethod(v as PaymentRecord["method"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH"><span className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" />Cash</span></SelectItem>
                <SelectItem value="MOMO"><span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-yellow-600" />Mobile Money (MoMo)</span></SelectItem>
                <SelectItem value="CREDIT_CARD"><span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" />Credit / Debit Card</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference / Transaction ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. MoMo ref, card last 4" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          {parsedAmount > 0 && parsedAmount <= maxAmount && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-700 mb-1">After this payment:</p>
              <div className="flex justify-between text-green-800">
                <span>New Balance Owing</span>
                <span className="font-bold">{newBalance <= 0 ? "FULLY PAID ✓" : formatCurrency(newBalance)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>{isSubmitting ? "Saving..." : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Payment History Panel ────────────────────────────────────────────────────

function PaymentHistoryPanel({ order }: { order: CreditOrder }) {
  const paidPct = Math.min(100, Math.round((order.amountPaid / order.totalAmount) * 100))
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
          <span>Payment progress</span><span>{paidPct}%</span>
        </div>
        <Progress value={paidPct} className="h-2" />
      </div>
      {order.payments.length === 0
        ? <p className="text-sm text-muted-foreground italic">No payments recorded yet.</p>
        : <div className="space-y-2">
            {order.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  {getMethodIcon(p.method)}
                  <div>
                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.paidAt)}{p.reference && ` · ${p.reference}`}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{p.method.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export type ExportFilter = "current_debtors" | "all" | "paid_only"

interface CreditPaymentTrackerProps {
  orders: CreditOrder[]
  onPaymentRecorded?: (orderId: string, payment: PaymentRecord) => void
  /** When set, auto-opens the payment dialog for this order ID (used from Debtors tab) */
  autoOpenOrderId?: string | null
  onAutoOpenHandled?: () => void
}

export default function CreditPaymentTracker({ orders: initialOrders, onPaymentRecorded, autoOpenOrderId, onAutoOpenHandled }: CreditPaymentTrackerProps) {
  const [orders, setOrders]                       = useState<CreditOrder[]>(initialOrders)
  const [selectedOrder, setSelectedOrder]         = useState<CreditOrder | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [expandedId, setExpandedId]               = useState<string | null>(null)
  const [search, setSearch]                       = useState("")
  const [statusFilter, setStatusFilter]           = useState<"ALL" | "UNPAID" | "PARTIAL" | "PAID">("ALL")
  const [exportFilter, setExportFilter]           = useState<ExportFilter>("current_debtors")
  const [visibleAlerts, setVisibleAlerts]         = useState<DueAlert[]>([])
  const alertsFiredRef                            = useRef(false)

  // Auto-open payment dialog when navigated from Debtors tab
  useEffect(() => {
    if (!autoOpenOrderId) return
    const order = orders.find(o => o.id === autoOpenOrderId)
    if (order) { setSelectedOrder(order); setPaymentDialogOpen(true) }
    onAutoOpenHandled?.()
  }, [autoOpenOrderId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fire due-date alerts once per session
  useEffect(() => {
    if (alertsFiredRef.current) return
    alertsFiredRef.current = true
    const fresh = getDueAlerts(orders).filter(a => !getAlreadyShownSet().has(a.order.id))
    if (!fresh.length) return
    setVisibleAlerts(fresh)
    fresh.forEach(({ order, daysUntilDue }, i) => {
      const isToday = daysUntilDue === 0
      const daysLabel = isToday ? "today" : `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} ago`
      setTimeout(() => {
        toast[isToday ? "warning" : "error"](`Payment due ${daysLabel}: ${order.customerName}`, {
          description: `${order.orderNumber} · ${formatCurrency(order.amountOwing)} still owing`,
          duration: 8000,
          icon: <BellRing className="w-4 h-4" />,
          action: { label: "Record payment", onClick: () => { setSelectedOrder(order); setPaymentDialogOpen(true) } },
        })
      }, i * 600)
      markAlertShown(order.id)
    })
  }, [orders])

  const stats = useMemo(() => ({
    totalOwed:    orders.reduce((s, o) => s + o.amountOwing, 0),
    totalPaid:    orders.reduce((s, o) => s + o.amountPaid, 0),
    debtors:      orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) !== "PAID").length,
    overdueCount: orders.filter(isOverdue).length,
  }), [orders])

  const filtered = useMemo(() => orders.filter(o => {
    const matchSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
    // Pass amountOwing so stale PARTIAL (amountOwing=0) shows as PAID in filter
    const ns = normaliseStatus(o.paymentStatus, o.amountOwing)
    const matchStatus = statusFilter === "ALL" || ns === statusFilter
    return matchSearch && matchStatus
  }), [orders, search, statusFilter])

  const handlePaymentRecorded = (orderId: string, payment: PaymentRecord) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const newPaid  = o.amountPaid + payment.amount
      const newOwing = o.totalAmount - newPaid
      const newStatus: CreditOrder["paymentStatus"] = newOwing <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID"
      return { ...o, amountPaid: newPaid, amountOwing: Math.max(0, newOwing), paymentStatus: newStatus, payments: [payment, ...o.payments] }
    }))
    onPaymentRecorded?.(orderId, payment)
  }

  const handleExport = () => {
    const rows =
      exportFilter === "current_debtors" ? orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) !== "PAID") :
      exportFilter === "paid_only"       ? orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) === "PAID") :
      orders
    const headers = ["Order #","Customer","Phone","Total (GHS)","Paid (GHS)","Owing (GHS)","Status","Order Date","Delivery Date"]
    const csv = [
      headers.join(","),
      ...rows.map(o => [
        o.orderNumber, `"${o.customerName}"`, o.customerPhone || "",
        o.totalAmount.toFixed(2), o.amountPaid.toFixed(2), o.amountOwing.toFixed(2),
        normaliseStatus(o.paymentStatus, o.amountOwing), formatDate(o.orderDate),
        o.deliveryDate ? formatDate(o.deliveryDate) : "N/A",
      ].join(",")),
    ].join("\n")
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `credit-report-${exportFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
    toast.success("Export downloaded")
  }

  const openPayDialog = (order: CreditOrder) => { setSelectedOrder(order); setPaymentDialogOpen(true) }

  return (
    <div className="space-y-4">
      {/* Due-date Alert Banner */}
      <DueAlertBanner
        alerts={visibleAlerts}
        onDismissOne={id => setVisibleAlerts(p => p.filter(a => a.order.id !== id))}
        onDismissAll={() => setVisibleAlerts([])}
        onPayNow={openPayDialog}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <DollarSign className="w-4 h-4 text-red-500" />, label: "Total Owing",      value: formatCurrency(stats.totalOwed),   color: "text-red-600" },
          { icon: <TrendingUp className="w-4 h-4 text-green-500" />, label: "Total Collected", value: formatCurrency(stats.totalPaid),   color: "text-green-600" },
          { icon: <Users className="w-4 h-4 text-blue-500" />,       label: "Active Debtors",  value: stats.debtors,                     color: "" },
          { icon: <AlertCircle className="w-4 h-4 text-orange-500" />, label: "Overdue",       value: stats.overdueCount,                color: "text-orange-600" },
        ].map(c => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {c.icon}
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search customer or order…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status ({orders.length})</SelectItem>
              <SelectItem value="UNPAID">Unpaid ({orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) === "UNPAID").length})</SelectItem>
              <SelectItem value="PARTIAL">Partial ({orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) === "PARTIAL").length})</SelectItem>
              <SelectItem value="PAID">Paid ({orders.filter(o => normaliseStatus(o.paymentStatus, o.amountOwing) === "PAID").length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Select value={exportFilter} onValueChange={v => setExportFilter(v as ExportFilter)}>
            <SelectTrigger className="w-48 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current_debtors">Current Debtors Only</SelectItem>
              <SelectItem value="all">All (Debtors + Paid)</SelectItem>
              <SelectItem value="paid_only">Paid Customers Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-4 h-4" />Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="max-h-[560px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Owing</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No records found</TableCell></TableRow>
              )}
              {filtered.map(order => {
                const isExpanded = expandedId === order.id
                const overdue    = isOverdue(order)
                return (
                  <>
                    <TableRow
                      key={order.id}
                      className={`cursor-pointer hover:bg-muted/30 ${overdue ? "bg-orange-50/50" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <TableCell>
                        <p className="font-medium">{order.customerName}</p>
                        {order.customerPhone && <p className="text-xs text-muted-foreground">{order.customerPhone}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell className="text-right text-green-700 font-medium">{formatCurrency(order.amountPaid)}</TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={normaliseStatus(order.paymentStatus, order.amountOwing) === "PAID" ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(order.amountOwing)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {order.deliveryDate ? (
                          <div className={`flex items-center gap-1 text-sm ${overdue ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(order.deliveryDate)}
                            {overdue && <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] ml-1">Overdue</Badge>}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>{getPaymentBadge(order.paymentStatus, order.amountOwing)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {normaliseStatus(order.paymentStatus, order.amountOwing) !== "PAID" && (
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => openPayDialog(order)}>
                              <Plus className="w-3 h-3" />Pay
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0"><ChevronDown className="w-3 h-3" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(`/dashboard/sales/orders/${order.id}/invoice`, "_blank")}>
                                <FileText className="w-4 h-4 mr-2" />View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/dashboard/sales/orders/${order.id}/receipt`, "_blank")}>
                                <Receipt className="w-4 h-4 mr-2" />View Receipt
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${order.id}-exp`} className="bg-muted/20">
                        <TableCell colSpan={8} className="py-3 px-6">
                          <div className="max-w-lg">
                            <p className="text-sm font-semibold mb-2">Payment History — {order.orderNumber}</p>
                            <PaymentHistoryPanel order={order} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-4 py-3 flex flex-wrap gap-4 text-sm bg-muted/20">
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> records</span>
          <span className="ml-auto font-semibold text-red-600">Total Owing: {formatCurrency(filtered.reduce((s, o) => s + o.amountOwing, 0))}</span>
          <span className="font-semibold text-green-600">Total Collected: {formatCurrency(filtered.reduce((s, o) => s + o.amountPaid, 0))}</span>
        </div>
      </Card>

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={selectedOrder}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  )
}