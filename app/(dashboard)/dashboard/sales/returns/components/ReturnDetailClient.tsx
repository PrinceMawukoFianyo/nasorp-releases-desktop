"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  CheckCircle, XCircle, Clock, Package, Ban, Inbox,
  User, MapPin, ShoppingCart, CreditCard, Calendar,
  RotateCcw, AlertTriangle, TrendingDown,
} from "lucide-react"
import { format } from "date-fns"
import { approveSalesReturn, cancelSalesReturn, declineSalesReturn, receiveSalesReturn } from "@/actions/retuns"


// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus = "PENDING" | "APPROVED" | "RECEIVED" | "COMPLETED" | "DECLINED" | "CANCELLED"

interface ReturnLine {
  id: string
  quantity: number
  unitPrice: number
  condition: string | null
  restockable: boolean
  notes: string | null
  serialNumbers: string[]
  item: {
    id: string; name: string; sku: string; thumbnail?: string | null
    sellingPrice: number; category?: { title: string } | null
  }
}

interface SalesReturnData {
  id: string
  rmaNumber: string
  status: ReturnStatus
  reason: string | null
  notes: string | null
  refundAmount: number
  refundMethod: string | null
  createdAt: string
  receivedAt: string | null
  customer: { id: string; name: string; email?: string | null; phone?: string | null } | null
  location: { id: string; name: string }
  salesOrder: { id: string; orderNumber: string } | null
  createdBy: { id: string; name: string; email: string }
  approvedBy: { id: string; name: string; email: string } | null
  lines: ReturnLine[]
}

// ─── Status Configs ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Pending",   color: "bg-amber-100 text-amber-800 border-amber-200",   icon: Clock },
  APPROVED:  { label: "Approved",  color: "bg-blue-100 text-blue-800 border-blue-200",      icon: CheckCircle },
  RECEIVED:  { label: "Received",  color: "bg-purple-100 text-purple-800 border-purple-200", icon: Package },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200",   icon: CheckCircle },
  DECLINED:  { label: "Declined",  color: "bg-red-100 text-red-800 border-red-200",         icon: XCircle },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700 border-gray-200",      icon: Ban },
}

const CONDITION_BADGE: Record<string, string> = {
  GOOD:      "bg-green-100 text-green-800",
  DAMAGED:   "bg-orange-100 text-orange-800",
  DEFECTIVE: "bg-red-100 text-red-800",
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n)
}

