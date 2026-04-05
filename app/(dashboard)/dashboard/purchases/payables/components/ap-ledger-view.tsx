"use client"

// ============================================================
// AP LEDGER VIEW
// File: app/dashboard/purchases/payables/components/ap-ledger-view.tsx
//
// Full audit trail of every AP event — goods received,
// payments made, cancellations. Mirrors ledger-view.tsx.
// ============================================================

import { useState, useMemo } from "react"
import { Badge }  from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card }   from "@/components/ui/card"
import { Input }  from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Download, Search, Package, Banknote, XCircle,
  ArrowUpDown, Building2, CheckCircle2, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { APLedgerEntry, APLedgerSummary, APCsvRow } from "@/actions/supplier-payables"
import { exportAPLedgerToCsv } from "@/actions/supplier-payables"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0)

// ── Event type styling ────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  GOODS_RECEIVED: {
    label: "Goods Received",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon:  <Package className="w-3 h-3" />,
  },
  PAYMENT_MADE: {
    label: "Payment Made",
    color: "bg-green-100 text-green-800 border-green-200",
    icon:  <Banknote className="w-3 h-3" />,
  },
  PO_CANCELLED: {
    label: "PO Cancelled",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon:  <XCircle className="w-3 h-3" />,
  },
  PAYMENT_VOIDED: {
    label: "Voided",
    color: "bg-red-100 text-red-700 border-red-200",
    icon:  <AlertCircle className="w-3 h-3" />,
  },
}

function EventBadge({ type }: { type: string }) {
  const cfg = EVENT_CONFIG[type] ?? { label: type.replace(/_/g, " "), color: "bg-muted text-muted-foreground", icon: null }
  return <Badge className={`${cfg.color} gap-1 text-xs`}>{cfg.icon}{cfg.label}</Badge>
}

// ── Main Component ────────────────────────────────────────────────────────────

interface APLedgerViewProps {
  entries:    APLedgerEntry[]
  summary:    APLedgerSummary
  exportRows: APCsvRow[]
}

export default function APLedgerView({ entries, summary, exportRows }: APLedgerViewProps) {
  const [search,       setSearch]       = useState("")
  const [eventFilter,  setEventFilter]  = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const filtered = useMemo(() => entries.filter(e => {
    const matchSearch =
      e.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      e.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      (e.reference ?? "").toLowerCase().includes(search.toLowerCase())
    const matchEvent  = eventFilter  === "ALL" || e.eventType === eventFilter
    const matchStatus = statusFilter === "ALL" || e.paymentStatus === statusFilter
    return matchSearch && matchEvent && matchStatus
  }), [entries, search, eventFilter, statusFilter])

  const handleExport = async () => {
    try {
      const csv = await exportAPLedgerToCsv(exportRows)
      const a = Object.assign(document.createElement("a"), {
        href:     URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
        download: `ap-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      })
      a.click(); URL.revokeObjectURL(a.href)
      toast.success("AP ledger exported")
    } catch {
      toast.error("Failed to export ledger")
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Invoiced",  value: fmt(summary.totalPayables),    color: "text-foreground" },
          { label: "Total Paid Out",  value: fmt(summary.totalPaid),         color: "text-green-600" },
          { label: "Outstanding",     value: fmt(summary.totalOutstanding),  color: "text-red-600" },
          { label: "Cancelled",       value: fmt(summary.totalCancelled),    color: "text-gray-500" },
          { label: "Active Creditors",value: String(summary.activeCreditors), color: "text-foreground" },
        ].map(c => (
          <Card key={c.label} className="p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Status counts */}
      <div className="flex gap-2 flex-wrap">
        <Badge className="bg-red-50 text-red-700 border-red-200">{summary.unpaidCount} Unpaid</Badge>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">{summary.partialCount} Partial</Badge>
        <Badge className="bg-green-50 text-green-700 border-green-200">{summary.paidCount} Paid</Badge>
        <Badge className="bg-orange-50 text-orange-700 border-orange-200">{summary.overdueCount} Overdue</Badge>
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">{summary.activeCreditors} Active Creditors</Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search supplier, PO, ref…"
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Events</SelectItem>
              <SelectItem value="GOODS_RECEIVED">Goods Received</SelectItem>
              <SelectItem value="PAYMENT_MADE">Payments Made</SelectItem>
              <SelectItem value="PO_CANCELLED">Cancellations</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead>Supplier</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead className="text-right">PO Total</TableHead>
                <TableHead className="text-right">This Payment</TableHead>
                <TableHead className="text-right">Still Owe</TableHead>
                <TableHead>Method / Ref</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No ledger entries found</TableCell></TableRow>
              )}
              {filtered.map(entry => (
                <TableRow
                  key={entry.id}
                  className={
                    entry.eventType === "PAYMENT_MADE"  ? "bg-green-50/30"  :
                    entry.eventType === "PO_CANCELLED"  ? "bg-gray-50/60 opacity-70" : ""
                  }
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{entry.date}</TableCell>
                  <TableCell><EventBadge type={entry.eventType} /></TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{entry.supplierName}</p>
                    {entry.supplierPhone && <p className="text-xs text-muted-foreground">{entry.supplierPhone}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.poNumber}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(entry.poTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.eventType === "PAYMENT_MADE"
                      ? <span className="text-green-700">−{fmt(entry.amountPaid)}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={entry.amountOwing > 0 ? "text-red-600" : "text-green-600"}>
                      {entry.amountOwing > 0 ? fmt(entry.amountOwing) : "Paid ✓"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.paymentMethod && <p className="text-xs font-medium">{entry.paymentMethod.replace(/_/g, " ")}</p>}
                    {entry.reference && <p className="text-xs text-muted-foreground truncate max-w-[100px]" title={entry.reference}>{entry.reference}</p>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.recordedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-4 py-3 flex gap-4 text-sm bg-muted/20">
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{entries.length}</strong> entries</span>
          <span className="ml-auto font-semibold text-green-600">
            Payments made: {fmt(
              filtered.filter(e => e.eventType === "PAYMENT_MADE").reduce((s, e) => s + e.amountPaid, 0)
            )}
          </span>
        </div>
      </Card>
    </div>
  )
}