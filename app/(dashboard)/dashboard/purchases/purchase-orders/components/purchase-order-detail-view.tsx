"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, FileText, Printer, XCircle, Building2, Calendar, Clock, CreditCard, Package, Phone, Mail, User, Send, PackageCheck } from "lucide-react"
import { formatCurrency, formatDate } from "../po-utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession } from "next-auth/react"
import { usePurchaseOrderItems } from "@/hooks/usePurchaseOrderQueries"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { sendPOToSupplier } from "@/actions/purchase-order"

interface PurchaseOrderDetailViewProps {
  purchaseOrder: any
  onEdit: (po: any) => void
  onCancel: (po: any) => void
  onPrint: () => void
  onExport: () => void
  onRefresh: () => void
  onReceiveInventory?: (po: any) => void
}

export default function PurchaseOrderDetailView({
  purchaseOrder,
  onEdit,
  onCancel,
  onPrint,
  onExport,
  onReceiveInventory,
}: PurchaseOrderDetailViewProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false)

  // Safely calculate total with fallbacks
  const subtotal = purchaseOrder.subtotal || 0
  const taxAmount = purchaseOrder.taxAmount || 0
  const shippingCost = purchaseOrder.shippingCost || 0
  const total = subtotal + taxAmount + shippingCost

  // Support both 'supplier' and 'supplier' fields for compatibility
  const supplierInfo = purchaseOrder.supplier || purchaseOrder.supplier
  const {data:session} = useSession()
  const website = process.env.NEXT_PUBLIC_BASE_URL
  const user = session?.user ?? ""
  const {lines = []} = usePurchaseOrderItems(purchaseOrder.itemId);

  // Calculate received status for each line
  const linesWithReceivedStatus = useMemo(() => {
    if (!purchaseOrder.lines) return []
    
    return purchaseOrder.lines.map((line: any) => {
      const ordered = line.quantity || 0
      const received = line.receivedQuantity || 0
      const isFullyReceived = received >= ordered
      const isPartiallyReceived = received > 0 && received < ordered
      
      return {
        ...line,
        isFullyReceived,
        isPartiallyReceived,
        remainingQuantity: ordered - received
      }
    })
  }, [purchaseOrder.lines])

  // Check if all items are fully received
  const allItemsReceived = useMemo(() => {
    if (!purchaseOrder.lines || purchaseOrder.lines.length === 0) return false
    return purchaseOrder.lines.every((line: any) => {
      const received = line.receivedQuantity || 0
      const ordered = line.quantity || 0
      return received >= ordered
    })
  }, [purchaseOrder.lines])

  // Button visibility logic based on status
  const canEdit = useMemo(() => {
    return ["DRAFT"].includes(purchaseOrder.status);
  }, [purchaseOrder.status]);

  const canSendEmail = useMemo(() => {
    return !["CANCELLED"].includes(purchaseOrder.status);
  }, [purchaseOrder.status]);

  const canReceive = useMemo(() => {
    return ["SUBMITTED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status) && !allItemsReceived;
  }, [purchaseOrder.status, allItemsReceived]);

  const canApprove = useMemo(() => {
    return ["SUBMITTED"].includes(purchaseOrder.status);
  }, [purchaseOrder.status]);

  const canCancel = useMemo(() => {
    return !["CANCELLED", "CLOSED"].includes(purchaseOrder.status);
  }, [purchaseOrder.status]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-blue-100 text-blue-800",
      ORDERED: "bg-purple-100 text-purple-800",
      PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
      RECEIVED: "bg-green-100 text-green-800",
      COMPLETED: "bg-green-600 text-white",
      CANCELLED: "bg-red-100 text-red-800",
      CLOSED: "bg-gray-600 text-white",
    }
    return colors[status] || colors.DRAFT
  }

  // Email handler function
  const handleSendEmail = async () => {
    // Validate supplier email before attempting to send
    if (!supplierInfo?.email) {
      toast.error("Supplier email address is not available");
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the server action with just the PO number
      const result = await sendPOToSupplier(purchaseOrder.poNumber);
      
      if (result.success) {
        toast.success(
          `Purchase Order ${purchaseOrder.poNumber} sent successfully to ${supplierInfo.name}`,
          {
            description: `Email delivered to ${supplierInfo.email}`
          }
        );
        
        // Refresh the page or update the status locally
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.error || "Failed to send purchase order");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("An unexpected error occurred while sending the email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-6 border-b bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-bold truncate">{purchaseOrder.poNumber || 'N/A'}</h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {supplierInfo?.name || purchaseOrder.supplierName || 'Unknown Supplier'} • {formatDate(purchaseOrder.orderDate || purchaseOrder.date)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getStatusColor(purchaseOrder.status || 'DRAFT')}>
              {purchaseOrder.status || 'DRAFT'}
            </Badge>
            
            {/* Receive Inventory Button - Only show when items need receiving */}
            {onReceiveInventory && canReceive && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onReceiveInventory(purchaseOrder)}
                className="gap-2 h-9 bg-pink-600 hover:bg-pink-700"
              >
                <PackageCheck className="h-4 w-4" />
                Receive Inventory
              </Button>
            )}

            {/* Send Email Button - Hide for CANCELLED */}
            {canSendEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={isLoading || !supplierInfo?.email}
                className="gap-2 h-9"
              >
                <Send className="h-4 w-4" />
                {isLoading ? "Sending..." : "Send Mail"}
              </Button>
            )}

            {/* Three dots menu - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Edit - Only show for DRAFT */}
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(purchaseOrder)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                
                {/* Send Mail - Hide for CANCELLED */}
                {canSendEmail && (
                  <DropdownMenuItem 
                    onClick={handleSendEmail}
                    disabled={isLoading || !supplierInfo?.email}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? "Sending..." : "Send Mail"}
                  </DropdownMenuItem>
                )}
                
                {/* Cancel Order - Hide for CANCELLED & CLOSED */}
                {canCancel && (
                  <DropdownMenuItem 
                    onClick={() => onCancel(purchaseOrder)} 
                    className="text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
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

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Supplier Card - Enhanced */}
            <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-slate-200/60">
              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base">Supplier Details</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-lg mb-1">
                      {supplierInfo?.name || purchaseOrder.supplierName || 'Unknown Supplier'}
                    </p>
                  </div>
                  
                  <div className="space-y-2 pt-1">
                    <div className="flex items-start gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {supplierInfo?.address || "No address provided"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {supplierInfo?.phone || "No phone number"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {supplierInfo?.email || "No email address"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Card - Enhanced */}
            <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-slate-200/60">
              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base">Order Details</h3>
                </div>
                
                <div className="grid gap-3">
                  <div className="hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Order Date
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm pl-5">
                      {formatDate(purchaseOrder.orderDate || purchaseOrder.date)}
                    </p>
                  </div>

                  {purchaseOrder.expectedDeliveryDate && (
                    <div className="hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Expected Delivery
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm pl-5">
                        {formatDate(purchaseOrder.expectedDeliveryDate)}
                      </p>
                    </div>
                  )}

                  {purchaseOrder.paymentTerms && (
                    <div className="hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Payment Terms
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm pl-5">
                        {purchaseOrder.paymentTerms}
                      </p>
                    </div>
                  )}

                  <div className="hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Created By
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm pl-5">
                      {purchaseOrder.createdBy?.name || 'System Admin'}
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
                      <th className="text-center py-3 px-4 font-semibold text-sm">Received</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Unit Price</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Tax</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesWithReceivedStatus && linesWithReceivedStatus.length > 0 ? (
                      linesWithReceivedStatus.map((line: any) => {
                        const unitPrice = line.unitPrice || 0
                        const quantity = line.quantity || 0
                        const received = line.receivedQuantity || 0
                        const taxRate = line.taxRate || 0
                        const lineTotal = quantity * unitPrice * (1 + taxRate / 100)
                        
                        return (
                          <tr key={line.id} className={`border-b hover:bg-slate-50 transition-colors ${line.isFullyReceived ? 'bg-green-50/30' : ''}`}>
                            <td className="py-3 px-4 text-sm">{line.item?.name || "Unknown Item"}</td>
                            <td className="py-3 px-4 text-sm text-center font-semibold">{quantity}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Badge 
                                  variant={line.isFullyReceived ? "default" : line.isPartiallyReceived ? "outline" : "secondary"}
                                  className={line.isFullyReceived ? "bg-green-100 text-green-800 border-green-200" : ""}
                                >
                                  {received} / {quantity}
                                </Badge>
                              </div>
                            </td>
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
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
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
          {purchaseOrder.notes && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {purchaseOrder.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}