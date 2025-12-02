// types/adjustment.ts

export type AdjustmentStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED"
export type AdjustmentType = "STOCk_COUNT" | "DAMAGE" | "THEFT" | "EXPIRED" | "WRITE_OFF" | "CORRECTION" | "OTHER"

export interface BriefAdjustmentResponse {
  id: string
  adjustmentNumber: string
  date: Date
  locationId: string
  location: {
    name: string
  }
  adjustmentType: AdjustmentType
  reason: string
  notes: string | null
  status: AdjustmentStatus
  createdById: string
  createdBy: {
    name: string | null
    email: string
  }
  approvedById: string | null
  approvedBy: {
    name: string | null
  } | null
  lines: {
    id: string
  }[]
  createdAt: Date
  updatedAt: Date
}

export const adjustmentTypeLabels: Record<AdjustmentType, string> = {
  STOCk_COUNT: "Stock Count",
  DAMAGE: "Damage",
  THEFT: "Theft",
  EXPIRED: "Expired",
  WRITE_OFF: "Write Off",
  CORRECTION: "Correction",
  OTHER: "Other",
}

export const adjustmentStatusColors: Record<AdjustmentStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
}


export interface DetailedAdjustmentResponse extends BriefAdjustmentResponse {
    approvedBy: {
    id: string
    name: string | null
    email: string
  } | null 
    lines: {
    id: string
    adjustmentId: string
    itemId: string
    item: {
      id: string
      name: string
      sku: string
      thumbnail: string | null
      category: {
        title: string
      } | null
    }
    beforeQuantity: number
    afterQuantity: number
    adjsutedQuantity: number
    notes: string | null
    serialNumbers: string[]
    createdAt: Date
    updatedAt: Date
  }[]
}