export type SalesOrderStatus = 
  | "DRAFT"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED"

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED"

export interface CustomerWithOrders {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  isActive: boolean
  orgId: string
  createdAt: Date
  updatedAt: Date
  salesOrders: SalesOrder[]
}

export interface SalesOrder {
  id: string
  orderNumber: string
  customerId: string | null
  locationId: string
  location: {
    id: string
    name: string
  }
  status: SalesOrderStatus
  subtotal: number
  taxAmount: number
  shippingCost: number | null
  discount: number | null
  notes: string | null
  paymentStatus: PaymentStatus
  paymentMethod: string | null
  orgId: string
  createdById: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  lines: SalesOrderLine[]
  createdAt: Date
  updatedAt: Date
}

export interface SalesOrderLine {
  id: string
  salesOrderId: string
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    thumbnail: string | null
  }
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  discount: number | null
  total: number
  serialNumbers: string[]
  createdAt: Date
  updatedAt: Date
}

export const salesOrderStatusLabels: Record<SalesOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
}

export const salesOrderStatusColors: Record<SalesOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURNED: "bg-orange-100 text-orange-800",
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
}

export const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  REFUNDED: "bg-red-100 text-red-800",
}


export type CustomerCreateProps = {
  
  name: string;
  address?: string;
  email?: string;
  phone?: string;
      
}
export interface CustomerResponse {
  id:           string;       
  name:         string;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  taxId:        string | null;
  imageUrl:     string | null;
  notes:        string | null;
  isActive:     boolean; 
  createdAt: Date;
  updatedAt: Date;

}

export type BriefCustomerResponse = {
  id: string,
  name: string,
  address: string | null,
  phone: string | null,
  email: string | null,
  imageUrl?: string | null,   
  createdAt: Date,
}
