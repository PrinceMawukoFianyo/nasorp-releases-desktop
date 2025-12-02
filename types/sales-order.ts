// types/sales-order.ts
export type SalesOrder ={
  id: string
  orderNumber: string
  customerId: string
  locationId: string
  orderDate: string
  deliveryDate?: string | null
  status: string
  paymentMethod?: PaymentMethod 
  paymentStatus: string
  shippingCost: number
  discount: number
  subtotal: number
  taxAmount: number
  createdBy?: User 
  notes?: string
  orgId: string
  createdById: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
  location?: {
    id: string
    name: string
  }
  lines?: Array<{
    id: string
    itemId: string
    quantity: number
    unitPrice: number
    taxRate: number
    taxAmount: number
    total: number
    item?: {
      id: string
      name: string
      sku: string
    }
  }>
}

export type CreateSalesOrderData = {
  orderNumber: string
  customerId: string
  locationId: string
  orderDate: Date
  deliveryDate?: Date | null
  status: string
  paymentStatus: string
  shippingCost: number
  discount: number
  notes?: string
  subtotal: number
  taxAmount: number
  lines: {
    create: Array<{
      itemId: string
      quantity: number
      unitPrice: number
      taxRate: number
      taxAmount: number
      total: number
      serialNumbers: string[]
    }>
  }
}

export type PaymentMethod = 
  | "CASH"
  | "CREDIT_CARD" 
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "DIGITAL_WALLET"
  | "NOT_SPECIFIED"

export type User = {
  id: string
  name?: string
  email: string
  avatar?: string
}

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED"
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED"