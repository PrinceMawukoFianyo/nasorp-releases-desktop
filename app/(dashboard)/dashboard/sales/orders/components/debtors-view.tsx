"use client"

// ============================================================
// DEBTORS VIEW
// File: app/dashboard/sales/orders/components/debtors-view.tsx
//
// Uses getDebtorsList() — customers ranked by total owed,
// overdue first. Expand each customer to see their orders.
// ============================================================

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  ChevronDown, ChevronRight, AlertCircle, Phone, Mail,
  Search, FileText, Receipt,
} from "lucide-react"
import { formatCurrency } from "../so-utils"
import type { DebtorSummary } from "@/actions/credit-ledger"

interface DebtorsViewProps {
  debtors: DebtorSummary[]
  onPayNow: (orderId: string, customerName: string, amountOwing: number) => void
}

export default function DebtorsView({ debtors, onPayNow }: DebtorsViewProps) {
  const [search, setSearch]         = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = debtors.filter(d =>
    d.customerName.toLowerCase().includes(search.toLowerCase()) ||
    (d.customerPhone ?? "").includes(search)
  )

  const totalOwing = debtors.reduce((s, d) => s + d.totalOwing, 0)
  const overdueCustomers = debtors.filter(d => d.overdueCount > 0).length

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Customers Owing</p>
          <p className="text-2xl font-bold">{debtors.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOwing)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Customers Overdue</p>
          <p className="text-2xl font-bold text-orange-600">{overdueCustomers}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customer or phone…"
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Debtors table */}
      <Card>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total Owing</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Overdue</TableHead>
                <TableHead>Oldest Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No debtors found</TableCell></TableRow>
              )}
              {filtered.map(debtor => {
                const isExpanded = expandedId === debtor.customerId
                const hasOverdue = debtor.overdueCount > 0
                const paidPct = Math.min(100, Math.round(debtor.totalPaid / (debtor.totalPaid + debtor.totalOwing) * 100))

                return (
                  <>
                    <TableRow
                      key={debtor.customerId}
                      className={`cursor-pointer hover:bg-muted/30 ${hasOverdue ? "bg-red-50/40" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : debtor.customerId)}
                    >
                      <TableCell>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{debtor.customerName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {debtor.customerPhone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />{debtor.customerPhone}
                            </span>
                          )}
                          {debtor.customerEmail && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />{debtor.customerEmail}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 w-32">
                          <Progress value={paidPct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(debtor.totalOwing)}</TableCell>
                      <TableCell className="text-right text-green-700 font-medium">{formatCurrency(debtor.totalPaid)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{debtor.orderCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {debtor.overdueCount > 0
                          ? <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />{debtor.overdueCount}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {debtor.oldestDueDate
                          ? <span className={`text-sm ${new Date(debtor.oldestDueDate) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {new Date(debtor.oldestDueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                    </TableRow>

                    {/* Expanded: customer's individual orders */}
                    {isExpanded && (
                      <TableRow key={`${debtor.customerId}-orders`} className="bg-muted/10">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-8 py-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Orders for {debtor.customerName}
                            </p>
                            {debtor.orders.map(order => (
                              <div
                                key={order.id}
                                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                                  order.isOverdue ? "border-red-200 bg-red-50/60" : "border-border bg-background"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-xs font-semibold">{order.orderNumber}</span>
                                  <span className="text-muted-foreground">{order.location}</span>
                                  {order.deliveryDate && (
                                    <span className={`text-xs ${order.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                      Due: {order.deliveryDate}
                                      {order.isOverdue && " ⚠"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-semibold text-red-600">{formatCurrency(order.amountOwing)} owing</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(order.amountPaid)} paid of {formatCurrency(order.orderTotal)}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={e => { e.stopPropagation(); onPayNow(order.id, debtor.customerName, order.amountOwing) }}
                                    >
                                      Pay
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={e => { e.stopPropagation(); window.open(`/dashboard/sales/orders/${order.id}/invoice`, "_blank") }}
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={e => { e.stopPropagation(); window.open(`/dashboard/sales/orders/${order.id}/receipt`, "_blank") }}
                                    >
                                      <Receipt className="w-3 h-3" />
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
          <span className="text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{debtors.length}</strong> customers</span>
          <span className="ml-auto font-semibold text-red-600">Total Outstanding: {formatCurrency(filtered.reduce((s, d) => s + d.totalOwing, 0))}</span>
        </div>
      </Card>
    </div>
  )
}