import { Decimal } from "@prisma/client/runtime/library"

export const PO_STATUS = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
  BILLED: "BILLED",
  PARTIALLY_BILLED: "PARTIALLY_BILLED",
} as const

/* export type POStatus = typeof PO_STATUS[keyof typeof PO_STATUS] */
export type POStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED"

export const PO_STATUS_COLORS: Record<POStatus, { bg: string; text: string; label: string }> = {
  /* DRAFT: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
  OPEN: { bg: "bg-rose-100", text: "text-rose-700", label: "Open" },
  PARTIALLY_RECEIVED: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Partially Received" },
  RECEIVED: { bg: "bg-green-100", text: "text-green-700", label: "Received" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  BILLED: { bg: "bg-purple-100", text: "text-purple-700", label: "Billed" },
  PARTIALLY_BILLED: { bg: "bg-orange-100", text: "text-orange-700", label: "Partially Billed" }, */
  DRAFT: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  APPROVED: { bg: "bg-rose-100", text: "text-rose-800", label: "Approved" },
  ORDERED: { bg: "bg-purple-100", text: "text-purple-800", label: "Ordered" },
  PARTIALLY_RECEIVED: { bg: "bg-orange-100", text: "text-orange-800", label: "Partially Received" },
  RECEIVED: { bg: "bg-green-100", text: "text-green-800", label: "Received" },
  COMPLETED: { bg: "bg-green-600", text: "text-white", label: "Completed" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
}

export function calculateLineItemTotal(
  quantity: number,
  unitPrice: Decimal | number,
  taxRate: number = 0
): number {
  const price = typeof unitPrice === "number" ? unitPrice : unitPrice.toNumber()
  const subtotal = price * quantity
  const tax = subtotal * (taxRate / 100)
  return subtotal + tax
}

export function calculatePOTotal(
  lineItems: Array<{ quantity: number; unitPrice: Decimal | number; taxRate: number }>,
  shippingCost: Decimal | number = 0
): number {
  let total = 0

  for (const item of lineItems) {
    total += calculateLineItemTotal(item.quantity, item.unitPrice, item.taxRate)
  }

  const shipping = typeof shippingCost === "number" ? shippingCost : shippingCost.toNumber()
  return total + shipping
}

export function formatCurrency(value: Decimal | number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : value.toNumber()
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
  // Handle null or undefined dates
  if (!date) return 'N/A'
  
  try {
    const d = typeof date === "string" ? new Date(date) : date
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid Date'
    }
    
    return d.toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}