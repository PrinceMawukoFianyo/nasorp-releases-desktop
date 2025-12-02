// lib/utils.ts - Add these utility functions

export function formatCurrency(amount: number, currency: string = "GHS"): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj)
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-slate-100 text-slate-800"
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PARTIALLY_PAID: "bg-orange-100 text-orange-800",
    PAID: "bg-green-100 text-green-800",
    REFUNDED: "bg-purple-100 text-purple-800",
    CANCELLED: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-slate-100 text-slate-800"
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}