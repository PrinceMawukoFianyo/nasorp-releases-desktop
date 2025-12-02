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
import { Search } from "lucide-react";
import type { SalesByCustomer } from "@/actions/sales-reports";

interface SalesByCustomerTableProps {
  customers: SalesByCustomer[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
};

export function SalesByCustomerTable({ customers }: SalesByCustomerTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales by Customer</CardTitle>
            <CardDescription>Revenue breakdown by customer</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
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
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Avg Order Value</TableHead>
              <TableHead>Last Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.customerId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">{customer.totalOrders}</TableCell>
                <TableCell className="text-right">
                  {customer.totalQuantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(customer.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(customer.averageOrderValue)}
                </TableCell>
                <TableCell>{customer.lastOrderDate}</TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
