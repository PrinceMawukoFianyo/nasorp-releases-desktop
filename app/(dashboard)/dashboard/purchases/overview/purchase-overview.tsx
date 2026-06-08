"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  DollarSign, CheckCircle2, CreditCard, AlertTriangle, Clock,
  FileText, Package, Building2, Receipt
} from "lucide-react";
import { formatCurrency, formatDate } from "../purchase-orders/po-utils";

export default function PurchaseOverview({ payables, creditors, recentPOs }: any) {
  const totalInvoiced = payables.reduce((s: number, p: any) => s + p.totalAmount, 0);
  const totalPaid = payables.reduce((s: number, p: any) => s + p.amountPaid, 0);
  const totalOwing = payables.reduce((s: number, p: any) => s + p.amountOwing, 0);
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
            <Progress value={(paidCount / payables.length) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Partial</p><p className="text-2xl font-bold text-blue-700">{partialCount}</p></div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <Progress value={(partialCount / payables.length) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-muted-foreground">Unpaid</p><p className="text-2xl font-bold text-red-700">{unpaidCount}</p></div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <Progress value={(unpaidCount / payables.length) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Recent Purchase Orders</CardTitle></CardHeader>
          <CardContent>
            {recentPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent purchase orders</p>
            ) : (
              <div className="space-y-2">
                {recentPOs.slice(0, 5).map((po: any) => (
                  <div key={po.id} className="flex justify-between items-center p-2 border rounded-lg">
                    <div><p className="font-mono text-xs">{po.poNumber}</p><p className="text-xs text-muted-foreground">{po.supplierName}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(po.total)}</p><Badge variant="outline" className="text-[10px]">{po.status}</Badge></div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/purchases/purchase-orders"><Button variant="outline" size="sm" className="w-full mt-3">View all POs →</Button></Link>
          </CardContent>
        </Card>

        {/* Recent Goods Receipts */}
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
            <Link href="/dashboard/purchases/goods-receipt"><Button variant="outline" size="sm" className="w-full mt-3">View all receipts →</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Top Creditors */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Top Creditors (by amount owed)</CardTitle></CardHeader>
        <CardContent>
          {creditors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding payables</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="p-2 text-left">Supplier</th><th className="p-2 text-right">Outstanding</th><th className="p-2 text-center">Orders</th><th className="p-2 text-center">Overdue</th></tr></thead>
                <tbody>
                  {creditors.slice(0, 5).map((c: any) => (
                    <tr key={c.supplierId} className="border-b">
                      <td className="p-2 font-medium">{c.supplierName}</td>
                      <td className="p-2 text-right text-red-600 font-semibold">{formatCurrency(c.totalOwing)}</td>
                      <td className="p-2 text-center">{c.orderCount}</td>
                      <td className="p-2 text-center">{c.overdueCount > 0 ? <Badge className="bg-red-100 text-red-700">{c.overdueCount}</Badge> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/dashboard/purchases/payables"><Button variant="outline" size="sm" className="w-full mt-3">Go to Payables Tracker →</Button></Link>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/dashboard/purchases/purchase-orders/create"><Button variant="outline" className="w-full gap-2"><FileText className="h-4 w-4" />Create PO</Button></Link>
        <Link href="/dashboard/purchases/goods-receipt/create"><Button variant="outline" className="w-full gap-2"><Receipt className="h-4 w-4" />New Receipt</Button></Link>
        <Link href="/dashboard/purchases/suppliers/create"><Button variant="outline" className="w-full gap-2"><Building2 className="h-4 w-4" />Add Supplier</Button></Link>
        <Link href="/dashboard/purchases/payables"><Button variant="outline" className="w-full gap-2"><CreditCard className="h-4 w-4" />Record Payment</Button></Link>
      </div>
    </div>
  );
}