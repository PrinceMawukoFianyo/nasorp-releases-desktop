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
      currency: 'USD',
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
            <TableHead className="text-right">Ordered Quantity</TableHead>
            <TableHead className="text-right">Received Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Tax Rate</TableHead>
            <TableHead className="text-right">Line Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right font-semibold">{item.receivedQuantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-right">{item.taxRate}%</TableCell>
                <TableCell className="text-right font-semibold">
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
            <TableCell colSpan={4} className="text-right font-medium">
              Subtotal
            </TableCell>
            <TableCell className="text-right font-medium" colSpan={2}>
              {formatCurrency(subtotal)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-medium">
              Tax
            </TableCell>
            <TableCell className="text-right font-medium" colSpan={2}>
              {formatCurrency(totalTax)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-bold">
              Total
            </TableCell>
            <TableCell className="text-right font-bold" colSpan={2}>
              {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}