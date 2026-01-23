"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SalesByCustomer, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";

interface SalesByCustomerReportProps {
  data: {
    customers: SalesByCustomer[];
    summary: SalesSummary;
  };
}

export default function SalesByCustomerReport({ data }: SalesByCustomerReportProps) {
  const { customers, summary } = data;
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("revenue");
  const [dateRange, setDateRange] = useState("30");

  // Determine customer segment based on revenue
  const getCustomerSegment = (customer: SalesByCustomer) => {
    if (customer.totalRevenue > 200) return "VIP";
    if (customer.totalOrders === 1) return "New";
    return "Regular";
  };

  // Filter and sort customers
  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      const segment = getCustomerSegment(customer);
      const matchesSegment = segmentFilter === "all" || segment === segmentFilter;
      
      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => {
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "orders") return b.totalOrders - a.totalOrders;
      if (sortBy === "name") return a.customerName.localeCompare(b.customerName);
      return 0;
    });

  // Top performers for chart
  const topCustomers = customers.slice(0, 5).map((customer, index) => ({
    rank: index + 1,
    name: customer.customerName,
    value: customer.totalRevenue,
    orders: customer.totalOrders,
    percentage: (customer.totalRevenue / summary.totalRevenue) * 100,
  }));

  // Segment analysis
  const segments = {
    vip: customers.filter(c => getCustomerSegment(c) === "VIP").length,
    regular: customers.filter(c => getCustomerSegment(c) === "Regular").length,
    new: customers.filter(c => getCustomerSegment(c) === "New").length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const handleExport = () => {
    toast.info("Exporting customer report...");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales by Customer</h1>
          <p className="text-muted-foreground mt-1">
            Detailed customer sales analysis and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="New">New</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="orders">Sort by Orders</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - 3 Column Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-green-600">₵</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">From {summary.totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600">🛒</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Sales transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600">📈</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600">👥</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-green-600">💰</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.netRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">After tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600">🧾</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalTax)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tax collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Customer Details</TabsTrigger>
          <TabsTrigger value="chart">Top Performers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Customer Sales Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredCustomers.length} customers
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Customer</th>
                      <th className="text-left p-3 text-sm font-semibold">Segment</th>
                      <th className="text-right p-3 text-sm font-semibold">Orders</th>
                      <th className="text-right p-3 text-sm font-semibold">Quantity</th>
                      <th className="text-right p-3 text-sm font-semibold">Total Revenue</th>
                      <th className="text-right p-3 text-sm font-semibold">Avg Order</th>
                      <th className="text-left p-3 text-sm font-semibold">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const segment = getCustomerSegment(customer);
                      return (
                        <tr key={customer.customerId} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{customer.customerName}</p>
                              <p className="text-xs text-muted-foreground">{customer.customerEmail}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={segment === "VIP" ? "default" : "secondary"}>
                              {segment}
                            </Badge>
                          </td>
                          <td className="text-right p-3">{customer.totalOrders}</td>
                          <td className="text-right p-3">{customer.totalQuantity}</td>
                          <td className="text-right p-3 font-semibold text-green-600">
                            {formatCurrency(customer.totalRevenue)}
                          </td>
                          <td className="text-right p-3">{formatCurrency(customer.averageOrderValue)}</td>
                          <td className="text-left p-3 text-sm">{customer.lastOrderDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Top performing customers</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {topCustomers.map((customer) => (
                <div key={customer.rank} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 flex-shrink-0">
                    {customer.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(customer.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                        style={{ width: `${customer.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 inline-block">
                      {customer.orders} orders
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">VIP Customers</span>
                  <span className="font-semibold">
                    {segments.vip} ({Math.round((segments.vip / customers.length) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Regular Customers</span>
                  <span className="font-semibold">
                    {segments.regular} ({Math.round((segments.regular / customers.length) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Customers</span>
                  <span className="font-semibold">
                    {segments.new} ({Math.round((segments.new / customers.length) * 100)}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Items/Order</span>
                  <span className="font-semibold">
                    {(customers.reduce((acc, c) => acc + c.totalQuantity, 0) / summary.totalOrders).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Repeat Purchase Rate</span>
                  <span className="font-semibold">
                    {Math.round((customers.filter(c => c.totalOrders > 1).length / customers.length) * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer Lifetime Value</span>
                  <span className="font-semibold">
                    {formatCurrency(summary.totalRevenue / customers.length)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}