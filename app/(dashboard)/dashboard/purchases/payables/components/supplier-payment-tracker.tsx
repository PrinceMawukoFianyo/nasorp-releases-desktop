"use client"

// ============================================================
// SUPPLIER PAYMENT TRACKER
// File: app/dashboard/purchases/payables/components/supplier-payment-tracker.tsx
//
// Accounts Payable tracker — mirrors credit-payment-tracker.tsx.
// Shows what we owe suppliers, lets you record payments,
// alerts when overdue.
// ============================================================

import { useState, useMemo, useEffect } from "react"
import { Badge }     from "@/components/ui/badge"
import { Button }    from "@/components/ui/button"
import { Card }      from "@/components/ui/card"
import { Input }     from "@/components/ui/input"
import { Label }     from "@/components/ui/label"
import { Progress }  from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CreditCard, Smartphone, Banknote, Building2, Download, FileText,
  Receipt, AlertCircle, CheckCircle2, Clock, Search, BellRing,
  X, Printer, TrendingDown, Package,
} from "lucide-react"
import { toast } from "sonner"
import { recordSupplierPayment } from "@/actions/supplier-payables"
import type { SupplierPayable, SupplierPaymentRecord, APPaymentMethod } from "@/actions/supplier-payables"

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0)

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

function normaliseStatus(s: SupplierPayable["paymentStatus"], owing?: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (owing !== undefined && owing < 0.01) return "PAID"
  if (s === "PAID")    return "PAID"
  if (s === "PARTIAL") return "PARTIAL"
  return "UNPAID"
}

function getPaymentBadge(status: SupplierPayable["paymentStatus"], owing?: number) {
  const s = normaliseStatus(status, owing)
  if (s === "PAID")
    return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>
  if (s === "PARTIAL")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Clock className="w-3 h-3" />Partial</Badge>
  return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />Unpaid</Badge>
}

function getMethodIcon(method: APPaymentMethod) {
  if (method === "CASH")          return <Banknote className="w-3.5 h-3.5 text-green-600" />
  if (method === "MOBILE_MONEY")  return <Smartphone className="w-3.5 h-3.5 text-yellow-600" />
  if (method === "BANK_TRANSFER") return <Building2 className="w-3.5 h-3.5 text-blue-600" />
  return <CreditCard className="w-3.5 h-3.5 text-purple-600" />
}

function isOverdue(p: SupplierPayable): boolean {
  if (!p.expectedDate) return false
  if (normaliseStatus(p.paymentStatus, p.amountOwing) === "PAID") return false
  return new Date(p.expectedDate) < new Date()
}

// ── Due-alert logic ───────────────────────────────────────────────────────────

const ALERT_WINDOW = 3
const AP_ALERT_KEY = "ap_alert_shown"

interface DueAlert { payable: SupplierPayable; daysUntilDue: number }

