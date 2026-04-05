"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, Printer, Search, CircleDollarSign, ShoppingCart,
  TrendingUp, Package, BarChart3, Layers, Warehouse, ExternalLink,
} from "lucide-react";
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
import Link from "next/link";

interface SalesByItemReportProps {
  data: {
    items: SalesByItem[];
    summary: SalesSummary;
  };
}

// ── Currency helper ────────────────────────────────────────────────────────────
function currency(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

// ── Summary stat card — icon-box style matching the screenshot ─────────────────
function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
  link,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  link?: { href: string; label: string };
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </CardTitle>
        {/* Rounded icon box — Lucide icon, no emojis */}
        <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold truncate ${valueColor ?? "text-slate-700 dark:text-slate-200"}`}>
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
          {link && (
            <Link
              href={link.href}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SalesByItemReport({ data }: SalesByItemReportProps) {
  const { items, summary } = data;
  const [searchQuery, setSearchQuery]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy]               = useState("revenue");
  const [dateRange, setDateRange]         = useState("30");

  // Unique categories
  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));

  // Filter + sort
  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "revenue")  return b.totalRevenue - a.totalRevenue;
      if (sortBy === "quantity") return b.totalQuantitySold - a.totalQuantitySold;
      if (sortBy === "name")     return a.itemName.localeCompare(b.itemName);
      return 0;
    });

  // Top 5 for chart tab
  const topItems = items.slice(0, 5).map((item, index) => ({
    rank: index + 1,
    name: item.itemName,
    value: item.totalRevenue,
    quantity: item.totalQuantitySold,
    percentage: (item.totalRevenue / summary.totalRevenue) * 100,
  }));

  // Derived metrics
  const totalItemsSold    = items.reduce((acc, item) => acc + item.totalQuantitySold, 0);
  const totalCOGS         = items.reduce((acc, item) => acc + (item.totalCOGS ?? 0), 0);
  const totalGrossProfit  = summary.totalRevenue - totalCOGS;
  const totalInventoryVal = items.reduce((acc, item) => acc + (item.totalCostPrice ?? 0), 0);

  const handleExport = () => toast.info("Exporting item report...");
  const handlePrint  = () => window.print();

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales by Item</h1>
          <p className="text-muted-foreground mt-1">
            Product performance analysis and sales metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
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
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category || ""}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="quantity">Sort by Quantity</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards — 7 cards, 3-col grid ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* 1. Total Revenue */}
        <SummaryCard
          label="Total Revenue"
          value={currency(summary.totalRevenue)}
          sub={`From ${summary.totalOrders} orders`}
          icon={CircleDollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
        />

        {/* 2. Total COGS */}
        <SummaryCard
          label="Total COGS"
          value={currency(totalCOGS)}
          sub="Cost of goods sold"
          icon={Layers}
          iconBg="bg-orange-100 dark:bg-orange-950/40"
          iconColor="text-orange-500"
          valueColor="text-orange-600 dark:text-orange-400"
        />

        {/* 3. Total Gross Profit */}
        <SummaryCard
          label="Total Gross Profit"
          value={currency(totalGrossProfit)}
          sub="Revenue - COGS"
          icon={TrendingUp}
          iconBg="bg-violet-100 dark:bg-violet-950/40"
          iconColor="text-violet-600"
          valueColor="text-violet-600 dark:text-violet-400"
          link={{ href: "/accounting/profit-loss", label: "Go to accounting" }}
        />

        {/* 4. Total Orders */}
        <SummaryCard
          label="Total Orders"
          value={summary.totalOrders.toString()}
          sub="Sales transactions"
          icon={ShoppingCart}
          iconBg="bg-blue-100 dark:bg-blue-950/40"
          iconColor="text-blue-500"
        />

        {/* 5. Total Products */}
        <SummaryCard
          label="Total Products"
          value={items.length.toString()}
          sub="Unique items sold"
          icon={Package}
          iconBg="bg-indigo-100 dark:bg-indigo-950/40"
          iconColor="text-indigo-500"
        />

        {/* 6. Items Sold */}
        <SummaryCard
          label="Items Sold"
          value={totalItemsSold.toLocaleString()}
          sub="Total quantity"
          icon={BarChart3}
          iconBg="bg-teal-100 dark:bg-teal-950/40"
          iconColor="text-teal-600"
        />

        {/* 7. Inventory Value */}
        <SummaryCard
          label="Inventory Value"
          value={currency(totalInventoryVal)}
          sub="Stock value at cost"
          icon={Warehouse}
          iconBg="bg-cyan-100 dark:bg-cyan-950/40"
          iconColor="text-cyan-600"
        />

      </div>

      {/* ── Tabbed Content ── */}
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
              <p className="text-sm text-muted-foreground">Showing {filteredItems.length} products</p>
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
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                        </td>
                        <td className="text-right p-3 font-semibold">
                          {item.totalQuantitySold.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-semibold text-green-600">
                          {currency(item.totalRevenue)}
                        </td>
                        <td className="text-right p-3">{currency(item.averagePrice)}</td>
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
                        {currency(item.value)}
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
              <CardHeader><CardTitle>Product Categories</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {categories.slice(0, 5).map((category) => {
                  const categoryRevenue = items
                    .filter((item) => item.category === category)
                    .reduce((acc, item) => acc + item.totalRevenue, 0);
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="font-semibold">{currency(categoryRevenue)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Best Selling Product</span>
                  <span className="font-semibold">{items[0]?.itemName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Highest Revenue Product</span>
                  <span className="font-semibold">{currency(items[0]?.totalRevenue || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Product Revenue</span>
                  <span className="font-semibold">
                    {currency(summary.totalRevenue / items.length)}
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