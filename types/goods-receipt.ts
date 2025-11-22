export interface GoodsReceiptLineItem {
  purchaseOrderLineId: string
  receivedQuantity: number
  notes?: string
  serialNumbers?: string[]
}

export interface CreateGoodsReceiptRequest {
  purchaseOrderId: string
  locationId: string
  items: GoodsReceiptLineItem[]
  notes?: string
}

export interface UpdateGoodsReceiptRequest {
  id: string
  locationId?: string
  notes?: string
  status?: string
}

export interface UpdateGoodsReceiptStatusRequest {
  id: string
  status?: string
  notes?: string
}

export interface GoodsReceiptFilter {
  status?: string
  search?: string
}

export interface GoodsReceiptWithRelations {
  id: string
  receiptNumber: string
  purchaseOrderId: string
  locationId: string
  receivedDate: Date
  receivedById: string
  status: string
  notes?: string
  total?: number
  orgId: string
  purchaseOrder?: {
    id: string
    poNumber: string
    status: string
    supplier?: {
      id: string
      name: string
      email?: string
      phone?: string
    }
  }
  location?: {
    id: string
    name: string
    address?: string
  }
  receivedBy?: {
    id: string
    name: string
    email: string
  }
  lines: Array<{
    id: string
    receivedQuantity: number
    notes?: string
    serialNumbers: string[]
    unitPrice?: number
    item?: {
      id: string
      name: string
      sku?: string
      description?: string
    }
    purchaseOrderLine?: {
      quantity: number
      unitPrice: number
      receivedQuantity: number
    }
  }>
}

// Response type guards
export function isGoodsReceiptSuccessResponse(
  response: any
): response is { success: true; data: any } {
  return response.success === true && 'data' in response
}

export function isGoodsReceiptErrorResponse(
  response: any
): response is { success: false; error: string } {
  return response.success === false && 'error' in response
}