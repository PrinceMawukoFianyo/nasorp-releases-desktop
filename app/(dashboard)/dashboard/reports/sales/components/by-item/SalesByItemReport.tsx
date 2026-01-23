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
import type { SalesByItem, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";

interface SalesByItemReportProps {
  data: {
    items: SalesByItem[];
    summary: SalesSummary;
  };
}

export default function SalesByItemReport({ data }: SalesByItemReportProps) {
  const { items, summary } = data;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("revenue");
  const [dateRange, setDateRange] = useState("30");

  // Get unique categories
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "quantity") return b.totalQuantitySold - a.totalQuantitySold;
      if (sortBy === "name") return a.itemName.localeCompare(b.itemName);
      return 0;
    });

  // Top performers for chart
  const topItems = items.slice(0, 5).map((item, index) => ({
    rank: index + 1,
    name: item.itemName,
    value: item.totalRevenue,
    quantity: item.totalQuantitySold,
    percentage: (item.totalRevenue / summary.totalRevenue) * 100,
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const handleExport = () => {
    toast.info("Exporting item report...");
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate total items sold
  const totalItemsSold = items.reduce((acc, item) => acc + item.totalQuantitySold, 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales by Item</h1>
          <p className="text-muted-foreground mt-1">
            Product performance analysis and sales metrics
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
                placeholder="Search items..."
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category || ""}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="quantity">Sort by Quantity</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - 3 Column Grid with Larger Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Revenue */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-xl text-green-600">₵</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">From {summary.totalOrders} orders</p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🛒</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Sales transactions</p>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatCurrency(summary.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        {/* Total Tax */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tax
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <span className="text-xl">🧾</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatCurrency(summary.totalTax)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tax collected</p>
          </CardContent>
        </Card>

        {/* Total Discount */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Discount
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <span className="text-xl">🏷️</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatCurrency(summary.totalDiscount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Discounts given</p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Revenue
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatCurrency(summary.netRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">After tax</p>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique items sold</p>
          </CardContent>
        </Card>

        {/* Items Sold */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Items Sold
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total quantity</p>
          </CardContent>
        </Card>

        {/* Avg Items/Order */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Items/Order
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <span className="text-xl">🔢</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalItemsSold / summary.totalOrders).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Product Details</TabsTrigger>
          <TabsTrigger value="chart">Top Performers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Product Sales Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredItems.length} products
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold">Item</th>
                      <th className="text-left p-3 text-sm font-semibold">Category</th>
                      <th className="text-right p-3 text-sm font-semibold">Qty Sold</th>
                      <th className="text-right p-3 text-sm font-semibold">Total Revenue</th>
                      <th className="text-right p-3 text-sm font-semibold">Avg Price</th>
                      <th className="text-right p-3 text-sm font-semibold">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.itemId} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          {item.category && (
                            <Badge variant="outline">{item.category}</Badge>
                          )}
                        </td>
                        <td className="text-right p-3 font-semibold">
                          {item.totalQuantitySold.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-semibold text-green-600">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                        <td className="text-right p-3">{formatCurrency(item.averagePrice)}</td>
                        <td className="text-right p-3">{item.totalOrders}</td>
                      </tr>
                    ))}
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
              <CardTitle>Top Products by Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Best performing products</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {topItems.map((item) => (
                <div key={item.rank} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 flex-shrink-0">
                    {item.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 inline-block">
                      {item.quantity} units sold
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
                <CardTitle>Product Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.slice(0, 5).map((category) => {
                  const categoryItems = items.filter(item => item.category === category);
                  const categoryRevenue = categoryItems.reduce((acc, item) => acc + item.totalRevenue, 0);
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="font-semibold">
                        {formatCurrency(categoryRevenue)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Best Selling Product</span>
                  <span className="font-semibold">{items[0]?.itemName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Highest Revenue Product</span>
                  <span className="font-semibold">
                    {formatCurrency(items[0]?.totalRevenue || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Product Revenue</span>
                  <span className="font-semibold">
                    {formatCurrency(summary.totalRevenue / items.length)}
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