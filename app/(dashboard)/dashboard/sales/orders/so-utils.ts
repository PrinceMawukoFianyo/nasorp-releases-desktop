// app/dashboard/sales/orders/so-utils.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount)
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return 'N/A'
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return new Intl.DateTimeFormat('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    DRAFT: 'bg-gray-100 text-gray-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPaymentStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-red-100 text-red-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}