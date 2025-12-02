// app/(dashboard)/dashboard/sales/pos/[id]/details/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  CreditCard,
  UserCheck,
  FileText,
  MoreVertical,
  Receipt,
  Clock,
  Printer,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSalesOrderById } from "@/actions/sales-orders"
import { formatCurrency, formatDate } from "@/app/(pos)/utils"


export default function POSTransactionDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [transaction, setTransaction] = useState<any>(null)

  useEffect(() => {
    loadTransaction()
  }, [transactionId])

  const loadTransaction = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(transactionId)
      
      if (!order) {
        toast.error("POS transaction not found")
        router.push("/dashboard/sales/pos")
        return
      }

      // Verify it's a POS transaction
      if (!order.orderNumber.startsWith("POS-")) {
        toast.error("This is not a POS transaction")
        router.push("/dashboard/sales/pos")
        return
      }

      setTransaction(order)
    } catch (error) {
      console.error("Failed to load POS transaction:", error)
      toast.error("Failed to load POS transaction")
      router.push("/dashboard/sales/pos")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintReceipt = () => {
    router.push(`/dashboard/sales/orders/${transactionId}/simple-receipt`)
  }

  const handleExport = () => {
    toast.info("Export functionality coming soon")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading transaction details...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return null
  }

  const subtotal = transaction.subtotal || 0
  const taxAmount = transaction.taxAmount || 0
  const shippingCost = transaction.shippingCost || 0
  const discount = transaction.discount || 0
  const total = subtotal + taxAmount + shippingCost - discount
  const customerInfo = transaction.customer

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/sales/pos")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to POS Transactions
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-8 h-8 text-green-600" />
                <h1 className="text-3xl font-bold">{transaction.orderNumber}</h1>
              </div>
              <p className="text-muted-foreground">
                {customerInfo?.name || 'Walk-in Customer'} • {formatDate(transaction.createdAt)}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                {transaction.status}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                {transaction.paymentStatus}
              </Badge>
              
              <Button
                variant="outline"
                onClick={handlePrintReceipt}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePrintReceipt}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Customer and Transaction Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Details Card */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-blue-900">Customer Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {customerInfo?.name || 'Walk-in Customer'}
                  </p>
                </div>

                <div className="space-y-3">
                  {customerInfo?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{customerInfo.phone}</span>
                    </div>
                  )}
                  {customerInfo?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{customerInfo.email}</span>
                    </div>
                  )}
                  {customerInfo?.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                      <span className="text-sm text-gray-700">{customerInfo.address}</span>
                    </div>
                  )}
                  {!customerInfo && (
                    <div className="text-sm text-gray-500 italic">
                      No customer information available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details Card */}
          <Card className="bg-green-50/50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-green-900">Transaction Details</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transaction Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {transaction.paymentMethod?.toLowerCase().replace('_', ' ') || 'Cash'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {transaction.location?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                {transaction.createdBy && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cashier</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {transaction.createdBy.name || transaction.createdBy.email || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Items Table */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Items Sold</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Item</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Quantity</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Tax</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.lines && transaction.lines.length > 0 ? (
                    transaction.lines.map((line: any) => {
                      const unitPrice = line.unitPrice || 0
                      const quantity = line.quantity || 0
                      const taxRate = line.taxRate || 0
                      const lineSubtotal = quantity * unitPrice
                      const lineTax = lineSubtotal * (taxRate / 100)
                      const lineTotal = lineSubtotal + lineTax
                      
                      return (
                        <tr key={line.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-sm">{line.item?.name || "Unknown Item"}</p>
                              <p className="text-xs text-gray-500">{line.item?.sku}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-semibold">{quantity}</td>
                          <td className="py-4 px-4 text-right">{formatCurrency(unitPrice)}</td>
                          <td className="py-4 px-4 text-right">{taxRate}%</td>
                          <td className="py-4 px-4 text-right font-semibold">{formatCurrency(lineTotal)}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Transaction Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                </div>
                {shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-semibold">{formatCurrency(shippingCost)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 pt-3 border-green-300">
                  <span className="font-bold text-lg">Total Paid:</span>
                  <span className="font-bold text-2xl text-green-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        {transaction.notes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {transaction.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons at Bottom */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/sales/pos")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transactions
          </Button>
          <Button
            onClick={handlePrintReceipt}
            className="bg-green-600 hover:bg-green-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  )
}