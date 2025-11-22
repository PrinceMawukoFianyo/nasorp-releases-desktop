import { PO_STATUS_COLORS, POStatus } from "../po-utils"


interface PurchaseStatusBadgeProps {
  status: POStatus
  className?: string
}

export default function PurchaseStatusBadge({
  status,
  className = "",
}: PurchaseStatusBadgeProps) {
  const statusColor = PO_STATUS_COLORS[status]

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text} ${className}`}
    >
      {statusColor.label}
    </span>
  )
}