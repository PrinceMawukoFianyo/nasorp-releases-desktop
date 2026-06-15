"use client"

// ============================================================
// SUPPLIER PAYMENT TRACKER
// File: app/dashboard/purchases/payables/components/supplier-payment-tracker.tsx
//
// Lists every received PO that still has an outstanding balance.
// Lets staff record partial or full payments against each PO.
// Accepts autoOpenPayableId from SupplierTabsPage (Creditors tab → Pay Now).
// ============================================================

import { useState, useEffect, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"           // <-- ADD THIS
import { Badge }    from "@/components/ui/badge"
import { Button }   from "@/components/ui/button"
import { Card }     from "@/components/ui/card"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress }   from "@/components/ui/progress"
import {
  Search, CreditCard, ChevronDown, ChevronRight, Building2,
  Phone, Mail, Calendar, AlertCircle, CheckCircle2, Clock,
  Banknote, Loader2, Receipt, History, FileText, Printer,
} from "lucide-react"
import { toast }                    from "sonner"
import { recordSupplierPayment }    from "@/actions/supplier-payables"
import type { SupplierPayable, APPaymentMethod } from "@/actions/supplier-payables"

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n ?? 0)

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PAID:    { label: "Paid",    color: "bg-green-100 text-green-800 border-green-200",  icon: <CheckCircle2 className="w-3 h-3" /> },
  PARTIAL: { label: "Partial", color: "bg-blue-100 text-blue-800 border-blue-200",    icon: <Clock className="w-3 h-3" /> },
  UNPAID:  { label: "Unpaid",  color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertCircle className="w-3 h-3" /> },
} as const

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNPAID
  if (overdue && status !== "PAID") {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1 text-xs">
        <AlertCircle className="w-3 h-3" />Overdue
      </Badge>
    )
  }
  return <Badge className={`${cfg.color} gap-1 text-xs`}>{cfg.icon}{cfg.label}</Badge>
}

// ── Payment method display ────────────────────────────────────────────────────

const METHOD_LABELS: Record<APPaymentMethod, string> = {
  CASH:           "Cash",
  BANK_TRANSFER:  "Bank Transfer",
  MOBILE_MONEY:   "Mobile Money",
  CHEQUE:         "Cheque",
}

// ── Pay Now Dialog ────────────────────────────────────────────────────────────

interface PayDialogProps {
  payable:  SupplierPayable | null
  open:     boolean
  onClose:  () => void
  onPaid:   () => void   // ← will call router.refresh()
}

