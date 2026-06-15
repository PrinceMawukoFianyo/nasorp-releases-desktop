"use client"

import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { formatCurrency, formatDate } from "../po-utils"

interface PurchaseOrderCardProps {
  purchaseOrder: any
  isSelected: boolean
  onClick: () => void
}

export default function PurchaseOrderCard({ purchaseOrder, isSelected, onClick }: PurchaseOrderCardProps) {
  const total = purchaseOrder.subtotal + purchaseOrder.taxAmount + (purchaseOrder.shippingCost || 0)

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; badge: string }> = {
      DRAFT: { bg: "bg-slate-50", text: "text-slate-700", badge: "bg-slate-100 text-slate-700" },
      PENDING: { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
      APPROVED: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
      SUBMITTED: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
      PARTIALLY_RECEIVED: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
      RECEIVED: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700" },
      COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
      CANCELLED: { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700" },
    }
    return colors[status] || colors.DRAFT
  }

  const statusColor = getStatusColor(purchaseOrder.status)
  const statusLabel = purchaseOrder.status.replace(/_/g, " ")

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 truncate">{purchaseOrder.poNumber}</h3>
            <p className="text-sm text-slate-600 truncate">{purchaseOrder.supplier?.name || "Unknown Supplier"}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs text-slate-500">{formatDate(purchaseOrder.orderDate)}</span>
        <div className="flex items-center gap-2">
          <Badge className={`${statusColor.badge} text-xs font-medium px-2 py-1`}>{statusLabel}</Badge>
          {purchaseOrder.paymentStatus === "PAID" && (
            <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1">✓ Paid</Badge>
          )}
          {purchaseOrder.paymentStatus === "PARTIAL" && (
            <Badge className="bg-amber-100 text-amber-700 text-xs px-2 py-1">Partial Payment</Badge>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className="font-bold text-slate-900">{formatCurrency(total)}</p>
      </div>
    </button>
  )
}