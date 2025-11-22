import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TransferStatusTimeline } from "../components/transfer-status-timeline"
import { TransferLineTable } from "../components/transfer-line-table"
import { TransferActions } from "../components/transfer-actions"
import { TransferSkeleton } from "../components/transfer-skeleton"
import { getTransferDetails } from "@/actions/transfer-stock-history"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface TransferDetailPageProps {
  params: { id: string }
}

async function TransferDetailView({ transferId }: { transferId: string }) {
  const { success, transfer, error } = await getTransferDetails(transferId)

  if (!success || !transfer) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error || "Transfer not found"}</p>
        <Link href="/dashboard/inventory/transfers" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Transfers
        </Link>
      </div>
    )
  }

  const statusBadgeColor = {
    DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-300",
    IN_TRANSIT: "bg-orange-100 text-orange-800 border-orange-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
  }

  const getTimelineEvents = () => {
    const baseEvents = [
      {
        status: "CREATED" as const,
        label: "Created",
        description: "Transfer created and in draft",
        date: transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : "",
        completed: true,
        current: transfer.status === "DRAFT",
      },
      {
        status: "APPROVED" as const,
        label: "Approved",
        description: "Transfer approved and ready for movement",
        date: transfer.approvedBy ? new Date(transfer.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : "",
        completed: ["APPROVED", "IN_TRANSIT", "COMPLETED"].includes(transfer.status),
        current: transfer.status === "APPROVED",
      },
      {
        status: "IN_TRANSIT" as const,
        label: "In Transit",
        description: "Items are being moved between locations",
        date: "",
        completed: ["IN_TRANSIT", "COMPLETED"].includes(transfer.status),
        current: transfer.status === "IN_TRANSIT",
      },
      {
        status: "COMPLETED" as const,
        label: "Completed",
        description: "Transfer successfully completed",
        date: transfer.status === "COMPLETED" ? new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : "",
        completed: transfer.status === "COMPLETED",
        current: false,
      },
    ]

    if (transfer.status === "CANCELLED") {
      return baseEvents.map(event => ({
        ...event,
        completed: event.status === "CREATED",
        current: false
      }))
    }

    return baseEvents
  }

  const transformedLines = transfer.lines.map(line => ({
    ...line,
    notes: line.notes || undefined,
  }))

  const totalItems = transfer.lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/inventory/transfers" 
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transfers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Transfer {transfer.transferNumber}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusBadgeColor[transfer.status as keyof typeof statusBadgeColor]}`}
            >
              {transfer.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* From Location */}
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-medium text-gray-600">From Location</h3>
            <p className="text-xs text-gray-500">Source of items</p>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{transfer.fromLocation.name}</p>
          </CardContent>
        </Card>

        {/* To Location */}
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-medium text-gray-600">To Location</h3>
            <p className="text-xs text-gray-500">Destination for items</p>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{transfer.toLocation.name}</p>
          </CardContent>
        </Card>

        {/* Transfer Details */}
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-medium text-gray-600">Transfer Details</h3>
            <p className="text-xs text-gray-500">Information about this transfer</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{new Date(transfer.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-medium">{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created By:</span>
              <span className="font-medium">{transfer.createdBy.name || transfer.createdBy.email}</span>
            </div>
            {transfer.approvedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Approved By:</span>
                <span className="font-medium">{transfer.approvedBy.name || transfer.approvedBy.email}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">{new Date(transfer.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Transfer Actions</h3>
              <p className="text-sm text-gray-600">Update the status of this transfer</p>
            </div>
            <TransferActions 
              transferId={transfer.id} 
              status={transfer.status} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Timeline */}
        <Card>
          <CardContent className="p-6">
            <TransferStatusTimeline events={getTimelineEvents()} />
          </CardContent>
        </Card>

        {/* Transfer Items */}
        <Card>
          <CardContent className="p-6">
            <TransferLineTable lines={transformedLines} />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {transfer.notes && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Notes</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{transfer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TransferDetailContent({ transferId }: { transferId: string }) {
  return (
    <Suspense fallback={<TransferSkeleton />}>
      <TransferDetailView transferId={transferId} />
    </Suspense>
  )
}

export default function TransferDetailPage({ params }: TransferDetailPageProps) {
  return <TransferDetailContent transferId={params.id} />
}