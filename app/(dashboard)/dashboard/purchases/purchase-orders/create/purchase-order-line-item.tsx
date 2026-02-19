// FILE: app/dashboard/purchases/purchase-orders/components/purchase-order-line-item.tsx
"use client"

import { formatCurrency, formatDate } from "../po-utils"
import { Decimal } from "@prisma/client/runtime/library"

interface PurchaseOrderLineItemData {
  id: string
  quantity: number
  unitPrice: Decimal | number
  taxRate: number
  receivedQuantity: number
  item: {
    id: string
    name: string
    sku: string
    description?: string
  }
}

interface PurchaseOrderLineItemProps {
  lineItem: PurchaseOrderLineItemData
}

export default function PurchaseOrderLineItem({
  lineItem,
}: PurchaseOrderLineItemProps) {
  const unitPrice = typeof lineItem.unitPrice === "string" 
    ? parseFloat(lineItem.unitPrice) 
    : Number(lineItem.unitPrice)
  const subtotal = lineItem.quantity * unitPrice
  const tax = subtotal * (lineItem.taxRate / 100)
  const total = subtotal + tax

  const isFullyReceived = lineItem.receivedQuantity >= lineItem.quantity
  const isPartiallyReceived = lineItem.receivedQuantity > 0 && !isFullyReceived

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 text-sm">
        <div>
          <p className="font-medium">{lineItem.item.name}</p>
          <p className="text-xs text-muted-foreground">{lineItem.item.sku}</p>
          {lineItem.item.description && (
            <p className="text-xs text-muted-foreground mt-1">{lineItem.item.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-center">{lineItem.quantity}</td>
      <td className="px-4 py-3 text-sm text-right">
        {formatCurrency(unitPrice)}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {formatCurrency(subtotal)}
      </td>
      <td className="px-4 py-3 text-sm text-center">{lineItem.taxRate}%</td>
      <td className="px-4 py-3 text-sm text-right font-semibold">
        {formatCurrency(total)}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        <div className="flex flex-col items-center">
          <span className={`font-medium ${
            isFullyReceived ? 'text-green-600' : 
            isPartiallyReceived ? 'text-amber-600' : 'text-gray-600'
          }`}>
            {lineItem.receivedQuantity} / {lineItem.quantity}
          </span>
          {isFullyReceived && (
            <span className="text-xs text-green-600 mt-1">✓ Fully Received</span>
          )}
          {isPartiallyReceived && (
            <span className="text-xs text-amber-600 mt-1">Partial</span>
          )}
        </div>
      </td>
    </tr>
  )
}