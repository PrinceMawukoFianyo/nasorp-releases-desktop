"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Building2, Phone, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { getSupplierById, getSupplierStatement } from "@/actions/suppliers";
import { formatCurrency, formatDate } from "../../../purchase-orders/po-utils";

export default function SupplierStatementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [supplierData, statementData] = await Promise.all([
          getSupplierById(id),
          getSupplierStatement(id),
        ]);
        setSupplier(supplierData);
        setStatement(statementData);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load supplier statement");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading statement...</p>
      </div>
    );
  }

  if (!supplier || !statement) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Supplier or statement not found.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white p-6">
      {/* Action Bar – hidden when printing */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print Statement
        </Button>
      </div>

      {/* Statement Document */}
      <Card className="max-w-4xl mx-auto shadow-lg print:shadow-none">
        <CardContent className="p-6 print:p-4">
          {/* Header */}
          <div className="border-b pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Supplier Statement</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {supplier.name}</div>
                  {supplier.phone && <div className="flex items-center gap-1"><Phone className="h-4 w-4" /> {supplier.phone}</div>}
                  {supplier.email && <div className="flex items-center gap-1"><Mail className="h-4 w-4" /> {supplier.email}</div>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Generated: {new Date().toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                {statement.totalOwing > 0 ? "Outstanding Balance" : "Settled"}
              </Badge>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Document #</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">No transactions</td>
                  </tr>
                ) : (
                  statement.transactions.map((t: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{formatDate(t.date)}</td>
                      <td className="p-2 font-mono">{t.number}</td>
                      <td className="p-2">{t.type}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(t.amount)}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={
                          t.status === "PAID" ? "bg-green-100 text-green-700" :
                          t.status === "PARTIAL" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }>
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={3} className="p-2 font-semibold">Totals</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(statement.totalInvoiced)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="p-2">Total Paid</td>
                  <td className="p-2 text-right text-green-700">{formatCurrency(statement.totalPaid)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="p-2 font-bold">Outstanding Balance</td>
                  <td className="p-2 text-right font-bold text-red-600">{formatCurrency(statement.totalOwing)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>This is a computer-generated statement. For any discrepancies, please contact our accounts department.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}