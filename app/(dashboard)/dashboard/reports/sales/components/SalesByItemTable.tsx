"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, Printer, Search, ExternalLink,
  CircleDollarSign, Layers, TrendingUp,
  ShoppingCart, Package, BarChart3, Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SalesByItem, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";
import Link from "next/link";

interface SalesByItemReportProps {
  data: { items: SalesByItem[]; summary: SalesSummary };
}

// ── Currency helper ────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n);
}

// ── Reusable summary card ──────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon,
  iconBg, iconColor, valueColor, link,
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
    <Card className="hover:shadow-md transition-shadow relative">
      {link && (
        <Link
          href={link.href}
          className="absolute top-3 right-3 opacity-40 hover:opacity-90 transition-opacity z-10"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-8">
        <CardTitle className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
          {label}
        </CardTitle>
        <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <p className={`text-2xl font-bold truncate ${valueColor ?? "text-slate-700 dark:text-slate-200"}`}>
          {value}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
          {link && (
            <Link
              href={link.href}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
            >
              {link.label}
              <ExternalLink className="h-3 w-3 ml-0.5" />
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
  const [searchQuery,     setSearchQuery]    = useState("");
  const [categoryFilter,  setCategoryFilter] = useState("all");
  const [sortBy,          setSortBy]         = useState("revenue");
  const [dateRange,       setDateRange]      = useState("30");

  // Derived metrics
  const totalCOGS           = items.reduce((s, i) => s + i.totalCOGS,         0);
  const totalGrossProfit    = items.reduce((s, i) => s + i.grossProfit,       0);
  const totalInventoryValue = items.reduce((s, i) => s + i.totalCostPrice,    0);
  const totalItemsSold      = items.reduce((s, i) => s + i.totalQuantitySold, 0);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const filteredItems = items
    .filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        (item.itemName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)) &&
        (categoryFilter === "all" || item.category === categoryFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === "revenue")  return b.totalRevenue      - a.totalRevenue;
      if (sortBy === "quantity") return b.totalQuantitySold - a.totalQuantitySold;
      if (sortBy === "profit")   return b.grossProfit       - a.grossProfit;
      if (sortBy === "margin")   return b.grossMargin       - a.grossMargin;
      if (sortBy === "name")     return a.itemName.localeCompare(b.itemName);
      return 0;
    });

  const topByRevenue = [...items]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map((item, i) => ({
      rank: i + 1, name: item.itemName,
      value: item.totalRevenue, quantity: item.totalQuantitySold,
      pct: (item.totalRevenue / summary.totalRevenue) * 100,
    }));

  const topByProfit = [...items]
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5);

  const highestMarginItem = items.length
    ? items.reduce((mx, i) => (i.grossMargin > mx.grossMargin ? i : mx), items[0])
    : null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales by Item</h1>
          <p className="text-muted-foreground mt-1">Product performance analysis and sales metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Exporting…")}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items…"
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
                {categories.map((c) => (
                  <SelectItem key={c} value={c || ""}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="quantity">Sort by Quantity</SelectItem>
                <SelectItem value="profit">Sort by Gross Profit</SelectItem>
                <SelectItem value="margin">Sort by Margin</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards — unified 3-col grid, 7 cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <StatCard
          label="Total Revenue"
          value={fmt(summary.totalRevenue)}
          sub={`From ${summary.totalOrders} orders`}
          icon={CircleDollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
        />

        <StatCard
          label="Total COGS"
          value={fmt(totalCOGS)}
          sub="Cost of goods sold"
          icon={Layers}
          iconBg="bg-orange-100 dark:bg-orange-950/40"
          iconColor="text-orange-500"
          valueColor="text-orange-600 dark:text-orange-400"
        />

        <StatCard
          label="Total Gross Profit"
          value={fmt(totalGrossProfit)}
          sub="Revenue - COGS"
          icon={TrendingUp}
          iconBg="bg-violet-100 dark:bg-violet-950/40"
          iconColor="text-violet-600"
          valueColor="text-violet-600 dark:text-violet-400"
          link={{ href: "/accounting/profit-loss", label: "Go to accounting" }}
        />

        <StatCard
          label="Total Orders"
          value={summary.totalOrders.toString()}
          sub="Sales transactions"
          icon={ShoppingCart}
          iconBg="bg-blue-100 dark:bg-blue-950/40"
          iconColor="text-blue-500"
        />

        <StatCard
          label="Total Products"
          value={items.length.toString()}
          sub="Unique items sold"
          icon={Package}
          iconBg="bg-indigo-100 dark:bg-indigo-950/40"
          iconColor="text-indigo-500"
        />

        <StatCard
          label="Items Sold"
          value={totalItemsSold.toLocaleString()}
          sub="Total quantity"
          icon={BarChart3}
          iconBg="bg-teal-100 dark:bg-teal-950/40"
          iconColor="text-teal-600"
        />

        {/* Inventory Value — full-width last card, capped to one column width */}
        <div className="sm:col-span-2 lg:col-span-3 lg:max-w-sm">
          <StatCard
            label="Inventory Value"
            value={fmt(totalInventoryValue)}
            sub="Stock value at cost"
            icon={Warehouse}
            iconBg="bg-cyan-100 dark:bg-cyan-950/40"
            iconColor="text-cyan-600"
          />
        </div>

      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Product Details</TabsTrigger>
          <TabsTrigger value="chart">Top Performers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Product Details table */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Product Sales Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">Showing {filteredItems.length} products</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["Item","Category","Qty Sold","Revenue","Unit Cost","Total COGS","Gross Profit","Margin","Orders","Stock Left"].map((h) => (
                        <th
                          key={h}
                          className={`p-3 font-semibold whitespace-nowrap text-muted-foreground ${
                            h === "Item" || h === "Category" ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.itemId} className="border-b hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <p className="font-medium whitespace-nowrap">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </td>
                        <td className="p-3">
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                        </td>
                        <td className="text-right p-3 font-semibold">
                          {item.totalQuantitySold.toLocaleString()}
                        </td>
                        <td className="text-right p-3 font-semibold text-emerald-600 whitespace-nowrap">
                          {fmt(item.totalRevenue)}
                        </td>
                        <td className="text-right p-3 text-slate-500 whitespace-nowrap">
                          {fmt(item.costPrice)}
                        </td>
                        <td className="text-right p-3 text-orange-600 whitespace-nowrap">
                          {fmt(item.totalCOGS)}
                        </td>
                        <td className="text-right p-3 font-semibold text-violet-600 whitespace-nowrap">
                          {fmt(item.grossProfit)}
                        </td>
                        <td className="text-right p-3">
                          <Badge
                            variant="outline"
                            className={
                              item.grossMargin >= 30
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {item.grossMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right p-3">{item.totalOrders}</td>
                        <td className="text-right p-3 font-mono text-slate-500">{item.stockRemaining}</td>
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
          <div className="grid gap-6 md:grid-cols-2">

            <Card>
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
                <p className="text-sm text-muted-foreground">Best performing products</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {topByRevenue.map((item) => (
                  <div key={item.rank} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm flex-shrink-0">
                      {item.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className="text-sm font-semibold text-emerald-600 ml-2 whitespace-nowrap">
                          {fmt(item.value)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 inline-block">
                        {item.quantity.toLocaleString()} units sold
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products by Gross Profit</CardTitle>
                <p className="text-sm text-muted-foreground">Most profitable products</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {topByProfit.map((item, i) => (
                  <div key={item.itemId} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{item.itemName}</span>
                        <span className="text-sm font-semibold text-violet-600 ml-2 whitespace-nowrap">
                          {fmt(item.grossProfit)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                          style={{ width: `${Math.min(100, (item.grossProfit / totalGrossProfit) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 inline-block">
                        Margin: {item.grossMargin.toFixed(1)}% · {item.totalQuantitySold.toLocaleString()} units
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">

            <Card>
              <CardHeader><CardTitle>Product Categories</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {categories.slice(0, 5).map((category) => {
                  const catItems  = items.filter((i) => i.category === category);
                  const catRev    = catItems.reduce((s, i) => s + i.totalRevenue, 0);
                  const catProfit = catItems.reduce((s, i) => s + i.grossProfit,  0);
                  const catMargin = catRev > 0 ? (catProfit / catRev) * 100 : 0;
                  return (
                    <div key={category} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="font-semibold text-emerald-600">{fmt(catRev)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Gross Profit: {fmt(catProfit)}</span>
                        <span>Margin: {catMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Best Selling Product",       value: items[0]?.itemName ?? "—" },
                  { label: "Highest Revenue Product",    value: fmt(items[0]?.totalRevenue ?? 0),          color: "text-emerald-600" },
                  { label: "Highest Gross Profit",       value: fmt(topByProfit[0]?.grossProfit ?? 0),     color: "text-violet-600"  },
                  {
                    label: "Highest Margin Product",
                    value: highestMarginItem
                      ? `${highestMarginItem.itemName} (${highestMarginItem.grossMargin.toFixed(1)}%)`
                      : "—",
                    color: "text-cyan-600",
                  },
                  { label: "Avg Revenue / Product",      value: fmt(summary.totalRevenue / (items.length || 1)) },
                  { label: "Avg Gross Profit / Product", value: fmt(totalGrossProfit / (items.length || 1)), color: "text-violet-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                    <span className={`font-semibold text-sm text-right ${color ?? "text-slate-700 dark:text-slate-200"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}