"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, CheckCircle, XCircle, Printer, Package, Calendar, MapPin, User, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"  
import { ConfirmationDialog } from "@/components/ui/data-table"
import { toast } from "sonner"
import { approveAdjustment, cancelAdjustment } from "@/actions/stock-adjustments"
import { 
  DetailedAdjustmentResponse, 
  adjustmentTypeLabels, 
  adjustmentStatusColors 
} from "@/types/stockAdjustments"

interface AdjustmentDetailProps {
  adjustment: DetailedAdjustmentResponse
}

export default function AdjustmentDetail({ adjustment }: AdjustmentDetailProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Format date
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "MMM dd, yyyy 'at' hh:mm a")
  }

  // Handle approve
  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const result = await approveAdjustment(adjustment.id)
      if (result.success) {
        toast.success("Adjustment approved", {
          description: "Inventory levels have been updated successfully",
        })
        router.refresh()
      } else {
        toast.error("Failed to approve adjustment", {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Failed to approve adjustment",
      })
    } finally {
      setIsProcessing(false)
      setApproveDialogOpen(false)
    }
  }

  // Handle cancel
  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      const result = await cancelAdjustment(adjustment.id)
      if (result.success) {
        toast.success("Adjustment cancelled", {
          description: "The adjustment has been cancelled successfully",
        })
        router.refresh()
      } else {
        toast.error("Failed to cancel adjustment", {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Failed to cancel adjustment",
      })
    } finally {
      setIsProcessing(false)
      setCancelDialogOpen(false)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/dashboard/inventory/adjustments" 
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Adjustments
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {adjustment.adjustmentNumber}
              </h1>
              <Badge className={adjustmentStatusColors[adjustment.status]}>
                {adjustment.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {adjustmentTypeLabels[adjustment.adjustmentType]} • {adjustment.lines.length} items
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {adjustment.status === "DRAFT" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={isProcessing}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={isProcessing}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Adjustment Items */}
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adjustment.lines.map((line) => {
                    const difference = line.adjsutedQuantity
                    const isIncrease = difference > 0
                    const isDecrease = difference < 0

                    return (
                      <div 
                        key={line.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Item Image */}
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {line.item.thumbnail ? (
                              <img 
                                src={line.item.thumbnail} 
                                alt={line.item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-gray-400" />
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {line.item.name}
                            </h3>
                            <p className="text-sm text-gray-600 font-mono mt-1">
                              {line.item.sku}
                            </p>
                            {line.item.category && (
                              <p className="text-xs text-gray-500 mt-1">
                                {line.item.category.title}
                              </p>
                            )}
                            {line.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                                {line.notes}
                              </p>
                            )}
                          </div>

                          {/* Quantities */}
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Before</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {line.beforeQuantity}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">After</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {line.afterQuantity}
                              </p>
                            </div>
                            <div className="text-center min-w-[100px]">
                              <p className="text-xs text-gray-500 mb-1">Change</p>
                              <p className={`text-2xl font-bold ${
                                isIncrease ? 'text-green-600' :
                                isDecrease ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {isIncrease && '+'}{difference}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Serial Numbers */}
                        {line.serialNumbers && line.serialNumbers.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Serial Numbers:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {line.serialNumbers.map((serial, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs font-mono bg-gray-100 px-2 py-1 rounded"
                                >
                                  {serial}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            {adjustment.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {adjustment.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Adjustment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">{formatDate(adjustment.date)}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">{adjustment.location.name}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Type</p>
                    <p className="text-sm text-gray-600">
                      {adjustmentTypeLabels[adjustment.adjustmentType]}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Reason</p>
                    <p className="text-sm text-gray-600">{adjustment.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* People */}
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created By</p>
                    <p className="text-sm text-gray-600">
                      {adjustment.createdBy.name || adjustment.createdBy.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(adjustment.createdAt)}
                    </p>
                  </div>
                </div>

                {adjustment.approvedBy && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Approved By</p>
                        <p className="text-sm text-gray-600">
                          {adjustment.approvedBy.name || adjustment.approvedBy.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(adjustment.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Items</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {adjustment.lines.length}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Increase</span>
                  <span className="text-sm font-semibold text-green-600">
                    +{adjustment.lines.reduce((sum, line) => 
                      sum + (line.adjsutedQuantity > 0 ? line.adjsutedQuantity : 0), 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Decrease</span>
                  <span className="text-sm font-semibold text-red-600">
                    {adjustment.lines.reduce((sum, line) => 
                      sum + (line.adjsutedQuantity < 0 ? line.adjsutedQuantity : 0), 0
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmationDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Adjustment"
        description={
          <>
            Are you sure you want to approve adjustment{" "}
            <strong>{adjustment.adjustmentNumber}</strong>? This will update
            inventory levels and cannot be undone.
          </>
        }
        onConfirm={handleApprove}
        isConfirming={isProcessing}
        confirmLabel="Approve"
        variant="default"
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Adjustment"
        description={
          <>
            Are you sure you want to cancel adjustment{" "}
            <strong>{adjustment.adjustmentNumber}</strong>? This action cannot
            be undone.
          </>
        }
        onConfirm={handleCancel}
        isConfirming={isProcessing}
        confirmLabel="Cancel Adjustment"
        variant="destructive"
      />
    </>
  )
}