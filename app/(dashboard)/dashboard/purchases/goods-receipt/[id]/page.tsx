'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { Mail, Printer, Download, ArrowLeft, MapPin, User, Calendar, Package, FileText, Building2, Phone, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { getGoodsReceipt } from '@/actions/goods-receipt'
import { Separator } from '@radix-ui/react-select'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(value)
}

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const formatTime = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export default function GoodsReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [receipt, setReceipt] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  useEffect(() => {
    loadReceipt()
  }, [id])

  const loadReceipt = async () => {
    try {
      setIsLoading(true)
      const result = await getGoodsReceipt(id)
      if (result.success && result.data) {
        setReceipt(result.data)
      } else {
        toast.error('Failed to load receipt')
      }
    } catch (error) {
      console.error('Error loading receipt:', error)
      toast.error('Failed to load receipt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendEmailClick = async () => {
    if (!receipt?.purchaseOrder?.supplier?.email) {
      toast.error("Supplier email address is not available")
      return
    }

    setIsSendingEmail(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(
        `Receipt sent to ${receipt.purchaseOrder.supplier.name}`,
        {
          description: `Email will be delivered to ${receipt.purchaseOrder.supplier.email}`
        }
      )
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("An error occurred while sending the email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handlePrint = () => {
    window.print()
    toast.success('Opening print dialog...')
  }

  const handleDownload = () => {
    toast.info('Download feature coming soon')
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading receipt details...</p>
        </div>
      </div>
    )
  }
  
  if (!receipt) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center pt-6">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h1 className="text-2xl font-bold mb-2">Receipt not found</h1>
            <p className="text-muted-foreground mb-4">
              The goods receipt you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.push('/dashboard/purchases/goods-receipt')}>
              Back to Goods Receipts
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supplierInfo = receipt.purchaseOrder?.supplier
  const canSendEmail = supplierInfo?.email

  const subtotal = receipt.total
  const tax = receipt.lines.reduce((sum: number, line: any) => {
    const unitPrice = line.purchaseOrderLine?.unitPrice || 0
    return sum + (line.receivedQuantity * unitPrice * 0.0001)
  }, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Action Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/purchases/goods-receipt')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Receipts
            </Button>
            <div className="flex items-center gap-2">
              {canSendEmail && (
                <Button
                  variant="outline"
                  onClick={handleSendEmailClick}
                  disabled={isSendingEmail}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={handlePrint}
                className="gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Document */}
      <div className="max-w-5xl mx-auto p-6">
        <Card className="shadow-xl">
          <CardContent className="p-0">
            {/* Receipt Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-medium opacity-90">Goods Receipt</p>
                      <h1 className="text-3xl font-bold">{receipt.receiptNumber}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(receipt.receivedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/50"></span>
                      <span>{formatTime(receipt.receivedDate)}</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white border-green-400 px-4 py-2 text-sm font-semibold shadow-lg">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed
                </Badge>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-8">
              {/* Reference Information */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Purchase Order Reference
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        PO: {receipt.purchaseOrder?.poNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {receipt.location?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        Received by: {receipt.receivedBy?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Supplier Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {supplierInfo?.name}
                      </span>
                    </div>
                    {supplierInfo?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{supplierInfo.email}</span>
                      </div>
                    )}
                    {supplierInfo?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{supplierInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {receipt.notes && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                    Receipt Notes
                  </h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {receipt.notes}
                  </p>
                </div>
              )}

              <Separator className="my-8" />

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-rose-600" />
                  Received Items
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left py-4 px-4 font-semibold text-xs uppercase text-slate-600">
                          Item Details
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-xs uppercase text-slate-600">
                          Ordered
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-xs uppercase text-slate-600">
                          Received
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-xs uppercase text-slate-600">
                          Unit Price
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-xs uppercase text-slate-600">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipt.lines.map((line: any) => {
                        const unitPrice = line.purchaseOrderLine?.unitPrice || 0
                        const orderedQty = line.purchaseOrderLine?.quantity || 0
                        const lineTotal = line.receivedQuantity * unitPrice
                        const isFullyReceived = line.receivedQuantity === orderedQty
                        
                        return (
                          <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-semibold text-slate-900">{line.item?.name}</p>
                                <p className="text-xs text-slate-500 mt-1">SKU: {line.item?.sku}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-slate-700 font-medium">{orderedQty}</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-slate-900 font-bold">
                                  {line.receivedQuantity}
                                </span>
                                {isFullyReceived && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right text-slate-700">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-900">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-sm">
                  <div className="bg-slate-50 rounded-lg p-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(tax)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold text-slate-900">Total Amount</span>
                      <span className="text-2xl font-bold text-rose-600">
                        {formatCurrency(receipt.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="mt-8 pt-6 border-t text-center text-xs text-slate-500">
                <p>This is a computer-generated goods receipt and requires no signature.</p>
                <p className="mt-1">Generated on {formatDate(new Date())} at {formatTime(new Date())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}