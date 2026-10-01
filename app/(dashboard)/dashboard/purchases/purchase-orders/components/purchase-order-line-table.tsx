import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PurchaseOrderLineItem from "../create/purchase-order-line-item"
import { formatCurrency } from "../po-utils"
import { Decimal } from "@/generated/prisma-client/runtime/library"
import { useSession } from "next-auth/react"

interface LineItemData {
  id: string
  quantity: number
  itemId: string
  unitPrice: Decimal | number
  taxRate: number
  taxAmount: number
  discount?: number | null
  total: number
  receivedQuantity: number
  item: {
    id: string
    name: string
    sku: string
    description?: string
  }
}

interface PurchaseOrderLineTableProps {
  lineItems: LineItemData[]
  shippingCost?: Decimal | number
}

export default function PurchaseOrderLineTable({
  lineItems,
  shippingCost = 0,
}: PurchaseOrderLineTableProps) {
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : Number(item.unitPrice)
      return sum + item.quantity * unitPrice
    }, 0)
  }

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : Number(item.unitPrice)
      const subtotal = item.quantity * unitPrice
      return sum + subtotal * (item.taxRate / 100)
    }, 0)
  }

  const subtotal = calculateSubtotal()
  const tax = calculateTax()
  const shipping = typeof shippingCost === "string" 
    ? parseFloat(shippingCost) 
    : Number(shippingCost)
  const total = subtotal + tax + shipping
  const{ data:session} =useSession()
  const user = session?.user as any
  const companyName =user?.orgName?? "";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-center font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                <th className="px-4 py-3 text-center font-semibold">Tax %</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No line items in this purchase order.
                  </td>
                </tr>
              ) : (
                lineItems.map((lineItem) => (
                  <PurchaseOrderLineItem
                    key={lineItem.id}
                    lineItem={lineItem}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {lineItems.length > 0 && (
          <div className="mt-6 space-y-2 flex flex-col items-end">
            <div className="flex gap-4 text-sm w-64">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold text-right flex-1">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex gap-4 text-sm w-64">
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-semibold text-right flex-1">
                {formatCurrency(tax)}
              </span>
            </div>
            {shipping > 0 && (
              <div className="flex gap-4 text-sm w-64">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-semibold text-right flex-1">
                  {formatCurrency(shipping)}
                </span>
              </div>
            )}
            <div className="border-t pt-2 flex gap-4 text-base w-64 mt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-right flex-1 text-lg">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