function getDueAlerts(payables: SupplierPayable[]): DueAlert[] {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  return payables
    .filter(p => p.expectedDate && normaliseStatus(p.paymentStatus, p.amountOwing) !== "PAID")
    .map(p => {
      const due = new Date(p.expectedDate!); due.setHours(0, 0, 0, 0)
      return { payable: p, daysUntilDue: Math.round((due.getTime() - midnight.getTime()) / 86_400_000) }
    })
    .filter(({ daysUntilDue }) => daysUntilDue >= -ALERT_WINDOW && daysUntilDue <= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
}

function getShownSet(): Set<string> {
  try { const r = sessionStorage.getItem(AP_ALERT_KEY); return r ? new Set(JSON.parse(r)) : new Set() }
  catch { return new Set() }
}

// ── Due-Alert Banner ──────────────────────────────────────────────────────────

function DueAlertBanner({ alerts, onDismissOne, onDismissAll, onPayNow }: {
  alerts: DueAlert[]
  onDismissOne: (id: string) => void
  onDismissAll: () => void
  onPayNow: (p: SupplierPayable) => void
}) {
  if (!alerts.length) return null
  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-100 border-b border-orange-200">
        <div className="flex items-center gap-2 text-orange-800 font-semibold text-sm">
          <BellRing className="w-4 h-4" />
          {alerts.length === 1 ? "1 supplier payment is due" : `${alerts.length} supplier payments are due`}
        </div>
        <button onClick={onDismissAll} className="text-xs text-orange-600 hover:text-orange-900 underline">Dismiss all</button>
      </div>
      <div className="divide-y divide-orange-200 max-h-56 overflow-y-auto">
        {alerts.map(({ payable, daysUntilDue }) => {
          const label = daysUntilDue === 0 ? "Due TODAY" : `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""}`
          const cls   = daysUntilDue === 0 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100"
          return (
            <div key={payable.id} className="flex items-center gap-3 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {payable.supplierName}<span className="ml-1 text-gray-500 font-normal">· {payable.poNumber}</span>
                </p>
                <p className="text-xs text-gray-500">
                  We owe: <span className="font-semibold text-red-600">{fmt(payable.amountOwing)}</span>
                  {payable.expectedDate && <span className="ml-2">· Expected: {fmtDate(payable.expectedDate)}</span>}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>{label}</span>
              <Button size="sm" className="h-7 text-xs flex-shrink-0 bg-rose-600 hover:bg-rose-700" onClick={() => onPayNow(payable)}>Pay Now</Button>
              <button onClick={() => onDismissOne(payable.id)} className="text-orange-400 hover:text-orange-700 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Record Payment Dialog ─────────────────────────────────────────────────────

function RecordPaymentDialog({ open, onOpenChange, payable, onPaymentRecorded }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  payable: SupplierPayable | null
  onPaymentRecorded: (id: string, payment: SupplierPaymentRecord) => void
}) {
  const [amount,    setAmount]    = useState("")
  const [method,    setMethod]    = useState<APPaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [notes,     setNotes]     = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!payable) return null
  const maxOwing     = Math.round(payable.amountOwing * 100) / 100
  const parsed       = Math.round((parseFloat(amount) || 0) * 100) / 100
  const isValid      = parsed > 0 && parsed <= maxOwing + 0.01
  const newBalance   = Math.max(0, maxOwing - parsed)

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    try {
      const result = await recordSupplierPayment({
        purchaseOrderId: payable.id,
        amount:          Math.min(parsed, maxOwing),
        method,
        reference:       reference || undefined,
        notes:           notes || undefined,
      })
      if (result.success && result.data) {
        const p = result.data as any
        onPaymentRecorded(payable.id, {
          id: p.id, amount: p.amount, method: p.method,
          reference: p.reference ?? undefined, notes: p.notes ?? undefined,
          paidAt: new Date(p.paidAt), recordedBy: p.recordedById,
        })
        toast.success(`Payment of ${fmt(parsed)} recorded to ${payable.supplierName}`)
        onOpenChange(false); setAmount(""); setReference(""); setNotes("")
      } else {
        toast.error((result as any).error || "Failed to record payment")
      }
    } catch (err) { toast.error("Something went wrong") }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Record Payment to Supplier</DialogTitle>
          <DialogDescription>{payable.poNumber} · {payable.supplierName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">PO Total (invoiced)</span><span className="font-medium">{fmt(payable.totalAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="font-medium text-green-600">{fmt(payable.amountPaid)}</span></div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold"><span>We Still Owe</span><span className="text-red-600">{fmt(maxOwing)}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label>Amount Paying Now (GHS)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min={0.01} max={maxOwing} />
            {parsed > maxOwing + 0.01 && <p className="text-xs text-red-500">Cannot exceed balance of {fmt(maxOwing)}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={v => setMethod(v as APPaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH"><span className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" />Cash</span></SelectItem>
                <SelectItem value="BANK_TRANSFER"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600" />Bank Transfer</span></SelectItem>
                <SelectItem value="MOBILE_MONEY"><span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-yellow-600" />Mobile Money</span></SelectItem>
                <SelectItem value="CHEQUE"><span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-purple-600" />Cheque</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference / Transaction ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Bank ref, cheque no." value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Payment for Invoice #123" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {parsed > 0 && parsed <= maxOwing + 0.01 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-700 mb-1">After this payment:</p>
              <div className="flex justify-between text-green-800">
                <span>Remaining Balance</span>
                <span className="font-bold">{newBalance <= 0.01 ? "FULLY PAID ✓" : fmt(newBalance)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting} className="bg-rose-600 hover:bg-rose-700">
            {submitting ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Payment History Panel ─────────────────────────────────────────────────────

function PaymentHistoryPanel({ payable }: { payable: SupplierPayable }) {
  const paidPct = Math.min(100, payable.totalAmount > 0 ? Math.round((payable.amountPaid / payable.totalAmount) * 100) : 0)
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
          <span>Payment progress</span><span>{paidPct}%</span>
        </div>
        <Progress value={paidPct} className="h-2" />
      </div>
      {payable.payments.length === 0
        ? <p className="text-sm text-muted-foreground italic">No payments recorded yet.</p>
        : <div className="space-y-2">
            {payable.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  {getMethodIcon(p.method)}
                  <div>
                    <p className="font-medium">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.paidAt)}{p.reference && ` · ${p.reference}`}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{p.method.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
      }
      {payable.receiptNumbers.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Goods Receipts:</p>
          <div className="flex flex-wrap gap-1.5">
            {payable.receiptNumbers.map(rn => (
              <Badge
                key={rn}
                variant="outline"
                className="text-xs gap-1 cursor-pointer hover:bg-muted"
                onClick={() => window.open(`/dashboard/purchases/goods-receipt?search=${rn}`, "_blank")}
              >
                <Package className="w-3 h-3" />{rn}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SupplierPaymentTrackerProps {
  payables:          SupplierPayable[]
  autoOpenPayableId?: string | null
  onAutoOpenHandled?: () => void
}

export default function SupplierPaymentTracker({
  payables: initialPayables,
  autoOpenPayableId,
  onAutoOpenHandled,
}: SupplierPaymentTrackerProps) {
  const [payables,       setPayables]       = useState(initialPayables)
  const [search,         setSearch]         = useState("")
  const [statusFilter,   setStatusFilter]   = useState("ALL")
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [payDialogOpen,  setPayDialogOpen]  = useState(false)
  const [payingPayable,  setPayingPayable]  = useState<SupplierPayable | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // Auto-open payment dialog when triggered from Creditors tab
  useEffect(() => {
    if (autoOpenPayableId) {
      const p = payables.find(x => x.id === autoOpenPayableId)
      if (p) { setPayingPayable(p); setPayDialogOpen(true); setSelectedId(p.id) }
      onAutoOpenHandled?.()
    }
  }, [autoOpenPayableId])

  const dueAlerts = useMemo(
    () => getDueAlerts(payables).filter(a => !dismissedAlerts.has(a.payable.id)),
    [payables, dismissedAlerts]
  )

  const filtered = useMemo(() => payables.filter(p => {
    const norm   = normaliseStatus(p.paymentStatus, p.amountOwing)
    const matchS = statusFilter === "ALL" || statusFilter === norm
    const matchQ =
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierPhone ?? "").includes(search)
    return matchS && matchQ
  }), [payables, statusFilter, search])

  const selected = payables.find(p => p.id === selectedId) ?? null

  const kpis = useMemo(() => ({
    total:   payables.reduce((s, p) => s + p.totalAmount, 0),
    owing:   payables.reduce((s, p) => s + p.amountOwing, 0),
    paid:    payables.reduce((s, p) => s + p.amountPaid, 0),
    overdue: payables.filter(isOverdue).length,
  }), [payables])

  const handlePaymentRecorded = (payableId: string, payment: SupplierPaymentRecord) => {
    setPayables(prev => prev.map(p => {
      if (p.id !== payableId) return p
      const newPaid  = p.amountPaid + payment.amount
      const newOwing = Math.max(0, p.amountOwing - payment.amount)
      return {
        ...p,
        amountPaid:    newPaid,
        amountOwing:   newOwing,
        paymentStatus: newOwing <= 0.01 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID",
        payments:      [...p.payments, payment],
      }
    }))
  }

  const exportCSV = () => {
    const rows = filtered.map(p => ({
      "PO #":          p.poNumber,
      "Supplier":      p.supplierName,
      "Phone":         p.supplierPhone ?? "",
      "Total Invoiced":p.totalAmount.toFixed(2),
      "Paid":          p.amountPaid.toFixed(2),
      "Owing":         p.amountOwing.toFixed(2),
      "Status":        normaliseStatus(p.paymentStatus, p.amountOwing),
      "Order Date":    fmtDate(p.orderDate),
    }))
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => String((r as any)[h])).join(","))].join("\n")
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `supplier-payables-${new Date().toISOString().slice(0, 10)}.csv`,
    }); a.click()
    toast.success("Exported payables")
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced",  value: fmt(kpis.total),   color: "text-foreground",    icon: <Package className="w-4 h-4 text-muted-foreground" /> },
          { label: "We Still Owe",    value: fmt(kpis.owing),   color: "text-red-600",        icon: <TrendingDown className="w-4 h-4 text-red-500" /> },
          { label: "Total Paid Out",  value: fmt(kpis.paid),    color: "text-green-600",      icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
          { label: "Overdue",         value: String(kpis.overdue), color: kpis.overdue > 0 ? "text-orange-600" : "text-muted-foreground", icon: <AlertCircle className="w-4 h-4 text-orange-500" /> },
        ].map((k, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
              {k.icon}
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Due-Alert Banner */}
      <DueAlertBanner
        alerts={dueAlerts}
        onDismissOne={id => setDismissedAlerts(prev => new Set([...prev, id]))}
        onDismissAll={() => setDismissedAlerts(new Set(payables.map(p => p.id)))}
        onPayNow={p => { setPayingPayable(p); setPayDialogOpen(true) }}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search supplier, PO…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
          <Download className="w-4 h-4" />Export
        </Button>
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: list */}
        <Card className="lg:col-span-2">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier / PO</TableHead>
                  <TableHead className="text-right">Owing</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No payables found</TableCell></TableRow>
                )}
                {filtered.map(p => {
                  const over = isOverdue(p)
                  return (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer ${selectedId === p.id ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/40"} ${over ? "bg-red-50/40" : ""}`}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <TableCell>
                        <p className="font-semibold text-sm truncate max-w-[130px]">{p.supplierName}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.poNumber}</p>
                        {over && <span className="text-[10px] text-red-600 font-semibold">⚠ Overdue</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{fmt(p.amountOwing)}</TableCell>
                      <TableCell>{getPaymentBadge(p.paymentStatus, p.amountOwing)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Right: detail panel */}
        <Card className="lg:col-span-3 p-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Package className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Select a payable to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base">{selected.supplierName}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{selected.poNumber}</p>
                  {selected.supplierPhone && <p className="text-xs text-muted-foreground mt-0.5">{selected.supplierPhone}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getPaymentBadge(selected.paymentStatus, selected.amountOwing)}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="View Goods Receipt"
                    onClick={() => window.open(`/dashboard/purchases/goods-receipt?search=${selected.poNumber}`, "_blank")}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Print Receipt"
                    onClick={() => window.open(`/dashboard/purchases/payables/${selected.id}/print`, "_blank")}
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Balance strip */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-muted/40 rounded-md p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Invoice Total</p>
                  <p className="font-bold">{fmt(selected.totalAmount)}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-md p-2.5 text-center">
                  <p className="text-[10px] text-green-700 uppercase font-medium">Paid</p>
                  <p className="font-bold text-green-700">{fmt(selected.amountPaid)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-md p-2.5 text-center">
                  <p className="text-[10px] text-red-700 uppercase font-medium">Still Owe</p>
                  <p className="font-bold text-red-700">{fmt(selected.amountOwing)}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Order Date: <strong>{fmtDate(selected.orderDate)}</strong></span>
                {selected.expectedDate && <span className={isOverdue(selected) ? "text-red-600 font-semibold" : ""}>
                  Expected: <strong>{fmtDate(selected.expectedDate)}</strong>
                  {isOverdue(selected) && " ⚠"}
                </span>}
              </div>

              <Separator />

              {/* Payment history */}
              <PaymentHistoryPanel payable={selected} />

              {/* Pay button */}
              {normaliseStatus(selected.paymentStatus, selected.amountOwing) !== "PAID" && (
                <Button
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  onClick={() => { setPayingPayable(selected); setPayDialogOpen(true) }}
                >
                  Record Payment to {selected.supplierName}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        payable={payingPayable}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  )
}