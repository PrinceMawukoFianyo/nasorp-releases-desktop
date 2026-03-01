"use client"

// app/dashboard/reports/components/stock-movement/StockMovementReport.tsx
// Drop this in to replace the existing component.
// KEY CHANGES:
//   • RETURN transactions are shown with a teal "Return" badge
//   • New "Returns" summary card in the header stats
//   • Return rows link to the RMA detail page

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Package, Search,
  Download, RotateCcw, ShoppingCart, Truck, Wrench, ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

// ─── Types (mirror server type) ───────────────────────────────────────────────
type MovementType =
  | "PURCHASE"
  | "SALE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "RETURN"

interface StockMovementEntry {
  id: string; date: string; type: MovementType
  itemId: string; itemName: string; itemSku: string
  quantity: number; locationId: string; locationName: string
  referenceNumber: string | null; notes: string | null
  performedBy: string
  returnId?: string; returnRmaNumber?: string; condition?: string
}

interface Props {
  data: {
    movements: StockMovementEntry[]
    summary: {
      totalIn: number; totalOut: number; totalPurchases: number; totalSales: number
      totalTransferIn: number; totalTransferOut: number
      totalAdjustmentIn: number; totalAdjustmentOut: number
      totalReturns: number; totalReturnValue: number; netMovement: number
    }
    topItems: { itemId: string; itemName: string; totalMovement: number }[]
    dateRange: { from: string; to: string }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<MovementType, { label: string; icon: any; color: string; isIn: boolean }> = {
  PURCHASE:       { label: "Purchase",      icon: ShoppingCart,    color: "bg-blue-100 text-blue-800",     isIn: true  },
  SALE:           { label: "Sale",          icon: TrendingDown,    color: "bg-orange-100 text-orange-800", isIn: false },
  TRANSFER_IN:    { label: "Transfer In",   icon: ArrowLeftRight,  color: "bg-violet-100 text-violet-800", isIn: true  },
  TRANSFER_OUT:   { label: "Transfer Out",  icon: ArrowLeftRight,  color: "bg-violet-100 text-violet-800", isIn: false },
  ADJUSTMENT_IN:  { label: "Adj. In",       icon: Wrench,          color: "bg-yellow-100 text-yellow-800", isIn: true  },
  ADJUSTMENT_OUT: { label: "Adj. Out",      icon: Wrench,          color: "bg-yellow-100 text-yellow-800", isIn: false },
  RETURN:         { label: "Return",        icon: RotateCcw,       color: "bg-teal-100 text-teal-800",     isIn: true  },
}

const CONDITION_COLOR: Record<string, string> = {
  GOOD:      "bg-green-100 text-green-700",
  DAMAGED:   "bg-orange-100 text-orange-700",
  DEFECTIVE: "bg-red-100 text-red-700",
}

function TypeBadge({ type }: { type: MovementType }) {
  const cfg = TYPE_CONFIG[type]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StockMovementReport({ data }: Props) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")

  const filtered = useMemo(() => {
    return data.movements.filter((m) => {
      const matchType = typeFilter === "ALL" || m.type === typeFilter
      const matchSearch = !search ||
        m.itemName.toLowerCase().includes(search.toLowerCase()) ||
        m.itemSku.toLowerCase().includes(search.toLowerCase()) ||
        (m.referenceNumber?.toLowerCase().includes(search.toLowerCase())) ||
        m.locationName.toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [data.movements, search, typeFilter])

  const s = data.summary

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Movement Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(data.dateRange.from), "dd MMM yyyy")} — {format(new Date(data.dateRange.to), "dd MMM yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<ArrowUpCircle className="h-5 w-5 text-green-600" />}
          title="Total In" value={s.totalIn.toString()} bg="bg-green-50"
        />
        <SummaryCard
          icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />}
          title="Total Out" value={s.totalOut.toString()} bg="bg-red-50"
        />
        <SummaryCard
          icon={<TrendingUp className={`h-5 w-5 ${s.netMovement >= 0 ? "text-green-600" : "text-red-500"}`} />}
          title="Net Movement"
          value={(s.netMovement >= 0 ? "+" : "") + s.netMovement.toString()}
          bg={s.netMovement >= 0 ? "bg-green-50" : "bg-red-50"}
        />
        <SummaryCard
          icon={<RotateCcw className="h-5 w-5 text-teal-600" />}
          title="Returns"
          value={`${s.totalReturns} units`}
          sub={fmtCurrency(s.totalReturnValue)}
          bg="bg-teal-50"
        />
        <SummaryCard
          icon={<Package className="h-5 w-5 text-indigo-500" />}
          title="Transactions"
          value={data.movements.length.toString()}
          bg="bg-indigo-50"
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
        {[
          { label: "Purchases",    val: s.totalPurchases,     color: "text-blue-700" },
          { label: "Sales",        val: s.totalSales,         color: "text-orange-700" },
          { label: "Transfer In",  val: s.totalTransferIn,    color: "text-violet-700" },
          { label: "Transfer Out", val: s.totalTransferOut,   color: "text-violet-700" },
          { label: "Adj. In",      val: s.totalAdjustmentIn,  color: "text-yellow-700" },
          { label: "Adj. Out",     val: s.totalAdjustmentOut, color: "text-yellow-700" },
          { label: "Returns",      val: s.totalReturns,       color: "text-teal-700" },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search item, SKU, reference…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground shrink-0">{filtered.length} records</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes / Details</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No movements found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const isIn = TYPE_CONFIG[m.type]?.isIn
                    return (
                      <TableRow
                        key={m.id}
                        className={`hover:bg-muted/20 ${m.type === "RETURN" ? "bg-teal-50/30" : ""}`}
                      >
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.date), "dd MMM yy, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={m.type} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{m.itemName}</p>
                            <p className="text-xs text-muted-foreground">{m.itemSku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${isIn ? "text-green-700" : "text-red-600"}`}>
                            {isIn ? "+" : "−"}{m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{m.locationName}</TableCell>
                        <TableCell>
                          {m.type === "RETURN" && m.returnId ? (
                            <Link
                              href={`/dashboard/sales/returns/${m.returnId}`}
                              className="font-mono text-xs text-teal-700 hover:underline font-semibold"
                            >
                              {m.returnRmaNumber}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                              {m.referenceNumber || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-1">
                            {m.notes && <span className="text-muted-foreground text-xs">{m.notes}</span>}
                            {m.condition && m.type === "RETURN" && (
                              <span className={`px-1.5 py-0.5 rounded text-xs inline-block w-fit ${CONDITION_COLOR[m.condition] || CONDITION_COLOR.GOOD}`}>
                                {m.condition}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.performedBy}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ icon, title, value, sub, bg }: {
  icon: React.ReactNode; title: string; value: string; sub?: string; bg: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}