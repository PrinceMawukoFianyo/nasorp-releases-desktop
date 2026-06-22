"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  DollarSign, CheckCircle2, CreditCard, AlertTriangle, Clock,
  FileText, Package, Building2, Receipt, Calendar, TrendingUp,
  Banknote, Users, PackageCheck
} from "lucide-react";
import { formatCurrency, formatDate } from "../purchase-orders/po-utils";
import { ReceiveInventoryModal } from "../purchase-orders/components/receive-inventory-modal"; // adjust path if needed
import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";

export default function PurchaseOverview({ payables, creditors, recentPOs, overviewData }: any) {
  // Modal state
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  // Use overviewData if provided, else fallback
  const totalInvoiced = overviewData?.totals?.totalInvoiced ?? payables.reduce((s: number, p: any) => s + p.totalAmount, 0);
  const totalPaid = overviewData?.totals?.totalPaid ?? payables.reduce((s: number, p: any) => s + p.amountPaid, 0);
  const totalOwing = overviewData?.totals?.totalOwing ?? payables.reduce((s: number, p: any) => s + p.amountOwing, 0);
  const overdueCount = payables.filter((p: any) =>
    p.expectedDate && new Date(p.expectedDate) < new Date() && p.amountOwing > 0
  ).length;
  const paidCount = payables.filter((p: any) => p.paymentStatus === "PAID").length;
  const partialCount = payables.filter((p: any) => p.paymentStatus === "PARTIAL").length;
  const unpaidCount = payables.filter((p: any) => p.paymentStatus === "UNPAID").length;

  const allReceipts = payables.flatMap((p: any) =>
    (p.receiptNumbers || []).map((rn: string) => ({
      receiptNumber: rn,
      poNumber: p.poNumber,
      supplierName: p.supplierName,
      date: p.orderDate,
      total: p.totalAmount,
    }))
  ).slice(0, 5);

  const aging = overviewData?.aging || [];
  const upcomingPayments = overviewData?.upcomingPayments || [];
  const recentPayments = overviewData?.recentPayments || [];
  const topCreditors = overviewData?.topCreditors || creditors.slice(0, 5);
  const unreceivedCreditPOs = recentPOs.filter(
    (po: any) => po.status !== "RECEIVED" && po.paymentStatus === "UNPAID"
  );

  // Handle receive click
  const handleReceiveClick = (po: any) => {
    setSelectedPO(po);
    setReceiveModalOpen(true);
  };

  if (unreceivedCreditPOs.length > 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-amber-800">
          ⚠️ {unreceivedCreditPOs.length} credit purchase order(s) have not been received.
          Go to <Link href="/dashboard/purchases/purchase-orders" className="underline">Purchase Orders</Link> and use "Receive Inventory" to update stock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Overview</h1>
        <p className="text-sm text-muted-foreground">
          Summary of payables, supplier performance, and recent purchase activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Invoiced</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
                <p className="text-xs text-muted-foreground">{creditors.length} suppliers</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Outstanding</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalOwing)}</p>
              </div>
              <CreditCard className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Overdue POs</p>
                <p className="text-xl font-bold text-amber-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-700">{paidCount}</p></div>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <Progress value={payables.length ? (paidCount / payables.length) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Partial</p><p className="text-2xl font-bold text-blue-700">{partialCount}</p></div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <Progress value={payables.length ? (partialCount / payables.length) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Unpaid</p><p className="text-2xl font-bold text-red-700">{unpaidCount}</p></div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <Progress value={payables.length ? (unpaidCount / payables.length) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis & Upcoming Payments */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />Aging Analysis (Outstanding)</CardTitle></CardHeader>
          <CardContent>
            {aging.length === 0 || aging.every((a: any) => a.amount === 0) ? (
              <p className="text-sm text-muted-foreground">No outstanding payables</p>
            ) : (
              <div className="space-y-3">
                {aging.map((bucket: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{bucket.bucket}</span>
                      <span className="font-semibold">{formatCurrency(bucket.amount)}</span>
                    </div>
                    <Progress value={totalOwing ? (bucket.amount / totalOwing) * 100 : 0} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Upcoming Payments (Next 7 Days)</CardTitle></CardHeader>
          <CardContent>
            {upcomingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments due soon</p>
            ) : (
              <div className="space-y-2">
                {upcomingPayments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 border rounded-lg">
                    <div>
                      <p className="font-mono text-xs">{p.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{p.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600">{formatCurrency(p.amountOwing)}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(p.dueDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/purchases/payables">
              <Button variant="outline" size="sm" className="w-full mt-3">View Payables Tracker →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments & Top Creditors */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Banknote className="h-4 w-4" />Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent payments recorded</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 border rounded-lg">
                    <div>
                      <p className="font-mono text-xs">{p.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{p.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Top Creditors (by amount owed)</CardTitle></CardHeader>
          <CardContent>
            {topCreditors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding payables</p>
            ) : (
              <div className="space-y-2">
                {topCreditors.map((c: any) => (
                  <div key={c.id || c.supplierId} className="flex justify-between items-center p-2 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{c.name || c.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{c.orderCount} orders</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(c.totalOwing)}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/purchases/payables?tab=creditors">
              <Button variant="outline" size="sm" className="w-full mt-3">View All Creditors →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout for Recent POs and Receipts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent purchase orders</p>
            ) : (
              <div className="space-y-2">
                {recentPOs.slice(0, 5).map((po: any) => (
                  <div key={po.id} className="flex justify-between items-center p-2 border rounded-lg">
                    <div>
                      <p className="font-mono text-xs">{po.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{po.supplierName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{formatCurrency(po.total)}</p>
                      <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                      {/* Receive icon - only show if not fully received */}
                      {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleReceiveClick(po)}
                          className="p-1 rounded hover:bg-green-100 transition-colors"
                          title="Receive Inventory"
                        >
                          <PackageCheck className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/purchases/purchase-orders">
              <Button variant="outline" size="sm" className="w-full mt-3">View all POs →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" />Recent Goods Receipts</CardTitle></CardHeader>
          <CardContent>
            {allReceipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goods receipts yet</p>
            ) : (
              <div className="space-y-2">
                {allReceipts.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 border rounded-lg">
                    <div><p className="font-mono text-xs">{r.receiptNumber}</p><p className="text-xs text-muted-foreground">{r.supplierName}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(r.total)}</p><p className="text-xs text-muted-foreground">{formatDate(r.date)}</p></div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/purchases/goods-receipt">
              <Button variant="outline" size="sm" className="w-full mt-3">View all receipts →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/dashboard/purchases/purchase-orders/create">
          <Button variant="outline" className="w-full gap-2"><FileText className="h-4 w-4" />Create PO</Button>
        </Link>
        <Link href="/dashboard/purchases/goods-receipt/create">
          <Button variant="outline" className="w-full gap-2"><Receipt className="h-4 w-4" />New Receipt</Button>
        </Link>
        <Link href="/dashboard/purchases/suppliers/create">
          <Button variant="outline" className="w-full gap-2"><Building2 className="h-4 w-4" />Add Supplier</Button>
        </Link>
        <Link href="/dashboard/purchases/payables">
          <Button variant="outline" className="w-full gap-2"><CreditCard className="h-4 w-4" />Record Payment</Button>
        </Link>
      </div>

      {/* Receive Inventory Modal */}
      {selectedPO && (
        <ReceiveInventoryModal
          open={receiveModalOpen}
          onOpenChange={(open) => {
            setReceiveModalOpen(open);
            if (!open) setSelectedPO(null);
          }}
          purchaseOrder={selectedPO}
          locationId={selectedPO.deliveryLocationId || ""}
        />
      )}
    </div>
  );
}

export async function getPurchaseOverviewData() {
  try {
    const user = await getAuthenticatedUser()
    if (!user?.orgId) {
      return {
        totals: { totalInvoiced: 0, totalPaid: 0, totalOwing: 0 },
        aging: [],
        upcomingPayments: [],
        recentPayments: [],
        topCreditors: [],
      }
    }

    // Get all POs except cancelled and draft (we want to see all that matter)
    const pos = await db.purchaseOrder.findMany({
      where: {
        orgId: user.orgId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
      },
      include: {
        supplier: true,
        payments: true,
        goodsReceipts: true,
      },
    })

    // Calculate totals
    let totalInvoiced = 0
    let totalPaid = 0
    for (const po of pos) {
      const poTotal = Number(po.subtotal) + Number(po.taxAmount) + (Number(po.shippingCost) || 0)
      totalInvoiced += poTotal
      const paidSum = po.payments.reduce((s, p) => s + Number(p.amount), 0)
      totalPaid += paidSum
    }
    const totalOwing = totalInvoiced - totalPaid

    // Aging buckets (for POs with outstanding)
    const now = new Date()
    const agingBuckets = [
      { bucket: "0-30 days", amount: 0 },
      { bucket: "31-60 days", amount: 0 },
      { bucket: "61-90 days", amount: 0 },
      { bucket: "90+ days", amount: 0 },
    ]
    for (const po of pos) {
      const owing = Number(po.amountOwing) || 0
      if (owing <= 0) continue
      const dueDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : po.date
      const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 30) agingBuckets[0].amount += owing
      else if (daysDiff <= 60) agingBuckets[1].amount += owing
      else if (daysDiff <= 90) agingBuckets[2].amount += owing
      else agingBuckets[3].amount += owing
    }

    // Upcoming payments (next 7 days)
    const upcoming = []
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(now.getDate() + 7)
    for (const po of pos) {
      const dueDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null
      if (dueDate && dueDate >= now && dueDate <= sevenDaysLater && Number(po.amountOwing) > 0) {
        upcoming.push({
          poNumber: po.poNumber,
          supplierName: po.supplier?.name || "Unknown",
          amountOwing: Number(po.amountOwing),
          dueDate: dueDate,
        })
      }
    }

    // Recent payments (last 30 days)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const recentPayments = []
    for (const po of pos) {
      for (const p of po.payments) {
        if (p.paidAt >= thirtyDaysAgo) {
          recentPayments.push({
            poNumber: po.poNumber,
            supplierName: po.supplier?.name || "Unknown",
            amount: Number(p.amount),
            paidAt: p.paidAt,
          })
        }
      }
    }
    recentPayments.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())

    // Top creditors
    const creditorsMap = new Map()
    for (const po of pos) {
      const owing = Number(po.amountOwing)
      if (owing <= 0) continue
      const supplierId = po.supplierId
      if (!creditorsMap.has(supplierId)) {
        creditorsMap.set(supplierId, {
          supplierId,
          name: po.supplier?.name || "Unknown",
          totalOwing: 0,
          orderCount: 0,
        })
      }
      const entry = creditorsMap.get(supplierId)
      entry.totalOwing += owing
      entry.orderCount += 1
    }
    const topCreditors = Array.from(creditorsMap.values())
      .sort((a, b) => b.totalOwing - a.totalOwing)
      .slice(0, 5)

    return {
      totals: { totalInvoiced, totalPaid, totalOwing },
      aging: agingBuckets.filter(b => b.amount > 0),
      upcomingPayments: upcoming,
      recentPayments: recentPayments.slice(0, 5),
      topCreditors,
    }
  } catch (error) {
    console.error("getPurchaseOverviewData error:", error)
    return {
      totals: { totalInvoiced: 0, totalPaid: 0, totalOwing: 0 },
      aging: [],
      upcomingPayments: [],
      recentPayments: [],
      topCreditors: [],
    }
  }
}