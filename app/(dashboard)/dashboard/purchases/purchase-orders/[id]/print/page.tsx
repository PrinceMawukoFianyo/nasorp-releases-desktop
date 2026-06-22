"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getPurchaseOrderById } from "@/actions/purchase-order"
import { Printer, Building2, Calendar, User, FileText, Package, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "../../po-utils"

export default function PayablePrintPage() {
  const params = useParams()
  const id = params.id as string
  const [po, setPo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getPurchaseOrderById(id)
      setPo(data)
      setLoading(false)
    }
    load()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!po) {
    return <div className="p-8 text-center text-red-600">Purchase order not found</div>
  }

  const total = po.subtotal + po.taxAmount + (po.shippingCost || 0)
  const paidAmount = po.amountPaid || 0
  const owingAmount = po.amountOwing || 0

  return (
    <div className="min-h-screen bg-white">
      {/* Print button - hidden when printing */}
      <div className="print:hidden p-4 bg-gray-100 flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      {/* Printable content */}
      <div className="max-w-3xl mx-auto p-8">
        <Card className="shadow-none border-0">
          <CardContent className="p-0">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold">PURCHASE ORDER / INVOICE</h1>
              <p className="text-muted-foreground">Generated on {formatDate(new Date())}</p>
            </div>

            {/* PO & Supplier Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold text-sm mb-2">Purchase Order</h3>
                <p className="text-xl font-mono font-bold">{po.poNumber}</p>
                <p className="text-sm">Order Date: {formatDate(po.date)}</p>
                {po.expectedDeliveryDate && (
                  <p className="text-sm">Expected: {formatDate(po.expectedDeliveryDate)}</p>
                )}
                <p className="text-sm mt-2">
                  Status: <Badge className="ml-1">{po.status}</Badge>
                </p>
                <p className="text-sm">
                  Payment: <Badge className="ml-1 bg-green-100 text-green-800">{po.paymentStatus}</Badge>
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Supplier</h3>
                <p className="font-medium">{po.supplier?.name}</p>
                <p className="text-sm">{po.supplier?.address || "No address"}</p>
                <p className="text-sm">{po.supplier?.phone}</p>
                <p className="text-sm">{po.supplier?.email}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-sm mb-3">Order Items</h3>
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-2 px-3">Item</th>
                    <th className="text-center py-2 px-3">Qty</th>
                    <th className="text-center py-2 px-3">Received</th>
                    <th className="text-right py-2 px-3">Unit Price</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines?.map((line: any) => {
                    const unitPrice = line.unitPrice || 0
                    const qty = line.quantity || 0
                    const received = line.receivedQuantity || 0
                    const lineTotal = qty * unitPrice * (1 + (line.taxRate || 0) / 100)
                    return (
                      <tr key={line.id} className="border-b">
                        <td className="py-2 px-3">{line.item?.name || "Unknown"}</td>
                        <td className="text-center py-2 px-3">{qty}</td>
                        <td className="text-center py-2 px-3">{received}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(unitPrice)}</td>
                        <td className="text-right py-2 px-3 font-semibold">{formatCurrency(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(po.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(po.taxAmount)}</span>
                </div>
                {po.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatCurrency(po.shippingCost)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {po.payments && po.payments.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-sm mb-3">Payment History</h3>
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Method</th>
                      <th className="text-left py-2 px-3">Reference</th>
                      <th className="text-right py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.payments.map((p: any) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2 px-3">{formatDate(p.paidAt)}</td>
                        <td className="py-2 px-3">{p.method}</td>
                        <td className="py-2 px-3">{p.reference || "-"}</td>
                        <td className="text-right py-2 px-3 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={3} className="py-2 px-3 font-semibold">Total Paid</td>
                      <td className="text-right py-2 px-3 font-bold text-green-700">{formatCurrency(paidAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {owingAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-center">
                <p className="text-amber-800">
                  Outstanding Balance: <strong>{formatCurrency(owingAmount)}</strong>
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground mt-12 pt-4 border-t">
              <p>This is a computer-generated document. For any discrepancies, please contact accounts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}