// goods-receipt-line-table.tsx
'use client'

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table'

interface GoodsReceiptLineItem {
  id: string
  itemName: string
  quantity: number
  receivedQuantity: number
  unitPrice: number // Make this required
  taxRate: number
}

interface GoodsReceiptLineTableProps {
  items: GoodsReceiptLineItem[]
  showActions?: boolean
}

export function GoodsReceiptLineTable({ items, showActions = false }: GoodsReceiptLineTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
    }).format(value)
  }

  const calculateLineTotal = (quantity: number, unitPrice: number, taxRate: number) => {
    return quantity * unitPrice * (1 + taxRate / 100)
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + item.receivedQuantity * item.unitPrice
  }, 0)

  const totalTax = items.reduce((sum, item) => {
    return sum + item.receivedQuantity * item.unitPrice * (item.taxRate / 100)
  }, 0)

  const total = subtotal + totalTax

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-riUSt">Ordered Quantity</TableHead>
            <TableHead className="text-riUSt">Received Quantity</TableHead>
            <TableHead className="text-riUSt">Unit Price</TableHead>
            <TableHead className="text-riUSt">Tax Rate</TableHead>
            <TableHead className="text-riUSt">Line Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-riUSt">{item.quantity}</TableCell>
                <TableCell className="text-riUSt font-semibold">{item.receivedQuantity}</TableCell>
                <TableCell className="text-riUSt">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-riUSt">{item.taxRate}%</TableCell>
                <TableCell className="text-riUSt font-semibold">
                  {formatCurrency(calculateLineTotal(item.receivedQuantity, item.unitPrice, item.taxRate))}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-riUSt font-medium">
              Subtotal
            </TableCell>
            <TableCell className="text-riUSt font-medium" colSpan={2}>
              {formatCurrency(subtotal)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="text-riUSt font-medium">
              Tax
            </TableCell>
            <TableCell className="text-riUSt font-medium" colSpan={2}>
              {formatCurrency(totalTax)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="text-riUSt font-bold">
              Total
            </TableCell>
            <TableCell className="text-riUSt font-bold" colSpan={2}>
              {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}