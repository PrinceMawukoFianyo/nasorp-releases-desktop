"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, Calendar, Package, Receipt, CreditCard,
  AlertTriangle, CheckCircle2, Clock, Printer, FileText,
  TrendingUp, DollarSign, Users, ChevronRight
} from "lucide-react";
import type { SupplierPayable } from "@/actions/supplier-payables";
import Link from "next/link";
import { getSupplierStatement } from "@/actions/suppliers";
import { formatCurrency, formatDate } from "../../purchase-orders/po-utils";

interface SupplierOverviewProps {
  payables: SupplierPayable[];
  creditors: any[];
}

export default function SupplierOverview({ payables, creditors }: SupplierOverviewProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [statement, setStatement] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Overall stats
  const totalInvoiced = payables.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = payables.reduce((s, p) => s + p.amountPaid, 0);
  const totalOwing = payables.reduce((s, p) => s + p.amountOwing, 0);
  const overdueCount = payables.filter(p => 
    p.expectedDate && new Date(p.expectedDate) < new Date() && p.amountOwing > 0
  ).length;
  const paidCount = payables.filter(p => p.paymentStatus === "PAID").length;
  const partialCount = payables.filter(p => p.paymentStatus === "PARTIAL").length;
  const unpaidCount = payables.filter(p => p.paymentStatus === "UNPAID").length;
  const uniqueSuppliers = new Set(payables.map(p => p.supplierId)).size;

  // Recent goods receipts (collect from payables)
  const allReceipts = payables.flatMap(p => 
    p.receiptNumbers.map(rn => ({
      receiptNumber: rn,
      poNumber: p.poNumber,
      supplierName: p.supplierName,
      date: p.orderDate,
      total: p.totalAmount
    }))
  ).slice(0, 5);

  const handleViewStatement = async (supplierId: string) => {
    if (selectedSupplier === supplierId && statement) {
      setSelectedSupplier(null);
      setStatement(null);
      return;
    }
    setLoadingStatement(true);
    try {
      const data = await getSupplierStatement(supplierId);
      setStatement(data);
      setSelectedSupplier(supplierId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStatement(false);
    }
  };

  const printStatement = (supplierName: string, stmt: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    
    const rows = stmt.transactions.map((t: any) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.number}</td>
        <td>${t.type}</td>
        <td>${formatCurrency(t.amount)}</td>
        <td class="status-${(t.status || "").toLowerCase()}">${t.status}</td>
      </tr>
    `).join("");

    const content = `<!DOCTYPE html>
    <html>
    <head><title>Statement – ${supplierName}</title>
    <style>
      body { font-family: Arial; padding: 24px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
      .status-paid { color: green; font-weight: bold; }
      .status-unpaid { color: red; font-weight: bold; }
      .status-partial { color: orange; font-weight: bold; }
      .totals { margin-top: 16px; text-align: right; }
    </style>
    </head>
    <body>
      <h2>Supplier Statement – ${supplierName}</h2>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead><tr><th>Date</th><th>Document #</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <p>Total Invoiced: <strong>${formatCurrency(stmt.totalInvoiced)}</strong></p>
        <p>Total Paid: <strong>${formatCurrency(stmt.totalPaid)}</strong></p>
        <p>Outstanding: <strong>${formatCurrency(stmt.totalOwing)}</strong></p>
      </div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
    </body>
    </html>`;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Invoiced</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
                <p className="text-xs text-muted-foreground mt-1">{uniqueSuppliers} suppliers</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Outstanding</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalOwing)}</p>
              </div>
              <CreditCard className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Overdue</p>
                <p className="text-xl font-bold text-amber-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div className="flex gap-2 flex-wrap">
        <Badge className="bg-green-100 text-green-700">{paidCount} Paid</Badge>
        <Badge className="bg-blue-100 text-blue-700">{partialCount} Partial</Badge>
        <Badge className="bg-red-100 text-red-700">{unpaidCount} Unpaid</Badge>
        {overdueCount > 0 && <Badge className="bg-amber-100 text-amber-700">{overdueCount} Overdue</Badge>}
      </div>

      {/* Recent Goods Receipts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Recent Goods Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goods receipts yet.</p>
          ) : (
            <div className="space-y-2">
              {allReceipts.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-mono text-xs">{r.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">{r.supplierName} • PO: {r.poNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(r.total)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/dashboard/purchases/goods-receipt" className="text-xs text-emerald-600 hover:underline mt-3 inline-block">
            View all receipts →
          </Link>
        </CardContent>
      </Card>

      {/* Supplier List with mini statements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Supplier Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {creditors.map((cred) => (
                <div key={cred.supplierId} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewStatement(cred.supplierId)}
                  >
                    <div>
                      <p className="font-semibold">{cred.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{cred.orderCount} orders • {cred.overdueCount} overdue</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-600">{formatCurrency(cred.totalOwing)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {selectedSupplier === cred.supplierId && statement && (
                    <div className="border-t p-3 bg-muted/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-semibold uppercase">Transaction Statement</h4>
                        <Button size="sm" variant="outline" onClick={() => printStatement(cred.supplierName, statement)}>
                          <Printer className="h-3.5 w-3.5 mr-1" /> Print
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr><th>Date</th><th>Document</th><th>Type</th><th className="text-right">Amount</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {statement.transactions.slice(0, 5).map((t: any, idx: number) => (
                              <tr key={idx} className="border-b">
                                <td className="py-1">{formatDate(t.date)}</td>
                                <td className="font-mono">{t.number}</td>
                                <td>{t.type}</td>
                                <td className="text-right">{formatCurrency(t.amount)}</td>
                                <td>{t.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="pt-2 text-right text-xs">
                        <span className="font-semibold">Total Owing: </span>
                        <span className="font-bold text-red-600">{formatCurrency(statement.totalOwing)}</span>
                      </div>
                      <Link href={`/dashboard/purchases/payables/supplier/${cred.supplierId}/statement`} className="text-xs text-blue-600 hover:underline">
                        View full statement →
                      </Link>
                    </div>
                  )}
                  {selectedSupplier === cred.supplierId && loadingStatement && (
                    <div className="p-3 text-center text-sm text-muted-foreground">Loading statement...</div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}