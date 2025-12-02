// app/dashboard/sales/orders/components/sales-order-detail-view.tsx - UPDATED
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  MoreVertical, 
  Edit, 
  FileText, 
  Printer, 
  XCircle, 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  Package, 
  Phone, 
  Mail, 
  MapPin,
  Send,
  RefreshCw,
  UserCheck
} from "lucide-react"
import { formatCurrency, formatDate, getStatusColor, getPaymentStatusColor } from "../so-utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { sendSalesOrderEmail } from "@/actions/sales-orders"

interface SalesOrderDetailViewProps {
  salesOrder: any
  onEdit: (so: any) => void
  onCancel: (so: any) => void
  onPrint: () => void
  onExport: () => void
  onRefresh?: () => void
}

export default function SalesOrderDetailView({
  salesOrder,
  onEdit,
  onCancel,
  onPrint,
  onExport,
  onRefresh,
}: SalesOrderDetailViewProps) {
  const router = useRouter()
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const subtotal = salesOrder.subtotal || 0
  const taxAmount = salesOrder.taxAmount || 0
  const shippingCost = salesOrder.shippingCost || 0
  const discount = salesOrder.discount || 0
  const total = subtotal + taxAmount + shippingCost - discount

  const customerInfo = salesOrder.customer

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("Please enter an email address")
      return
    }

    setIsLoading(true)
    try {
      const result = await sendSalesOrderEmail(salesOrder.id, emailAddress)
      
      if (result.success) {
        toast.success("Email sent successfully")
        setShowEmailDialog(false)
        setEmailAddress("")
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("An error occurred while sending email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    
    setIsRefreshing(true)
    try {
      await onRefresh()
      toast.success("Order refreshed")
    } catch (error) {
      console.error("Error refreshing:", error)
      toast.error("Failed to refresh order")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold truncate">{salesOrder.orderNumber}</h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {customerInfo?.name || 'Unknown Customer'} • {formatDate(salesOrder.orderDate || salesOrder.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getStatusColor(salesOrder.status)}>
              {salesOrder.status}
            </Badge>
            <Badge className={getPaymentStatusColor(salesOrder.paymentStatus)}>
              {salesOrder.paymentStatus}
            </Badge>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invoice
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(salesOrder)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {salesOrder.status !== "CANCELLED" && (
                  <DropdownMenuItem onClick={() => onCancel(salesOrder)} className="text-red-600">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => router.push(`/dashboard/sales/orders/${salesOrder.id}/invoice`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Order Invoice</DialogTitle>
            <DialogDescription>
              Send this Invoice confirmation via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Invoice will include:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Order details and summary</li>
                <li>Customer information</li>
                <li>Line items with quantities and prices</li>
                <li>Total amount and payment status</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isLoading || !emailAddress}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Card */}
            <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-slate-200/60">
              <div className="relative p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">Customer Details</h3>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-base mb-0.5">
                      {customerInfo?.name || 'Unknown Customer'}
                    </p>
                  </div>
                  
                  <div className="space-y-1.5 pt-0.5">
                    {customerInfo?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-snug">
                          {customerInfo.address}
                        </p>
                      </div>
                    )}
                    {customerInfo?.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-snug">
                          {customerInfo.phone}
                        </p>
                      </div>
                    )}
                    {customerInfo?.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-snug">
                          {customerInfo.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Card */}
            <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-slate-200/60">
              <div className="relative p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">Order Details</h3>
                </div>
                
                <div className="grid gap-2">
                  <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Order Date
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm pl-4">
                      {formatDate(salesOrder.orderDate || salesOrder.createdAt)}
                    </p>
                  </div>

                  {salesOrder.deliveryDate && (
                    <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Delivery Date
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm pl-4">
                        {formatDate(salesOrder.deliveryDate)}
                      </p>
                    </div>
                  )}

                  <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Payment Status
                      </p>
                    </div>
                    <Badge className={getPaymentStatusColor(salesOrder.paymentStatus)}>
                      {salesOrder.paymentStatus}
                    </Badge>
                  </div>

                  {/* Payment Method - NEW FIELD */}
                  {salesOrder.paymentMethod && (
                    <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Payment Method
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm pl-4 capitalize">
                        {salesOrder.paymentMethod.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  )}

                  {/* Created By - NEW FIELD */}
                  {salesOrder.createdBy && (
                    <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Created By
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm pl-4">
                        {salesOrder.createdBy.name || salesOrder.createdBy.email || 'Unknown'}
                      </p>
                    </div>
                  )}

                  <div className="hover:bg-slate-50 -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Package className="w-3 h-3 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Location
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm pl-4">
                      {salesOrder.location?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Item</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Qty</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Unit Price</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Tax</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesOrder.lines && salesOrder.lines.length > 0 ? (
                      salesOrder.lines.map((line: any) => {
                        const unitPrice = line.unitPrice || 0
                        const quantity = line.quantity || 0
                        const taxRate = line.taxRate || 0
                        const lineSubtotal = quantity * unitPrice
                        const lineTax = lineSubtotal * (taxRate / 100)
                        const lineTotal = lineSubtotal + lineTax
                        
                        return (
                          <tr key={line.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-sm">
                              <div>
                                <p className="font-medium">{line.item?.name || "Unknown Item"}</p>
                                <p className="text-xs text-muted-foreground">{line.item?.sku}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-center font-semibold">{quantity}</td>
                            <td className="py-3 px-4 text-sm text-right">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right">{taxRate}%</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No line items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(discount)}
                      </span>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="font-semibold">
                        {formatCurrency(shippingCost)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {salesOrder.notes && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {salesOrder.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}