// ─── Timeline Item ─────────────────────────────────────────────────────────────
function TimelineItem({ icon: Icon, label, sub, active }: {
  icon: any; label: string; sub?: string; active: boolean
}) {
  return (
    <div className={`flex items-start gap-3 ${active ? "opacity-100" : "opacity-30"}`}>
      <div className={`mt-0.5 p-1.5 rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReturnDetailClient({ returnData }: { returnData: SalesReturnData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<"approve" | "decline" | "cancel" | "receive" | null>(null)
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    Object.fromEntries(returnData.lines.map((l) => [l.id, l.quantity]))
  )

  const cfg = STATUS_CONFIG[returnData.status] || STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon

  const canApprove  = returnData.status === "PENDING"
  const canDecline  = ["PENDING", "APPROVED"].includes(returnData.status)
  const canCancel   = ["PENDING", "APPROVED"].includes(returnData.status)
  const canReceive  = returnData.status === "APPROVED"

  async function handleAction() {
    if (!dialog) return

    startTransition(async () => {
      let res: any

      if (dialog === "approve")  res = await approveSalesReturn(returnData.id)
      else if (dialog === "decline") res = await declineSalesReturn(returnData.id)
      else if (dialog === "cancel")  res = await cancelSalesReturn(returnData.id)
      else if (dialog === "receive") {
        res = await receiveSalesReturn(
          returnData.id,
          returnData.lines.map((l) => ({ lineId: l.id, receivedQty: receivedQtys[l.id] ?? 0 }))
        )
      }

      if (res?.success) {
        toast.success(
          dialog === "receive"
            ? "Items received and inventory updated!"
            : `Return ${dialog}d successfully`
        )
        router.refresh()
      } else {
        toast.error(res?.error || "Action failed")
      }
      setDialog(null)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left Column ── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Status Banner */}
        <Card className={`border-l-4 ${
          returnData.status === "COMPLETED" ? "border-l-green-500" :
          returnData.status === "APPROVED"  ? "border-l-blue-500" :
          returnData.status === "DECLINED"  ? "border-l-red-500" :
          returnData.status === "CANCELLED" ? "border-l-gray-400" :
          "border-l-amber-500"
        }`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${cfg.color}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{returnData.rmaNumber}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {canApprove && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setDialog("approve")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
                {canReceive && (
                  <Button size="sm" onClick={() => setDialog("receive")}>
                    <Inbox className="h-4 w-4 mr-1" /> Receive Items
                  </Button>
                )}
                {canDecline && (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDialog("decline")}>
                    <XCircle className="h-4 w-4 mr-1" /> Decline
                  </Button>
                )}
                {canCancel && (
                  <Button size="sm" variant="outline" onClick={() => setDialog("cancel")}>
                    <Ban className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Lines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Returned Items ({returnData.lines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Restockable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnData.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {line.item.thumbnail ? (
                            <img src={line.item.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{line.item.name}</p>
                          <p className="text-xs text-muted-foreground">{line.item.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-600">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_BADGE[line.condition || "GOOD"] || CONDITION_BADGE.GOOD}`}>
                        {line.condition || "GOOD"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {line.restockable ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end items-center gap-8 p-4 border-t bg-muted/20">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Refund Value</p>
                <p className="text-xl font-bold text-rose-600">{formatCurrency(returnData.refundAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reason & Notes */}
        {(returnData.reason || returnData.notes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reason & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {returnData.reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Return Reason</p>
                  <p className="text-sm">{returnData.reason}</p>
                </div>
              )}
              {returnData.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Internal Notes</p>
                  <p className="text-sm text-muted-foreground">{returnData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Right Column ── */}
      <div className="space-y-4">
        {/* Info Cards */}
        <InfoCard icon={<User className="h-4 w-4" />} title="Customer">
          {returnData.customer ? (
            <div>
              <p className="font-medium">{returnData.customer.name}</p>
              {returnData.customer.phone && <p className="text-sm text-muted-foreground">{returnData.customer.phone}</p>}
              {returnData.customer.email && <p className="text-sm text-muted-foreground">{returnData.customer.email}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Walk-in / No customer</p>
          )}
        </InfoCard>

        {returnData.salesOrder && (
          <InfoCard icon={<ShoppingCart className="h-4 w-4" />} title="Original Order">
            <p className="font-mono font-semibold text-blue-600">{returnData.salesOrder.orderNumber}</p>
          </InfoCard>
        )}

        <InfoCard icon={<MapPin className="h-4 w-4" />} title="Return Location">
          <p className="font-medium">{returnData.location.name}</p>
          <p className="text-xs text-muted-foreground">Stock will be returned here</p>
        </InfoCard>

        {returnData.refundMethod && (
          <InfoCard icon={<CreditCard className="h-4 w-4" />} title="Refund Method">
            <p className="font-medium">{returnData.refundMethod.replace(/_/g, " ")}</p>
          </InfoCard>
        )}

        <InfoCard icon={<Calendar className="h-4 w-4" />} title="Dates">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(returnData.createdAt), "dd MMM yyyy")}</span>
            </div>
            {returnData.receivedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="text-green-600 font-medium">{format(new Date(returnData.receivedAt), "dd MMM yyyy")}</span>
              </div>
            )}
          </div>
        </InfoCard>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TimelineItem icon={Clock} label="Created" sub={`by ${returnData.createdBy.name}`} active={true} />
            <TimelineItem icon={CheckCircle} label="Approved" sub={returnData.approvedBy ? `by ${returnData.approvedBy.name}` : undefined} active={["APPROVED","RECEIVED","COMPLETED"].includes(returnData.status)} />
            <TimelineItem icon={Inbox} label="Items Received" sub={returnData.receivedAt ? format(new Date(returnData.receivedAt), "dd MMM yyyy") : undefined} active={["RECEIVED","COMPLETED"].includes(returnData.status)} />
            <TimelineItem icon={TrendingDown} label="Inventory Updated" active={returnData.status === "COMPLETED"} />
          </CardContent>
        </Card>
      </div>

      {/* ── Dialogs ── */}

      {/* Approve / Decline / Cancel */}
      <AlertDialog open={dialog !== null && dialog !== "receive"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === "approve" ? "Approve this Return?"
               : dialog === "decline" ? "Decline this Return?"
               : "Cancel this Return?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "approve"
                ? "The return will be marked as approved. The customer can then send back the items."
                : dialog === "decline"
                ? "This return will be declined. The customer will not be able to return these items."
                : "This return will be cancelled. No inventory changes will occur."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isPending}
              className={dialog === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {isPending ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Items Dialog */}
      <AlertDialog open={dialog === "receive"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Receive Returned Items
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm the quantities received. Restockable items will be added back to inventory at <strong>{returnData.location.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2 max-h-64 overflow-y-auto">
            {returnData.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{line.item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${CONDITION_BADGE[line.condition || "GOOD"]}`}>
                      {line.condition || "GOOD"}
                    </span>
                    {line.restockable ? (
                      <span className="text-xs text-green-600">→ will restock</span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> not restockable
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Returned: {line.quantity}</span>
                  <Input
                    type="number"
                    min={0}
                    max={line.quantity}
                    className="w-16 h-8 text-sm text-center"
                    value={receivedQtys[line.id] ?? line.quantity}
                    onChange={(e) =>
                      setReceivedQtys((prev) => ({
                        ...prev,
                        [line.id]: Math.min(line.quantity, parseInt(e.target.value) || 0),
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={isPending}>
              {isPending ? "Receiving…" : "Receive & Update Stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Info Card Helper ─────────────────────────────────────────────────────────
function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">{children}</CardContent>
    </Card>
  )
}