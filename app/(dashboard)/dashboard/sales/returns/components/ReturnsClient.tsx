"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  RotateCcw, Search, MoreHorizontal, CheckCircle, XCircle,
  Clock, Package, TrendingDown, DollarSign, Eye, Ban, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import Link from "next/link"
import { approveSalesReturn, cancelSalesReturn, declineSalesReturn, getSalesReturns } from "@/actions/retuns"

// ─── Types ───────────────────────────────────────────────────────────────────

type ReturnStatus = "PENDING" | "APPROVED" | "RECEIVED" | "COMPLETED" | "DECLINED" | "CANCELLED"

interface ReturnLine {
  id: string
  quantity: number
  unitPrice: number
  condition: string
}

interface SalesReturn {
  id: string
  rmaNumber: string
  status: ReturnStatus
  reason: string | null
  refundAmount: number
  refundMethod: string | null
  createdAt: string
  receivedAt: string | null
  customer: { id: string; name: string; phone: string | null } | null
  location: { id: string; name: string }
  salesOrder: { id: string; orderNumber: string } | null
  createdBy: { id: string; name: string }
  lines: ReturnLine[]
}

interface Stats {
  totalReturns: number
  totalRefundValue: number
  completedCount: number
  pendingCount: number
}

interface Props {
  initialReturns: SalesReturn[]
  initialTotal: number
  stats: Stats | null
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Pending",   color: "bg-amber-100 text-amber-800 border-amber-200",  icon: Clock },
  APPROVED:  { label: "Approved",  color: "bg-blue-100 text-blue-800 border-blue-200",     icon: CheckCircle },
  RECEIVED:  { label: "Received",  color: "bg-purple-100 text-purple-800 border-purple-200", icon: Package },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle },
  DECLINED:  { label: "Declined",  color: "bg-red-100 text-red-800 border-red-200",        icon: XCircle },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700 border-gray-200",     icon: Ban },
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(amount)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnsClient({ initialReturns, initialTotal, stats }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [returns, setReturns] = useState<SalesReturn[]>(initialReturns)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [actionTarget, setActionTarget] = useState<{ id: string; action: "approve" | "decline" | "cancel" } | null>(null)

  const LIMIT = 20
  const totalPages = Math.ceil(total / LIMIT)

  // ── Fetch ──
  function fetchReturns(newSearch = search, newStatus = statusFilter, newPage = page) {
    startTransition(async () => {
      const res = await getSalesReturns(newPage, LIMIT, newSearch, newStatus)
      if (res.success) {
        setReturns(res.data as any)
        setTotal(res.total ?? 0)
      }
    })
  }

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
    fetchReturns(val, statusFilter, 1)
  }

  function handleStatusFilter(val: string) {
    setStatusFilter(val)
    setPage(1)
    fetchReturns(search, val, 1)
  }

  // ── Actions ──
  async function handleAction() {
    if (!actionTarget) return
    let res: any
    if (actionTarget.action === "approve") res = await approveSalesReturn(actionTarget.id)
    else if (actionTarget.action === "decline") res = await declineSalesReturn(actionTarget.id)
    else res = await cancelSalesReturn(actionTarget.id)

    if (res.success) {
      toast.success(`Return ${actionTarget.action}d successfully`)
      fetchReturns()
    } else {
      toast.error(res.error || "Action failed")
    }
    setActionTarget(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Returns"
          value={stats?.totalReturns ?? 0}
          icon={<RotateCcw className="h-5 w-5 text-indigo-500" />}
          sub="Last 30 days"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Refund Value"
          value={formatCurrency(stats?.totalRefundValue ?? 0)}
          icon={<DollarSign className="h-5 w-5 text-rose-500" />}
          sub="Last 30 days"
          bg="bg-rose-50"
        />
        <StatCard
          title="Completed"
          value={stats?.completedCount ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          sub="Restocked"
          bg="bg-green-50"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingCount ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          sub="Awaiting action"
          bg="bg-amber-50"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by RMA#, customer, reason…"
                className="pl-9"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchReturns()} disabled={isPending}>
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>RMA #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Refund Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <RotateCcw className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No returns found</p>
                      <p className="text-sm">Create a new return to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret) => {
                  const totalQty = ret.lines.reduce((s, l) => s + l.quantity, 0)
                  return (
                    <TableRow key={ret.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/dashboard/sales/returns/${ret.id}`)}>
                      <TableCell className="font-mono font-semibold text-sm">{ret.rmaNumber}</TableCell>
                      <TableCell>
                        {ret.customer ? (
                          <div>
                            <p className="font-medium text-sm">{ret.customer.name}</p>
                            {ret.customer.phone && <p className="text-xs text-muted-foreground">{ret.customer.phone}</p>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ret.salesOrder ? (
                          <span className="text-sm font-mono text-blue-600">{ret.salesOrder.orderNumber}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{totalQty} unit{totalQty !== 1 ? "s" : ""}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-rose-600">
                        {formatCurrency(ret.refundAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ret.location.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ret.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ret.status} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/sales/returns/${ret.id}`} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            {ret.status === "PENDING" && (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => setActionTarget({ id: ret.id, action: "approve" })}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            {["PENDING", "APPROVED"].includes(ret.status) && (
                              <>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setActionTarget({ id: ret.id, action: "decline" })}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Decline
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-gray-600"
                                  onClick={() => setActionTarget({ id: ret.id, action: "cancel" })}
                                >
                                  <Ban className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); fetchReturns(search, statusFilter, page - 1) }}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => { setPage(p => p + 1); fetchReturns(search, statusFilter, page + 1) }}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "approve" ? "Approve Return?" :
               actionTarget?.action === "decline" ? "Decline Return?" : "Cancel Return?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "approve"
                ? "The return will be marked as approved. The customer can then ship items back."
                : actionTarget?.action === "decline"
                ? "The return request will be declined. This cannot be undone."
                : "This return will be cancelled and no inventory changes will be made."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionTarget?.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ title, value, icon, sub, bg }: {
  title: string; value: string | number; icon: React.ReactNode; sub: string; bg: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}