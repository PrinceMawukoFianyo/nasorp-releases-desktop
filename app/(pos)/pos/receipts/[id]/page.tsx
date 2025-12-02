// app/dashboard/sales/order/[id]/simple-receipt/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Printer, Share2, Home, Receipt, FileText } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById } from "@/actions/sales-orders"

export default function SimpleReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    loadSalesOrder()
  }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      
      if (!order) {
        toast.error("Receipt not found")
        router.push("/dashboard/pos")
        return
      }
      
      setSalesOrder(order)
    } catch (error) {
      console.error("Failed to load receipt:", error)
      toast.error("Failed to load receipt")
      router.push("/dashboard/pos")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Receipt link copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (!salesOrder) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Receipt not found</p>
          <Button onClick={() => router.push("/dashboard/pos")}>
            Back to POS
          </Button>
        </div>
      </div>
    )
  }

  const subtotal = salesOrder.subtotal || 0
  const taxAmount = salesOrder.taxAmount || 0
  const discount = salesOrder.discount || 0
  const shippingCost = salesOrder.shippingCost || 0
  const total = subtotal + taxAmount + shippingCost - discount

  return (
    <div className="min-h-screen bg-white p-4 print:p-0">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-xs mx-auto">
        {/* Header - Only visible in browser */}
        <div className="mb-6 no-print">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard/pos"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to POS
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Simple Receipt</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? <Spinner className="w-4 h-4 mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Simple Receipt Content */}
        <div className="text-center font-mono text-sm print:text-xs bg-white">
          {/* Store Header */}
          <div className="mb-4 border-b pb-4">
            <h2 className="font-bold text-lg uppercase tracking-tight">AROMA CAFE</h2>
            <p className="text-xs">1211 Green Street</p>
            <p className="text-xs">New York, NY 10005</p>
            <p className="text-xs mt-1">Tel: (555) 123-4567</p>
          </div>

          {/* Date and Time */}
          <div className="mb-4">
            <p className="text-xs">
              {new Date(salesOrder.createdAt).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              })}
              &nbsp;&nbsp;
              {new Date(salesOrder.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }).toUpperCase()}
            </p>
            <p className="text-xs font-bold mt-1">RECEIPT #{salesOrder.orderNumber}</p>
          </div>

          {/* Transaction Details */}
          <div className="mb-4 text-left">
            <div className="flex justify-between text-xs mb-1">
              <span>TAB 8</span>
              <span>HOST {salesOrder.createdBy?.name?.split(' ')[0]?.toUpperCase() || 'STAFF'}</span>
            </div>
            <div className="flex justify-between text-xs mb-3">
              <span>{salesOrder.paymentMethod || 'CASH'}</span>
              <span>#########19883</span>
            </div>

            {/* Header Row */}
            <div className="flex justify-between text-xs font-bold border-b border-black mb-2 pb-1">
              <span>QTY</span>
              <span>DESC</span>
              <span>AMT</span>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {salesOrder.lines?.map((line: any, index: number) => (
                <div key={line.id} className="flex justify-between items-center">
                  <span className="w-8">{line.quantity}</span>
                  <span className="flex-1 text-left ml-2 truncate">
                    {line.item?.name || "Unknown Item"}
                  </span>
                  <span className="w-16 text-right">
                    ${((line.quantity || 0) * (line.unitPrice || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-black my-3"></div>

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>TAX</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>DISCOUNT</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span>SHIPPING</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {salesOrder.customer && (
            <div className="mb-4 text-left border-t pt-3">
              <p className="text-xs font-bold">CUSTOMER</p>
              <p className="text-xs">{salesOrder.customer.name}</p>
              {salesOrder.customer.phone && (
                <p className="text-xs">Tel: {salesOrder.customer.phone}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-xs border-t pt-3">
            <p>Thank you for your business!</p>
            <p className="mt-2 text-[10px]">For returns, present receipt within 7 days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {salesOrder.orderNumber} • {new Date(salesOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons - Only visible in browser */}
        <div className="flex gap-3 mt-6 no-print">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/pos")}
            className="flex-1"
          >
            New Sale
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/sales/order/${salesOrder.id}/invoice`)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Full Invoice
          </Button>
        </div>
      </div>
    </div>
  )
}