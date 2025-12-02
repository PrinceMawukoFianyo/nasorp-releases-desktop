"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  DataTable,
  Column,
  ConfirmationDialog,
} from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye } from "lucide-react"
import { 
  useOrgAdjustments, 
  useApproveAdjustment, 
  useCancelAdjustment 
} from "@/hooks/useStockAdjustmentQueries"
import { 
  BriefAdjustmentResponse, 
  adjustmentTypeLabels, 
  adjustmentStatusColors 
} from "@/types/stockAdjustments"

interface AdjustmentListingProps {
  title: string
  orgId: string
}

export default function AdjustmentListing({ title, orgId }: AdjustmentListingProps) {
  const router = useRouter()
  
  // React Query hooks - THIS FETCHES ADJUSTMENTS, NOT TRANSFERS
  const { adjustments, refetch } = useOrgAdjustments(orgId)
  const approveAdjustmentMutation = useApproveAdjustment()
  const cancelAdjustmentMutation = useCancelAdjustment()

  const [isPending, startTransition] = useTransition()
  
  // Local state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [adjustmentToApprove, setAdjustmentToApprove] = useState<BriefAdjustmentResponse | null>(null)
  const [adjustmentToCancel, setAdjustmentToCancel] = useState<BriefAdjustmentResponse | null>(null)

  // Format date function
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "MMM dd, yyyy")
  }

  // Export to Excel
  const handleExport = async (filteredAdjustments: BriefAdjustmentResponse[]) => {
    try {
      const exportData = filteredAdjustments.map((adjustment) => ({
        "Adjustment #": adjustment.adjustmentNumber,
        Date: formatDate(adjustment.date),
        Location: adjustment.location.name,
        Type: adjustmentTypeLabels[adjustment.adjustmentType],
        "Items Count": adjustment.lines.length,
        Reason: adjustment.reason,
        Status: adjustment.status,
        "Created By": adjustment.createdBy.name || adjustment.createdBy.email,
        "Approved By": adjustment.approvedBy?.name || "N/A",
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Adjustments")

      const fileName = `Adjustments_${format(new Date(), "yyyy-MM-dd")}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success("Export successful", {
        description: `Adjustments exported to ${fileName}`,
      })
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      })
    }
  }

  // Handle add new adjustment
  const handleAddClick = () => {
    startTransition(() => {
      router.push(`/dashboard/inventory/adjustments/create`)
    })
  }

  // Handle view adjustment
  const handleViewClick = (adjustment: BriefAdjustmentResponse) => {
    startTransition(() => {
      router.push(`/dashboard/inventory/adjustments/${adjustment.id}`)
    })
  }

  // Handle approve click
  const handleApproveClick = (adjustment: BriefAdjustmentResponse) => {
    setAdjustmentToApprove(adjustment)
    setApproveDialogOpen(true)
  }

  // Handle cancel click
  const handleCancelClick = (adjustment: BriefAdjustmentResponse) => {
    setAdjustmentToCancel(adjustment)
    setCancelDialogOpen(true)
  }

  // Confirm approve
  const handleConfirmApprove = () => {
    if (adjustmentToApprove) {
      approveAdjustmentMutation.mutate(adjustmentToApprove.id)
      setApproveDialogOpen(false)
    }
  }

  // Confirm cancel
  const handleConfirmCancel = () => {
    if (adjustmentToCancel) {
      cancelAdjustmentMutation.mutate(adjustmentToCancel.id)
      setCancelDialogOpen(false)
    }
  }

  // Define columns for the data table
  const columns: Column<BriefAdjustmentResponse>[] = [
    {
      header: "Adjustment #",
      accessorKey: "adjustmentNumber",
      cell: (row) => (
        <Link
          href={`/dashboard/inventory/adjustments/${row.id}`}
          className="font-mono text-sm text-rose-600 hover:text-rose-800 hover:underline"
        >
          {row.adjustmentNumber}
        </Link>
      ),
    },
    {
      header: "Date",
      accessorKey: (row) => formatDate(row.date),
    },
    {
      header: "Location",
      accessorKey: "location",
      cell: (row) => (
        <span className="font-medium">{row.location.name}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "adjustmentType",
      cell: (row) => (
        <span className="text-sm text-gray-700">
          {adjustmentTypeLabels[row.adjustmentType]}
        </span>
      ),
    },
    {
      header: "Items",
      accessorKey: (row) => row.lines.length,
      cell: (row) => (
        <span className="font-semibold text-gray-900">{row.lines.length}</span>
      ),
    },
    {
      header: "Reason",
      accessorKey: "reason",
      cell: (row) => (
        <span className="text-sm text-gray-600 line-clamp-1 max-w-[200px]">
          {row.reason.length > 40 ? `${row.reason.substring(0, 40)}...` : row.reason}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <Badge className={adjustmentStatusColors[row.status]}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Created By",
      accessorKey: "createdBy",
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.createdBy.name || row.createdBy.email}
        </span>
      ),
    },
  ]

  // Generate subtitle
  const getSubtitle = (adjustmentCount: number) => {
    const draftCount = adjustments.filter(a => a.status === "DRAFT").length
    const approvedCount = adjustments.filter(a => a.status === "APPROVED").length
    
    return `${adjustmentCount} ${adjustmentCount === 1 ? "adjustment" : "adjustments"} | ${draftCount} Draft | ${approvedCount} Approved`
  }

  return (
    <>
      <DataTable<BriefAdjustmentResponse>
        title={title}
        subtitle={
          adjustments.length > 0
            ? getSubtitle(adjustments.length)
            : undefined
        }
        data={adjustments}
        columns={columns}
        keyField="id"
        isLoading={false}
        onRefresh={refetch}
        actions={{
          onAdd: handleAddClick,
          onExport: handleExport,
        }}
        filters={{
          searchFields: ["adjustmentNumber", "reason"],
          enableDateFilter: true,
          getItemDate: (item) => item.date,
        }}
        renderRowActions={(item) => (
          <div className="flex items-center gap-2">
            {item.status === "DRAFT" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApproveClick(item)}
                  disabled={approveAdjustmentMutation.isPending}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelClick(item)}
                  disabled={cancelAdjustmentMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewClick(item)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        )}
      />

      {/* Approve Confirmation Dialog */}
      <ConfirmationDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Adjustment"
        description={
          adjustmentToApprove ? (
            <>
              Are you sure you want to approve adjustment{" "}
              <strong>{adjustmentToApprove.adjustmentNumber}</strong>? This will
              update inventory levels and cannot be undone.
            </>
          ) : (
            "Are you sure you want to approve this adjustment?"
          )
        }
        onConfirm={handleConfirmApprove}
        isConfirming={approveAdjustmentMutation.isPending}
        confirmLabel="Approve"
        variant="default"
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Adjustment"
        description={
          adjustmentToCancel ? (
            <>
              Are you sure you want to cancel adjustment{" "}
              <strong>{adjustmentToCancel.adjustmentNumber}</strong>? This
              action cannot be undone.
            </>
          ) : (
            "Are you sure you want to cancel this adjustment?"
          )
        }
        onConfirm={handleConfirmCancel}
        isConfirming={cancelAdjustmentMutation.isPending}
        confirmLabel="Cancel Adjustment"
        variant="destructive"
      />
    </>
  )
}