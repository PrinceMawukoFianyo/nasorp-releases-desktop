"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SalesByItem, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesByItemReportProps {
  data: {
    items: SalesByItem[];
    summary: SalesSummary;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function currency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) { toast.error("No data to export."); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  downloadCsv(csv, filename);
}

export default function SalesByItemReport({ data }: SalesByItemReportProps) {
  const { items, summary } = data;
  const [searchQuery,    setSearchQuery]    = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("revenue");

  const totalItemsSold = items.reduce((acc, i) => acc + i.totalQuantitySold, 0);

  // ── Unique categories ───────────────────────────────────────────────────────
  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  // ── Filter & sort ───────────────────────────────────────────────────────────
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
      if (sortBy === "orders")   return b.totalOrders - a.totalOrders;
      if (sortBy === "name")     return a.itemName.localeCompare(b.itemName);
      return 0;
    });

  // ── Top performers ─────────────────────────────────────────────────────────
  const topItems = [...items]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map((item, i) => ({
      rank: i + 1,
      name: item.itemName,
      value: item.totalRevenue,
      quantity: item.totalQuantitySold,
      percentage: summary.totalRevenue > 0 ? (item.totalRevenue / summary.totalRevenue) * 100 : 0,
    }));

  // ── Category revenue totals ────────────────────────────────────────────────
  const categoryTotals = categories.map(cat => {
    const catItems  = items.filter(i => i.category === cat);
    const revenue   = catItems.reduce((s, i) => s + i.totalRevenue, 0);
    const qty       = catItems.reduce((s, i) => s + i.totalQuantitySold, 0);
    return { category: cat, revenue, qty, count: catItems.length };
  }).sort((a, b) => b.revenue - a.revenue);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    toCsv(
      filteredItems.map(i => ({
        "Item":           i.itemName,
        "SKU":            i.sku,
        "Category":       i.category ?? "",
        "Qty Sold":       i.totalQuantitySold,
        "Total Revenue":  i.totalRevenue,
        "Avg Price":      i.averagePrice,
        "Total Orders":   i.totalOrders,
        "Revenue %":      summary.totalRevenue > 0 ? ((i.totalRevenue / summary.totalRevenue) * 100).toFixed(1) + "%" : "0%",
      })),
      `sales-by-item-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    toast.success("Item report exported!");
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto print:p-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between print:mb-4">
        <div>
          <h1 className="text-3xl font-bold">Sales by Item</h1>
          <p className="text-muted-foreground mt-1">Product performance analysis and sales metrics</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="quantity">Sort by Quantity</SelectItem>
                <SelectItem value="orders">Sort by Orders</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-bold">₵</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{currency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">From {summary.totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Products</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {categories.length} categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Units Sold</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total quantity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Items/Order</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-cyan-100 flex items-center justify-center">
              <span className="text-xl">🔢</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalOrders > 0 ? (totalItemsSold / summary.totalOrders).toFixed(1) : "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="table">Product Details</TabsTrigger>
          <TabsTrigger value="chart">Top Performers</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ── Full table ── */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Sales Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Showing {filteredItems.length} of {items.length} products</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="print:hidden">
                  <Download className="h-3.5 w-3.5 mr-1.5" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold">#</th>
                      <th className="text-left p-3 text-xs font-semibold">Item</th>
                      <th className="text-left p-3 text-xs font-semibold">Category</th>
                      <th className="text-right p-3 text-xs font-semibold">Qty Sold</th>
                      <th className="text-right p-3 text-xs font-semibold">Total Revenue</th>
                      <th className="text-right p-3 text-xs font-semibold">Avg Price</th>
                      <th className="text-right p-3 text-xs font-semibold">Orders</th>
                      <th className="text-right p-3 text-xs font-semibold">Revenue %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => {
                      const pct = summary.totalRevenue > 0 ? (item.totalRevenue / summary.totalRevenue) * 100 : 0;
                      return (
                        <tr key={item.itemId} className="border-b hover:bg-muted/40 transition-colors">
                          <td className="p-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-medium">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          </td>
                          <td className="p-3">
                            {item.category && <Badge variant="outline" className="text-[10px]">{item.category}</Badge>}
                          </td>
                          <td className="text-right p-3 font-semibold">{item.totalQuantitySold.toLocaleString()}</td>
                          <td className="text-right p-3 font-semibold text-green-600">{currency(item.totalRevenue)}</td>
                          <td className="text-right p-3 text-muted-foreground">{currency(item.averagePrice)}</td>
                          <td className="text-right p-3">{item.totalOrders}</td>
                          <td className="text-right p-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filteredItems.length > 0 && (
                    <tfoot className="border-t-2 bg-muted/20">
                      <tr>
                        <td colSpan={3} className="p-3 font-semibold text-sm">Total</td>
                        <td className="text-right p-3 font-semibold">{filteredItems.reduce((s,i) => s+i.totalQuantitySold, 0).toLocaleString()}</td>
                        <td className="text-right p-3 font-semibold text-green-600">{currency(filteredItems.reduce((s,i) => s+i.totalRevenue, 0))}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Top performers ── */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">Best performing products this period</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {topItems.map((item) => (
                <div key={item.rank} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 flex-shrink-0 text-sm">
                    {item.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-sm font-semibold text-green-600">{currency(item.value)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{item.quantity.toLocaleString()} units</span>
                      <span className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}% of revenue</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Category breakdown ── */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales by Category</CardTitle>
                <Button variant="outline" size="sm" onClick={() => {
                  toCsv(categoryTotals.map(c => ({
                    "Category": c.category, "Products": c.count,
                    "Units Sold": c.qty, "Revenue": c.revenue,
                    "Revenue %": summary.totalRevenue > 0 ? ((c.revenue/summary.totalRevenue)*100).toFixed(1)+"%" : "0%",
                  })), "sales-by-category.csv");
                  toast.success("Exported!");
                }} className="print:hidden text-xs">
                  <Download className="h-3 w-3 mr-1" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold">Category</th>
                      <th className="text-right p-3 text-xs font-semibold">Products</th>
                      <th className="text-right p-3 text-xs font-semibold">Units Sold</th>
                      <th className="text-right p-3 text-xs font-semibold">Revenue</th>
                      <th className="text-right p-3 text-xs font-semibold">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryTotals.map(({ category, revenue, qty, count }) => {
                      const pct = summary.totalRevenue > 0 ? (revenue / summary.totalRevenue) * 100 : 0;
                      return (
                        <tr key={category} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{category}</td>
                          <td className="text-right p-3 text-muted-foreground">{count}</td>
                          <td className="text-right p-3">{qty.toLocaleString()}</td>
                          <td className="text-right p-3 font-semibold text-green-600">{currency(revenue)}</td>
                          <td className="text-right p-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Insights ── */}
        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Best Selling Product</span>
                  <span className="font-semibold text-sm truncate ml-4 max-w-[180px] text-right">{items[0]?.itemName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Highest Revenue</span>
                  <span className="font-semibold text-green-600">{currency(items[0]?.totalRevenue || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Product Revenue</span>
                  <span className="font-semibold">{currency(items.length > 0 ? summary.totalRevenue / items.length : 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Discounts Given</span>
                  <span className="font-semibold text-red-500">{currency(summary.totalDiscount)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Revenue Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topItems.slice(0, 3).map((item) => (
                  <div key={item.rank} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{item.rank}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs font-medium truncate pr-2">{item.name}</span>
                        <span className="text-xs font-semibold">{item.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: `hsl(${140 + item.rank * 20}, 60%, 50%)` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Remaining {items.length - 3} products account for {(100 - topItems.slice(0, 3).reduce((s, i) => s + i.percentage, 0)).toFixed(1)}% of revenue
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}