// app/(dashboard)/dashboard/sales/orders/[id]/details/page.tsx
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
  Send,
  FileText,
  Edit,
  MoreVertical,
} from "lucide-react"
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
import { getSalesOrderById, sendSalesOrderEmail } from "@/actions/sales-orders"
import { formatCurrency, formatDate, getPaymentStatusColor, getStatusColor } from "../../so-utils"


export default function SalesOrderDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  useEffect(() => {
    loadSalesOrder()
  }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      
      if (!order) {
        toast.error("Sales order not found")
        router.push("/dashboard/sales/orders")
        return
      }

      setSalesOrder(order)
    } catch (error) {
      console.error("Failed to load sales order:", error)
      toast.error("Failed to load sales order")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error("Please enter an email address")
      return
    }

    setIsSendingEmail(true)
    try {
      const result = await sendSalesOrderEmail(orderId, emailAddress)
      
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
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!salesOrder) {
    return null
  }

  const subtotal = salesOrder.subtotal || 0
  const taxAmount = salesOrder.taxAmount || 0
  const shippingCost = salesOrder.shippingCost || 0
  const discount = salesOrder.discount || 0
  const total = subtotal + taxAmount + shippingCost - discount
  const customerInfo = salesOrder.customer

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/sales/orders")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sales Order Details
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{salesOrder.orderNumber}</h1>
              <p className="text-muted-foreground">
                {customerInfo?.name || 'Unknown Customer'} • {formatDate(salesOrder.orderDate || salesOrder.createdAt)}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(salesOrder.status)}>
                {salesOrder.status}
              </Badge>
              <Badge className={getPaymentStatusColor(salesOrder.paymentStatus)}>
                {salesOrder.paymentStatus}
              </Badge>
              
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(true)}
                disabled={isSendingEmail}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invoice
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/sales/orders/${orderId}/invoice`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Invoice
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/sales/orders/${orderId}/edit`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          < DialogHeader>
            <DialogTitle>Send Order Invoice</DialogTitle>
            <DialogDescription>
              Send this Invoice confirmation via email
            </DialogDescription>
          </ DialogHeader>
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailAddress}>
              {isSendingEmail ? (
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Customer and Order Details Grid */}
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
                    {customerInfo?.name || 'Unknown Customer'}
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="bg-purple-50/50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-purple-900">Order Details</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Order Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(salesOrder.orderDate || salesOrder.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {salesOrder.location?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                {salesOrder.paymentMethod && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {salesOrder.paymentMethod.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {salesOrder.createdBy && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created By</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {salesOrder.createdBy.name || salesOrder.createdBy.email || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items Table */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Item</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Quantity</th>
                    <th className="text-riUSt py-3 px-4 font-semibold text-sm">Unit Price</th>
                    <th className="text-riUSt py-3 px-4 font-semibold text-sm">Tax</th>
                    <th className="text-riUSt py-3 px-4 font-semibold text-sm">Total</th>
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
                        <tr key={line.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-sm">{line.item?.name || "Unknown Item"}</p>
                              <p className="text-xs text-gray-500">{line.item?.sku}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-semibold">{quantity}</td>
                          <td className="py-4 px-4 text-riUSt">{formatCurrency(unitPrice)}</td>
                          <td className="py-4 px-4 text-riUSt">{taxRate}%</td>
                          <td className="py-4 px-4 text-riUSt font-semibold">{formatCurrency(lineTotal)}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No line items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-3 bg-gray-50 p-4 rounded-lg">
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
                <div className="flex justify-between border-t-2 pt-3">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-2xl text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        {salesOrder.notes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {salesOrder.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}