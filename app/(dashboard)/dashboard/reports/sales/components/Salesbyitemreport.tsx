"use client";

import { useState } from "react";
import {
  Download, Printer, Search, ExternalLink,
  CircleDollarSign, Layers, TrendingUp, TrendingDown,
  ShoppingCart, Package, BarChart3, Warehouse, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n);

// ── Margin badge ───────────────────────────────────────────────────────────────
function MarginBadge({ pct }: { pct: number }) {
  const cls =
    pct >= 30 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pct >= 10 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`}>
      {pct.toFixed(1)}%
    </Badge>
  );
}

// ── Stock badge ────────────────────────────────────────────────────────────────
function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0)
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">Out of Stock</Badge>;
  if (qty <= 10)
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Low · {qty}</Badge>;
  return <span className="font-semibold text-emerald-700">{qty.toLocaleString()}</span>;
}

// ── Stat Card — exact screenshot design ───────────────────────────────────────
// thick colored left border · giant faint watermark icon · pill sub-badge · trend icon
function StatCard({
  label,
  value,
  sub,
  subPlain,
  icon: Icon,
  borderCls,       // e.g. "border-l-emerald-500"
  watermarkCls,    // e.g. "text-emerald-400/[.12]"
  iconCls,         // e.g. "text-emerald-500"  — used for trend icon
  valueCls,        // e.g. "text-slate-700"
  badgeBg,         // pill bg
  badgeText,       // pill text
  trendIcon: TrendIcon,
  accountingLink,
}: {
  label: string;
  value: string;
  sub?: string;
  subPlain?: boolean;         // render sub as plain text instead of pill
  icon: React.ElementType;
  borderCls: string;
  watermarkCls: string;
  iconCls?: string;
  valueCls?: string;
  badgeBg?: string;
  badgeText?: string;
  trendIcon?: React.ElementType;
  accountingLink?: boolean;
}) {
  return (
    <div
      className={`
        relative bg-white dark:bg-card rounded-2xl shadow-sm
        border border-border border-l-4 ${borderCls}
        hover:shadow-md transition-shadow overflow-hidden
      `}
    >
      {/* Giant faint watermark icon */}
      <Icon
        className={`absolute -top-2 right-1 h-24 w-24 ${watermarkCls} pointer-events-none select-none`}
        aria-hidden
      />

      {/* Accounting external link */}
      {accountingLink && (
        <Link
          href="/accounting/profit-loss"
          className="absolute top-3 right-3 z-10 opacity-40 hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      )}

      <div className="px-5 pt-5 pb-4 relative z-[1]">
        {/* Label */}
        <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-2">
          {label}
        </p>

        {/* Value */}
        <p className={`text-[1.75rem] font-bold leading-none tracking-tight mb-3 ${valueCls ?? "text-slate-700 dark:text-slate-200"}`}>
          {value}
        </p>

        {/* Bottom row: pill / plain text + optional trend icon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {sub && !subPlain && badgeBg && badgeText ? (
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeBg} ${badgeText}`}>
                {sub}
              </span>
            ) : sub ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{sub}</span>
            ) : null}

            {accountingLink && (
              <Link
                href="/accounting/profit-loss"
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5 whitespace-nowrap"
              >
                Go to accounting
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </Link>
            )}
          </div>

          {TrendIcon && iconCls && (
            <TrendIcon className={`h-4 w-4 flex-shrink-0 ${iconCls}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SalesByItemReport({ data }: SalesByItemReportProps) {
  const { items, summary } = data;
  const [searchQuery,    setSearchQuery]    = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("revenue");
  const [dateRange,      setDateRange]      = useState("30");

  // ── Derived metrics ──────────────────────────────────────────────────────────
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
    .sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  const topByProfit = [...items]
    .sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);

  const highestMarginItem = items.length
    ? items.reduce((mx, i) => (i.grossMargin > mx.grossMargin ? i : mx), items[0])
    : null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* ── Summary Cards — 3-col unified grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* 1. Total Revenue — emerald left border */}
        <StatCard
          label="Total Revenue"
          value={fmt(summary.totalRevenue)}
          sub={`${summary.totalOrders} orders`}
          icon={CircleDollarSign}
          borderCls="border-l-emerald-500"
          watermarkCls="text-emerald-400/[.12]"
          iconCls="text-emerald-500"
          badgeBg="bg-emerald-50 dark:bg-emerald-950/40"
          badgeText="text-emerald-600 dark:text-emerald-300"
          trendIcon={ArrowUpRight}
        />

        {/* 2. Total COGS — orange left border */}
        <StatCard
          label="Total COGS"
          value={fmt(totalCOGS)}
          sub="Cost of goods sold"
          icon={Layers}
          borderCls="border-l-orange-500"
          watermarkCls="text-orange-400/[.12]"
          iconCls="text-orange-500"
          valueCls="text-orange-600 dark:text-orange-400"
          badgeBg="bg-orange-50 dark:bg-orange-950/40"
          badgeText="text-orange-600 dark:text-orange-300"
          trendIcon={TrendingDown}
        />

        {/* 3. Total Gross Profit — violet left border */}
        <StatCard
          label="Total Gross Profit"
          value={fmt(totalGrossProfit)}
          sub="Revenue - COGS"
          icon={TrendingUp}
          borderCls="border-l-violet-500"
          watermarkCls="text-violet-400/[.12]"
          iconCls="text-violet-500"
          valueCls="text-violet-600 dark:text-violet-400"
          badgeBg="bg-violet-50 dark:bg-violet-950/40"
          badgeText="text-violet-600 dark:text-violet-300"
          trendIcon={TrendingUp}
          accountingLink
        />

        {/* 4. Total Orders — blue left border */}
        <StatCard
          label="Total Orders"
          value={summary.totalOrders.toString()}
          sub="Sales transactions"
          icon={ShoppingCart}
          borderCls="border-l-blue-500"
          watermarkCls="text-blue-400/[.12]"
          iconCls="text-blue-500"
          badgeBg="bg-blue-50 dark:bg-blue-950/40"
          badgeText="text-blue-600 dark:text-blue-300"
          trendIcon={ArrowUpRight}
        />

        {/* 5. Total Products — indigo left border */}
        <StatCard
          label="Total Products"
          value={items.length.toString()}
          sub="Unique items sold"
          icon={Package}
          borderCls="border-l-indigo-500"
          watermarkCls="text-indigo-400/[.12]"
          iconCls="text-indigo-500"
          badgeBg="bg-indigo-50 dark:bg-indigo-950/40"
          badgeText="text-indigo-600 dark:text-indigo-300"
        />

        {/* 6. Items Sold — teal left border */}
        <StatCard
          label="Items Sold"
          value={totalItemsSold.toLocaleString()}
          sub="Total quantity"
          icon={BarChart3}
          borderCls="border-l-teal-500"
          watermarkCls="text-teal-400/[.12]"
          iconCls="text-teal-500"
          badgeBg="bg-teal-50 dark:bg-teal-950/40"
          badgeText="text-teal-600 dark:text-teal-300"
          trendIcon={ArrowUpRight}
        />

        {/* 7. Inventory Value — cyan left border, spans full row then caps width */}
        <div className="sm:col-span-2 lg:col-span-3 lg:max-w-sm">
          <StatCard
            label="Inventory Value"
            value={fmt(totalInventoryValue)}
            sub="Stock value at cost"
            icon={Warehouse}
            borderCls="border-l-cyan-500"
            watermarkCls="text-cyan-400/[.12]"
            iconCls="text-cyan-500"
            badgeBg="bg-cyan-50 dark:bg-cyan-950/40"
            badgeText="text-cyan-600 dark:text-cyan-300"
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
                      {[
                        ["Item",            "text-left"],
                        ["Category",        "text-left"],
                        ["Qty Sold",        "text-right"],
                        ["Revenue",         "text-right"],
                        ["Unit Cost",       "text-right"],
                        ["Total COGS",      "text-right"],
                        ["Gross Profit",    "text-right"],
                        ["Margin",          "text-right"],
                        ["Orders",          "text-right"],
                        ["Stock Left",      "text-right"],
                      ].map(([h, align]) => (
                        <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground whitespace-nowrap ${align}`}>
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
                        <td className="p-3 text-right font-semibold">{item.totalQuantitySold.toLocaleString()}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600 whitespace-nowrap">{fmt(item.totalRevenue)}</td>
                        <td className="p-3 text-right text-slate-500 whitespace-nowrap">{fmt(item.costPrice)}</td>
                        <td className="p-3 text-right text-orange-600 whitespace-nowrap">{fmt(item.totalCOGS)}</td>
                        <td className={`p-3 text-right font-semibold whitespace-nowrap ${item.grossProfit >= 0 ? "text-violet-600" : "text-red-600"}`}>
                          {fmt(item.grossProfit)}
                        </td>
                        <td className="p-3 text-right"><MarginBadge pct={item.grossMargin} /></td>
                        <td className="p-3 text-right">{item.totalOrders}</td>
                        <td className="p-3 text-right"><StockBadge qty={item.stockRemaining} /></td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    {filteredItems.length > 0 && (() => {
                      const fRev    = filteredItems.reduce((s, i) => s + i.totalRevenue,      0);
                      const fCOGS   = filteredItems.reduce((s, i) => s + i.totalCOGS,         0);
                      const fProfit = filteredItems.reduce((s, i) => s + i.grossProfit,       0);
                      const fMargin = fRev > 0 ? (fProfit / fRev) * 100 : 0;
                      const fQty    = filteredItems.reduce((s, i) => s + i.totalQuantitySold, 0);
                      const fOrders = filteredItems.reduce((s, i) => s + i.totalOrders,       0);
                      const fStock  = filteredItems.reduce((s, i) => s + i.stockRemaining,    0);
                      return (
                        <tr className="border-t-2 bg-muted/20 font-semibold text-sm">
                          <td className="p-3" colSpan={2}>Totals ({filteredItems.length} items)</td>
                          <td className="p-3 text-right">{fQty.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-700">{fmt(fRev)}</td>
                          <td className="p-3" />
                          <td className="p-3 text-right text-orange-700">{fmt(fCOGS)}</td>
                          <td className={`p-3 text-right ${fProfit >= 0 ? "text-violet-700" : "text-red-600"}`}>{fmt(fProfit)}</td>
                          <td className="p-3 text-right"><MarginBadge pct={fMargin} /></td>
                          <td className="p-3 text-right">{fOrders}</td>
                          <td className="p-3 text-right">{fStock.toLocaleString()}</td>
                        </tr>
                      );
                    })()}

                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center p-8 text-muted-foreground">No items found</td>
                      </tr>
                    )}
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
                {topByRevenue.map((item, i) => (
                  <div key={item.itemId} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{item.itemName}</span>
                        <span className="text-sm font-semibold text-emerald-600 ml-2 whitespace-nowrap">{fmt(item.totalRevenue)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${summary.totalRevenue > 0 ? (item.totalRevenue / summary.totalRevenue) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 inline-block">
                        {item.totalQuantitySold.toLocaleString()} units sold
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
                        <span className="text-sm font-semibold text-violet-600 ml-2 whitespace-nowrap">{fmt(item.grossProfit)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                          style={{ width: `${totalGrossProfit > 0 ? (item.grossProfit / totalGrossProfit) * 100 : 0}%` }}
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
                  { label: "Highest Revenue Product",    value: fmt(items[0]?.totalRevenue ?? 0),         color: "text-emerald-600" },
                  { label: "Highest Gross Profit",       value: fmt(topByProfit[0]?.grossProfit ?? 0),    color: "text-violet-600"  },
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