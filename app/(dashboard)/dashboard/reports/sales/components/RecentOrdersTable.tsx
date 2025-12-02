"use client";

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
import { Badge } from "@/components/ui/badge";

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: string;
  itemCount: number;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    DRAFT: "secondary",
    CONFIRMED: "default",
    PROCESSING: "default",
    SHIPPED: "default",
    DELIVERED: "default",
    COMPLETED: "default",
    CANCELLED: "destructive",
  };
  return colors[status] || "secondary";
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest sales transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>{order.itemCount}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(order.status) as any}>
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No recent orders
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}