function PayNowDialog({ payable, open, onClose, onPaid }: PayDialogProps) {
  const [amount,    setAmount]    = useState("")
  const [method,    setMethod]    = useState<APPaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [notes,     setNotes]     = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (payable) {
      setAmount(payable.amountOwing.toFixed(2))
      setMethod("CASH")
      setReference("")
      setNotes("")
    }
  }, [payable?.id])

  if (!payable) return null

  const maxOwing  = payable.amountOwing
  const paidPct   = Math.min(100, Math.round((payable.amountPaid / payable.totalAmount) * 100))
  const amtNum    = parseFloat(amount) || 0
  const amtValid  = amtNum > 0 && amtNum <= maxOwing + 0.01

  const handleSubmit = () => {
    if (!amtValid) {
      toast.error(`Amount must be between GHS 0.01 and ${fmt(maxOwing)}`)
      return
    }
    startTransition(async () => {
      const res = await recordSupplierPayment({
        purchaseOrderId: payable.id,
        amount:          amtNum,
        method,
        reference:       reference.trim() || undefined,
        notes:           notes.trim()     || undefined,
      })
      if (res.success) {
        toast.success(`Payment of ${fmt(amtNum)} recorded for ${payable.poNumber}`)
        onPaid()   // ← triggers refresh in parent
        onClose()
      } else {
        toast.error(res.error ?? "Failed to record payment")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-600" />
            Record Payment — {payable.poNumber}
          </DialogTitle>
          <DialogDescription>
            Record a payment to <strong>{payable.supplierName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{payable.supplierName}</span>
            {payable.supplierPhone && (
              <span className="text-muted-foreground flex items-center gap-1 ml-2">
                <Phone className="w-3 h-3" />{payable.supplierPhone}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">PO Total</p>
              <p className="font-semibold">{fmt(payable.totalAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Already Paid</p>
              <p className="font-semibold text-green-700">{fmt(payable.amountPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Still Owe</p>
              <p className="font-semibold text-red-600">{fmt(payable.amountOwing)}</p>
            </div>
          </div>
          <Progress value={paidPct} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground text-right">{paidPct}% paid</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount (GHS) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                max={maxOwing}
                step="0.01"
                placeholder={maxOwing.toFixed(2)}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={!amtValid && amount ? "border-red-400" : ""}
              />
              {!amtValid && amount && (
                <p className="text-[11px] text-red-500">
                  Must be between GHS 0.01 and {fmt(maxOwing)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Payment Method *</Label>
              <Select value={method} onValueChange={v => setMethod(v as APPaymentMethod)}>
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHOD_LABELS) as APPaymentMethod[]).map(m => (
                    <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">Reference / Transaction ID</Label>
            <Input
              id="pay-ref"
              placeholder="e.g. TRX-001, Cheque #123, MoMo ref…"
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes (optional)</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              placeholder="Any additional notes about this payment…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {payable.payments.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <History className="w-3 h-3" />Payment History
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {payable.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs rounded border px-2.5 py-1.5 bg-background">
                  <span className="text-muted-foreground">{fmtDate(p.paidAt)}</span>
                  <span className="font-medium">{METHOD_LABELS[p.method] ?? p.method}</span>
                  {p.reference && <span className="text-muted-foreground font-mono">{p.reference}</span>}
                  <span className="font-semibold text-green-700">{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !amtValid}
            className="bg-rose-600 hover:bg-rose-700 gap-1.5"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Recording…</>
              : <><Banknote className="w-4 h-4" />Record Payment</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Row detail (expandable) ───────────────────────────────────────────────────

function PayableRow({
  payable,
  onPayNow,
}: {
  payable:  SupplierPayable
  onPayNow: (p: SupplierPayable) => void
}) {
  const [open, setOpen] = useState(false)

  const isOverdue = payable.expectedDate
    ? new Date(payable.expectedDate) < new Date() && payable.amountOwing > 0
    : false
  const paidPct = Math.min(100, Math.round((payable.amountPaid / payable.totalAmount) * 100))

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <TableRow
          className={`cursor-pointer hover:bg-muted/30 transition-colors ${
            isOverdue && payable.paymentStatus !== "PAID" ? "bg-red-50/40" : ""
          }`}
          onClick={() => setOpen(o => !o)}
        >
          <TableCell className="w-8 pr-0">
            <CollapsibleTrigger asChild>
              <span>
                {open
                  ? <ChevronDown  className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </span>
            </CollapsibleTrigger>
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{payable.supplierName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {payable.supplierPhone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />{payable.supplierPhone}
                    </span>
                  )}
                  {payable.supplierEmail && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />{payable.supplierEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell className="font-mono text-xs">{payable.poNumber}</TableCell>
          <TableCell className="text-right text-sm">{fmt(payable.totalAmount)}</TableCell>
          <TableCell className="text-right font-medium text-green-700">{fmt(payable.amountPaid)}</TableCell>
          <TableCell className="text-right font-bold">
            <span className={payable.amountOwing > 0 ? "text-red-600" : "text-green-600"}>
              {payable.amountOwing > 0 ? fmt(payable.amountOwing) : "Settled ✓"}
            </span>
          </TableCell>
          <TableCell className="w-28">
            <div className="space-y-1">
              <Progress value={paidPct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">{paidPct}%</p>
            </div>
          </TableCell>
          <TableCell>
            <StatusBadge status={payable.paymentStatus} overdue={isOverdue} />
          </TableCell>
          <TableCell>
            {payable.expectedDate
              ? <span className={`text-sm flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  <Calendar className="w-3 h-3" />
                  {fmtDate(payable.expectedDate)}
                  {isOverdue && " ⚠"}
                </span>
              : <span className="text-muted-foreground text-sm">—</span>}
          </TableCell>
          <TableCell onClick={e => e.stopPropagation()}>
            <div className="flex gap-1">
              {payable.paymentStatus !== "PAID" && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-rose-600 hover:bg-rose-700"
                  onClick={() => onPayNow(payable)}
                >
                  <Banknote className="w-3 h-3" />Pay
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                title="View PO"
                onClick={() => window.open(`/dashboard/purchases/purchase-orders?po=${payable.id}`, "_blank")}
              >
                <FileText className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                title="Print Receipt"
                onClick={() => window.open(`/dashboard/purchases/payables/${payable.id}/print`, "_blank")}
              >
                <Printer className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <CollapsibleContent asChild>
          <TableRow className="bg-muted/10 hover:bg-muted/10">
            <TableCell colSpan={10} className="p-0">
              <div className="px-8 py-3 space-y-3">
                {payable.receiptNumbers.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Receipt className="w-3 h-3" />Goods Receipts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {payable.receiptNumbers.map(r => (
                        <Badge key={r} variant="outline" className="font-mono text-xs">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {payable.payments.length > 0 ? (
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <History className="w-3 h-3" />Payment History
                    </p>
                    <div className="space-y-1.5">
                      {payable.payments.map(p => (
                        <div key={p.id} className="flex items-center gap-4 rounded-lg border px-3 py-2 text-sm bg-background">
                          <span className="text-muted-foreground text-xs w-24">{fmtDate(p.paidAt)}</span>
                          <Badge variant="outline" className="text-xs">{METHOD_LABELS[p.method] ?? p.method}</Badge>
                          {p.reference && <span className="font-mono text-xs text-muted-foreground">{p.reference}</span>}
                          {p.notes && <span className="text-xs text-muted-foreground italic truncate max-w-[160px]">{p.notes}</span>}
                          {p.recordedBy && <span className="text-xs text-muted-foreground ml-auto">by {p.recordedBy}</span>}
                          <span className="font-semibold text-green-700 ml-auto">{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                )}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SupplierPaymentTrackerProps {
  payables:           SupplierPayable[]
  autoOpenPayableId?: string | null
  onAutoOpenHandled?: () => void
}

export default function SupplierPaymentTracker({
  payables,
  autoOpenPayableId,
  onAutoOpenHandled,
}: SupplierPaymentTrackerProps) {
  const router = useRouter()                         // <-- ADD THIS
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedPO,   setSelectedPO]   = useState<SupplierPayable | null>(null)
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [refreshKey,   setRefreshKey]   = useState(0)

  // Auto-open dialog when routed from Creditors tab
  useEffect(() => {
    if (autoOpenPayableId) {
      const found = payables.find(p => p.id === autoOpenPayableId)
      if (found) {
        setSelectedPO(found)
        setDialogOpen(true)
        onAutoOpenHandled?.()
      }
    }
  }, [autoOpenPayableId])

  // Due‑date toast alerts (unchanged)
  useEffect(() => {
    const STORAGE_PREFIX = "ap-alert-"
    const MAX_SHOW_DAYS  = 3
    const todayISO = new Date().toISOString().slice(0, 10)

    function loadRecord(payableId: string): string[] {
      try { const raw = localStorage.getItem(STORAGE_PREFIX + payableId); return raw ? JSON.parse(raw) : [] } catch { return [] }
    }
    function saveRecord(payableId: string, dates: string[]) {
      try { localStorage.setItem(STORAGE_PREFIX + payableId, JSON.stringify(dates)) } catch {}
    }
    function shouldShow(payableId: string): boolean {
      const dates = loadRecord(payableId)
      if (dates.length >= MAX_SHOW_DAYS) return false
      if (dates.includes(todayISO)) return false
      saveRecord(payableId, [...dates, todayISO])
      return true
    }
    function daysRemaining(payableId: string): number { return MAX_SHOW_DAYS - loadRecord(payableId).length }

    const now = new Date()
    const timer = setTimeout(() => {
      const unpaid = payables.filter(p => p.paymentStatus !== "PAID" && p.amountOwing > 0 && p.expectedDate)
      unpaid.filter(p => new Date(p.expectedDate!) < now).forEach(p => {
        if (!shouldShow(p.id)) return
        const daysLate = Math.floor((now.getTime() - new Date(p.expectedDate!).getTime()) / 86_400_000)
        const reminders = daysRemaining(p.id)
        toast.error(`⚠ Overdue: ${p.poNumber} — ${p.supplierName}`, {
          description: `${fmt(p.amountOwing)} outstanding · ${daysLate} day${daysLate === 1 ? "" : "s"} overdue · ${reminders} reminder${reminders === 1 ? "" : "s"} left`,
          duration: Infinity,
          action: { label: "Pay Now", onClick: () => { setSelectedPO(p); setDialogOpen(true) } },
        })
      })
      unpaid.filter(p => new Date(p.expectedDate!).toISOString().slice(0, 10) === todayISO).forEach(p => {
        if (!shouldShow(p.id)) return
        const reminders = daysRemaining(p.id)
        toast.warning(`📅 Payment due TODAY: ${p.poNumber} — ${p.supplierName}`, {
          description: `${fmt(p.amountOwing)} due today · ${reminders} reminder${reminders === 1 ? "" : "s"} left`,
          duration: Infinity,
          action: { label: "Pay Now", onClick: () => { setSelectedPO(p); setDialogOpen(true) } },
        })
      })
      unpaid.filter(p => {
        const dueDate = new Date(p.expectedDate!)
        const dueISO = dueDate.toISOString().slice(0, 10)
        const diff = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000)
        return diff > 0 && diff <= 3 && dueISO !== todayISO
      }).forEach(p => {
        if (!shouldShow(p.id)) return
        const diff = Math.ceil((new Date(p.expectedDate!).getTime() - now.getTime()) / 86_400_000)
        const reminders = daysRemaining(p.id)
        toast.info(`🔔 Payment due in ${diff} day${diff === 1 ? "" : "s"}: ${p.poNumber} — ${p.supplierName}`, {
          description: `${fmt(p.amountOwing)} due ${fmtDate(p.expectedDate)} · ${reminders} reminder${reminders === 1 ? "" : "s"} left`,
          duration: 8000,
          action: { label: "Pay Now", onClick: () => { setSelectedPO(p); setDialogOpen(true) } },
        })
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [payables])

  const filtered = useMemo(() => payables.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = p.supplierName.toLowerCase().includes(q) || p.poNumber.toLowerCase().includes(q) || (p.supplierPhone ?? "").includes(q)
    const isOverdue = p.expectedDate ? new Date(p.expectedDate) < new Date() && p.amountOwing > 0 : false
    const matchStatus = statusFilter === "ALL" ? true : statusFilter === "OVERDUE" ? isOverdue : p.paymentStatus === statusFilter
    return matchSearch && matchStatus
  }), [payables, search, statusFilter])

  const totalOwing   = payables.reduce((s, p) => s + p.amountOwing, 0)
  const totalPaid    = payables.reduce((s, p) => s + p.amountPaid, 0)
  const totalInvoice = payables.reduce((s, p) => s + p.totalAmount, 0)
  const overdueCount = payables.filter(p => p.expectedDate && new Date(p.expectedDate) < new Date() && p.amountOwing > 0).length
  const unpaidCount  = payables.filter(p => p.paymentStatus === "UNPAID").length
  const partialCount = payables.filter(p => p.paymentStatus === "PARTIAL").length
  const paidCount    = payables.filter(p => p.paymentStatus === "PAID").length

  const handlePayNow = (payable: SupplierPayable) => {
    setSelectedPO(payable)
    setDialogOpen(true)
  }

  const handlePaid = () => {
    // Force a fresh fetch of all server data
    router.refresh()
    // Also bump local key to re-render (optional)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Invoiced",  value: fmt(totalInvoice), color: "text-foreground" },
          { label: "Total Paid Out",  value: fmt(totalPaid),    color: "text-green-600" },
          { label: "Outstanding",     value: fmt(totalOwing),   color: "text-red-600" },
          { label: "Overdue POs",     value: String(overdueCount), color: "text-orange-600" },
          { label: "Total POs",       value: String(payables.length), color: "text-foreground" },
        ].map(c => (
          <Card key={c.label} className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge className="bg-red-50 text-red-700 border-red-200">{unpaidCount} Unpaid</Badge>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">{partialCount} Partial</Badge>
        <Badge className="bg-green-50 text-green-700 border-green-200">{paidCount} Paid</Badge>
        {overdueCount > 0 && <Badge className="bg-orange-50 text-orange-700 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />{overdueCount} Overdue</Badge>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search supplier, PO…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} of {payables.length} POs</span>
      </div>

      <Card>
        <ScrollArea className="max-h-[620px]">
          <Table key={refreshKey}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" /><TableHead>Supplier</TableHead><TableHead>PO #</TableHead>
                <TableHead className="text-right">PO Total</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Owing</TableHead><TableHead className="w-28">Progress</TableHead>
                <TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  {payables.length === 0 ? "No payables found — all supplier invoices are settled 🎉" : "No results match your search or filter."}
                </TableCell></TableRow>
              )}
              {filtered.map(payable => (
                <PayableRow key={payable.id} payable={payable} onPayNow={handlePayNow} />
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-4 py-3 flex flex-wrap gap-4 text-sm bg-muted/20">
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{payables.length}</strong> payables</span>
          <span className="font-semibold text-red-600 ml-auto">Outstanding: {fmt(filtered.reduce((s, p) => s + p.amountOwing, 0))}</span>
          <span className="font-semibold text-green-600">Paid: {fmt(filtered.reduce((s, p) => s + p.amountPaid, 0))}</span>
        </div>
      </Card>

      <PayNowDialog
        payable={selectedPO}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedPO(null) }}
        onPaid={handlePaid}
      />
    </div>
  )
}