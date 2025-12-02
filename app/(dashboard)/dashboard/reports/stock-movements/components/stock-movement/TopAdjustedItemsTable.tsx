"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TopAdjustedItem {
  itemName: string;
  sku: string;
  totalAdjustments: number;
  quantityAdjusted: number;
}

interface TopAdjustedItemsTableProps {
  items: TopAdjustedItem[];
}

export function TopAdjustedItemsTable({ items }: TopAdjustedItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Adjusted Items</CardTitle>
        <CardDescription>Items with most adjustments</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Adjustments</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell>{item.sku}</TableCell>
                <TableCell className="text-right">{item.totalAdjustments}</TableCell>
                <TableCell className="text-right font-semibold">
                  {item.quantityAdjusted.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No adjusted items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}