"use client"

// ============================================================
// CREDITORS VIEW
// File: app/dashboard/purchases/payables/components/creditors-view.tsx
//
// Suppliers ranked by total we owe — mirrors debtors-view.tsx.
// Expand a supplier to see the individual POs.
// ============================================================

import { useState } from "react"
import { Badge }    from "@/components/ui/badge"
import { Button }   from "@/components/ui/button"
import { Card }     from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea }  from "@/components/ui/scroll-area"
import { Input }       from "@/components/ui/input"
import { Progress }    from "@/components/ui/progress"
import {
  ChevronDown, ChevronRight, AlertCircle, Phone, Mail,
  Search, FileText, Printer, Building2,
} from "lucide-react"
import type { CreditorSummary } from "@/actions/supplier-payables"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0)

interface CreditorsViewProps {
  creditors: CreditorSummary[]
  onPayNow: (payableId: string) => void
}

export default function CreditorsView({ creditors, onPayNow }: CreditorsViewProps) {
  const [search,     setSearch]     = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = creditors.filter(c =>
    c.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    (c.supplierPhone ?? "").includes(search)
  )

  const totalOwing   = creditors.reduce((s, c) => s + c.totalOwing, 0)
  const overdueCount = creditors.filter(c => c.overdueCount > 0).length

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Suppliers We Owe</p>
          <p className="text-2xl font-bold">{creditors.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total We Owe</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalOwing)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Overdue Suppliers</p>
          <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search supplier or phone…"
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Creditors table */}
      <Card>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total We Owe</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Overdue</TableHead>
                <TableHead>Expected Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {creditors.length === 0 ? "No outstanding payables 🎉" : "No suppliers found"}
                </TableCell></TableRow>
              )}
              {filtered.map(creditor => {
                const isExpanded = expandedId === creditor.supplierId
                const hasOverdue = creditor.overdueCount > 0
                const paidPct    = Math.min(100, Math.round(
                  creditor.totalPaid / (creditor.totalPaid + creditor.totalOwing) * 100
                ))

                return (
                  <>
                    <TableRow
                      key={creditor.supplierId}
                      className={`cursor-pointer hover:bg-muted/30 ${hasOverdue ? "bg-red-50/40" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : creditor.supplierId)}
                    >
                      <TableCell>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-medium">{creditor.supplierName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {creditor.supplierPhone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />{creditor.supplierPhone}
                                </span>
                              )}
                              {creditor.supplierEmail && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="w-3 h-3" />{creditor.supplierEmail}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 w-32">
                              <Progress value={paidPct} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">{fmt(creditor.totalOwing)}</TableCell>
                      <TableCell className="text-right text-green-700 font-medium">{fmt(creditor.totalPaid)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{creditor.orderCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {creditor.overdueCount > 0
                          ? <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />{creditor.overdueCount}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {creditor.oldestDueDate
                          ? <span className={`text-sm ${new Date(creditor.oldestDueDate) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {new Date(creditor.oldestDueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                    </TableRow>

                    {/* Expanded: orders */}
                    {isExpanded && (
                      <TableRow key={`${creditor.supplierId}-orders`} className="bg-muted/10">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-8 py-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Purchase Orders — {creditor.supplierName}
                            </p>
                            {creditor.orders.map(order => (
                              <div
                                key={order.id}
                                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                                  order.isOverdue ? "border-red-200 bg-red-50/60" : "border-border bg-background"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-xs font-semibold">{order.poNumber}</span>
                                  {order.expectedDate && (
                                    <span className={`text-xs ${order.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                      Expected: {order.expectedDate}{order.isOverdue && " ⚠"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-semibold text-red-600">{fmt(order.amountOwing)} owing</p>
                                    <p className="text-xs text-muted-foreground">{fmt(order.amountPaid)} paid of {fmt(order.orderTotal)}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs gap-1 bg-rose-600 hover:bg-rose-700"
                                      onClick={e => { e.stopPropagation(); onPayNow(order.id) }}
                                    >
                                      Pay
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      title="View PO"
                                      onClick={e => { e.stopPropagation(); window.open(`/dashboard/purchases/purchase-orders?po=${order.id}`, "_blank") }}
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      title="Print Receipt"
                                      onClick={e => { e.stopPropagation(); window.open(`/dashboard/purchases/payables/${order.id}/print`, "_blank") }}
                                    >
                                      <Printer className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
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
        <div className="border-t px-4 py-3 flex gap-4 text-sm bg-muted/20">
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{creditors.length}</strong> suppliers</span>
          <span className="ml-auto font-semibold text-red-600">Total Owed: {fmt(filtered.reduce((s, c) => s + c.totalOwing, 0))}</span>
        </div>
      </Card>
    </div>
  )
}