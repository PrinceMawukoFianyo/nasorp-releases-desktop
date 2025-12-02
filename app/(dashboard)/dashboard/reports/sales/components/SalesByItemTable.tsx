"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { SalesByItem } from "@/actions/sales-reports";

interface SalesByItemTableProps {
  items: SalesByItem[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
};

export function SalesByItemTable({ items }: SalesByItemTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales by Item</CardTitle>
            <CardDescription>Product performance breakdown</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Avg Price</TableHead>
              <TableHead className="text-right">Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {item.category && (
                    <Badge variant="outline">{item.category}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {item.totalQuantitySold.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatCurrency(item.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.averagePrice)}
                </TableCell>
                <TableCell className="text-right">{item.totalOrders}</TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}