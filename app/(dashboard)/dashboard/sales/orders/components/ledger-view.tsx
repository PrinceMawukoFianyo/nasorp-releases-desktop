"use client"

// ============================================================
// LEDGER VIEW
// File: app/dashboard/sales/orders/components/ledger-view.tsx
//
// Full audit trail of every credit event — order created,
// payments received, voids, refunds. Powered by getCreditLedger().
// ============================================================

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Download, Search, FileText, ShoppingCart, Banknote, XCircle,
  RotateCcw, AlertCircle, ArrowUpDown,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "../so-utils"
import type { LedgerEntry, CreditLedgerSummary, CsvRow } from "@/actions/credit-ledger"
import { exportLedgerToCsv } from "@/actions/credit-ledger"

// ── Event type styling ─────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ORDER_CREATED:    { label: "Credit Order",    color: "bg-blue-100 text-blue-800 border-blue-200",   icon: <ShoppingCart className="w-3 h-3" /> },
  PAYMENT_RECEIVED: { label: "Payment",          color: "bg-green-100 text-green-800 border-green-200", icon: <Banknote className="w-3 h-3" /> },
  ORDER_CANCELLED:  { label: "Cancelled",        color: "bg-gray-100 text-gray-700 border-gray-200",   icon: <XCircle className="w-3 h-3" /> },
  RETURN_REFUND:    { label: "Refund",           color: "bg-purple-100 text-purple-800 border-purple-200", icon: <RotateCcw className="w-3 h-3" /> },
  PAYMENT_VOIDED:   { label: "Voided",           color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertCircle className="w-3 h-3" /> },
  STATUS_CHANGE:    { label: "Status Change",    color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <ArrowUpDown className="w-3 h-3" /> },
}

function EventBadge({ type }: { type: string }) {
  const cfg = EVENT_CONFIG[type] ?? { label: type, color: "bg-muted text-muted-foreground", icon: null }
  return (
    <Badge className={`${cfg.color} gap-1 text-xs`}>
      {cfg.icon}{cfg.label}
    </Badge>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface LedgerViewProps {
  entries: LedgerEntry[]
  summary: CreditLedgerSummary
  exportRows: CsvRow[]
}

export default function LedgerView({ entries, summary, exportRows }: LedgerViewProps) {
  const [search, setSearch]           = useState("")
  const [eventFilter, setEventFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const filtered = useMemo(() => entries.filter(e => {
    const matchSearch =
      e.customerName.toLowerCase().includes(search.toLowerCase()) ||
      e.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (e.reference ?? "").toLowerCase().includes(search.toLowerCase())
    const matchEvent  = eventFilter  === "ALL" || e.eventType === eventFilter
    const matchStatus = statusFilter === "ALL" || e.paymentStatus === statusFilter
    return matchSearch && matchEvent && matchStatus
  }), [entries, search, eventFilter, statusFilter])

  const handleExport = async () => {
    try {
      const csv = await exportLedgerToCsv(exportRows)
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
        download: `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      })
      a.click(); URL.revokeObjectURL(a.href)
      toast.success("Ledger exported")
    } catch {
      toast.error("Failed to export ledger")
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Credit Given",    value: formatCurrency(summary.totalCreditGiven),  color: "text-foreground" },
          { label: "Collected",       value: formatCurrency(summary.totalCollected),     color: "text-green-600" },
          { label: "Outstanding",     value: formatCurrency(summary.totalOutstanding),   color: "text-red-600" },
          { label: "Cancelled",       value: formatCurrency(summary.totalCancelled),     color: "text-gray-500" },
          { label: "Refunded",        value: formatCurrency(summary.totalRefunded),      color: "text-purple-600" },
        ].map(c => (
          <Card key={c.label} className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Status counts */}
      <div className="flex gap-2 flex-wrap">
        <Badge className="bg-red-50 text-red-700 border-red-200">{summary.pendingCount} Unpaid</Badge>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">{summary.partialCount} Partial</Badge>
        <Badge className="bg-green-50 text-green-700 border-green-200">{summary.paidCount} Paid</Badge>
        <Badge className="bg-orange-50 text-orange-700 border-orange-200">{summary.overdueCount} Overdue</Badge>
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">{summary.activeDebtors} Active Debtors</Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, order, ref…"
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Events</SelectItem>
              <SelectItem value="ORDER_CREATED">Credit Orders</SelectItem>
              <SelectItem value="PAYMENT_RECEIVED">Payments</SelectItem>
              <SelectItem value="ORDER_CANCELLED">Cancellations</SelectItem>
              <SelectItem value="RETURN_REFUND">Refunds</SelectItem>
              <SelectItem value="PAYMENT_VOIDED">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" />Export Full Ledger
        </Button>
      </div>

      {/* Ledger table */}
      <Card>
        <ScrollArea className="max-h-[560px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead className="text-right">Order Total</TableHead>
                <TableHead className="text-right">This Payment</TableHead>
                <TableHead className="text-right">Still Owing</TableHead>
                <TableHead>Method / Ref</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Docs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No ledger entries found</TableCell></TableRow>
              )}
              {filtered.map(entry => (
                <TableRow
                  key={entry.id}
                  className={entry.eventType === "PAYMENT_RECEIVED" ? "bg-green-50/30" :
                             entry.eventType === "ORDER_CANCELLED"  ? "bg-gray-50/60 opacity-70" :
                             entry.eventType === "PAYMENT_VOIDED"   ? "bg-red-50/40" : ""}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{entry.date}</TableCell>
                  <TableCell><EventBadge type={entry.eventType} /></TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{entry.customerName}</p>
                    {entry.customerPhone && <p className="text-xs text-muted-foreground">{entry.customerPhone}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.orderNumber}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(entry.orderTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.eventType === "PAYMENT_RECEIVED"
                      ? <span className="text-green-700">+{formatCurrency(entry.amountPaid)}</span>
                      : entry.eventType === "ORDER_CREATED"
                      ? <span className="text-muted-foreground text-xs">—</span>
                      : <span className="text-red-600">{formatCurrency(entry.amountPaid)}</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={entry.amountOwing > 0 ? "text-red-600" : "text-green-600"}>
                      {entry.amountOwing > 0 ? formatCurrency(entry.amountOwing) : "Paid ✓"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.paymentMethod && (
                      <p className="text-xs font-medium">{entry.paymentMethod.replace("_", " ")}</p>
                    )}
                    {entry.reference && (
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]" title={entry.reference}>{entry.reference}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.recordedBy ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title="Invoice"
                        onClick={() => window.open(`/dashboard/sales/orders/${entry.orderId}/invoice`, "_blank")}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-4 py-3 flex gap-4 text-sm bg-muted/20">
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{entries.length}</strong> entries</span>
          <span className="ml-auto font-semibold text-green-600">
            Payments shown: {formatCurrency(
              filtered.filter(e => e.eventType === "PAYMENT_RECEIVED").reduce((s, e) => s + e.amountPaid, 0)
            )}
          </span>
        </div>
      </Card>
    </div>
  )
}