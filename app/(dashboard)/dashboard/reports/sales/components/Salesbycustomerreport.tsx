"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Search, CreditCard, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SalesByCustomer as SalesByCustomerBase, SalesSummary } from "@/actions/sales-reports";

// ── Augmented type ─────────────────────────────────────────────────────────────
// The base SalesByCustomer type in sales-reports doesn't yet include payment
// breakdown fields. We extend it here so TypeScript is happy without requiring
// a change to the actions file.
type SalesByCustomer = SalesByCustomerBase & {
  totalOwing?:     number;   // amount the customer still owes (credit sales)
  totalCollected?: number;   // amount already collected / paid
};
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesByCustomerReportProps {
  data: {
    customers: SalesByCustomer[];
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

// ── Payment badge ──────────────────────────────────────────────────────────────
function PaymentBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; className: string }> = {
    PAID:     { label: "Paid",     className: "bg-green-100 text-green-700 border-green-200" },
    PARTIAL:  { label: "Partial",  className: "bg-amber-100 text-amber-700 border-amber-200" },
    PENDING:  { label: "Credit",   className: "bg-blue-100  text-blue-700  border-blue-200"  },
    REFUNDED: { label: "Refunded", className: "bg-red-100   text-red-700   border-red-200"   },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${s.className}`}>{s.label}</Badge>;
}

export default function SalesByCustomerReport({ data }: SalesByCustomerReportProps) {
  const { customers, summary } = data;
  const [searchQuery,    setSearchQuery]    = useState("");
  const [segmentFilter,  setSegmentFilter]  = useState("all");
  const [paymentFilter,  setPaymentFilter]  = useState("all");
  const [sortBy,         setSortBy]         = useState("revenue");

  // ── Customer segment ────────────────────────────────────────────────────────
  const getCustomerSegment = (c: SalesByCustomer) => {
    if (c.totalRevenue > 5000) return "VIP";
    if (c.totalOrders === 1)   return "New";
    return "Regular";
  };

  // ── Filter & sort ───────────────────────────────────────────────────────────
  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch =
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSegment = segmentFilter === "all" || getCustomerSegment(c) === segmentFilter;
      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => {
      if (sortBy === "revenue")  return b.totalRevenue - a.totalRevenue;
      if (sortBy === "orders")   return b.totalOrders - a.totalOrders;
      if (sortBy === "name")     return a.customerName.localeCompare(b.customerName);
      if (sortBy === "owing")    return (b.totalOwing ?? 0) - (a.totalOwing ?? 0);
      return 0;
    });

  // ── Top performers ─────────────────────────────────────────────────────────
  const topCustomers = [...customers]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      name: c.customerName,
      value: c.totalRevenue,
      orders: c.totalOrders,
      percentage: summary.totalRevenue > 0 ? (c.totalRevenue / summary.totalRevenue) * 100 : 0,
    }));

  // ── Segment analysis ────────────────────────────────────────────────────────
  const segments = {
    vip:     customers.filter(c => getCustomerSegment(c) === "VIP").length,
    regular: customers.filter(c => getCustomerSegment(c) === "Regular").length,
    new:     customers.filter(c => getCustomerSegment(c) === "New").length,
  };

  // ── Credit stats ────────────────────────────────────────────────────────────
  const totalOwing    = customers.reduce((s, c) => s + (c.totalOwing   ?? 0), 0);
  const totalPaid     = customers.reduce((s, c) => s + (c.totalCollected ?? c.totalRevenue), 0);
  const creditDebtors = customers.filter(c => (c.totalOwing ?? 0) > 0).length;

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    toCsv(
      filteredCustomers.map(c => ({
        "Customer":          c.customerName,
        "Email":             c.customerEmail,
        "Segment":           getCustomerSegment(c),
        "Orders":            c.totalOrders,
        "Quantity":          c.totalQuantity,
        "Total Revenue":     c.totalRevenue,
        "Avg Order Value":   c.averageOrderValue,
        "Amount Paid":       c.totalCollected ?? c.totalRevenue,
        "Amount Owing":      c.totalOwing ?? 0,
        "Last Order":        c.lastOrderDate,
      })),
      `sales-by-customer-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    toast.success("Customer report exported!");
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between print:mb-4">
        <div>
          <h1 className="text-3xl font-bold">Sales by Customer</h1>
          <p className="text-muted-foreground mt-1">Detailed customer sales analysis with payment status</p>
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

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="New">New</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="orders">Sort by Orders</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="owing">Sort by Amount Owing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-bold">₵</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">From {summary.totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-lg">👥</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{segments.vip} VIP · {segments.new} new</p>
          </CardContent>
        </Card>

        {/* Credit outstanding card */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Outstanding Credit</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{currency(totalOwing)}</div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{creditDebtors} customers with balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600">📊</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="table">Customer Details</TabsTrigger>
          <TabsTrigger value="credit">Credit &amp; Payments</TabsTrigger>
          <TabsTrigger value="chart">Top Performers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ── Full details table ── */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Customer Sales Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">Showing {filteredCustomers.length} customers · includes payment status</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-semibold">Customer</th>
                      <th className="text-left p-3 text-xs font-semibold">Segment</th>
                      <th className="text-right p-3 text-xs font-semibold">Orders</th>
                      <th className="text-right p-3 text-xs font-semibold">Qty</th>
                      <th className="text-right p-3 text-xs font-semibold">Total Revenue</th>
                      <th className="text-right p-3 text-xs font-semibold">Paid</th>
                      <th className="text-right p-3 text-xs font-semibold">Owing</th>
                      <th className="text-left p-3 text-xs font-semibold">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => {
                      const segment  = getCustomerSegment(c);
                      const owing    = c.totalOwing ?? 0;
                      const collected = c.totalCollected ?? c.totalRevenue;
                      return (
                        <tr key={c.customerId} className="border-b hover:bg-muted/40 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {c.customerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{c.customerName}</p>
                                <p className="text-xs text-muted-foreground">{c.customerEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={segment === "VIP" ? "default" : "secondary"} className="text-[10px]">{segment}</Badge>
                          </td>
                          <td className="text-right p-3">{c.totalOrders}</td>
                          <td className="text-right p-3">{c.totalQuantity}</td>
                          <td className="text-right p-3 font-semibold text-green-600">{currency(c.totalRevenue)}</td>
                          <td className="text-right p-3 text-green-700 font-medium">{currency(collected)}</td>
                          <td className="text-right p-3">
                            {owing > 0
                              ? <span className="text-red-600 font-semibold">{currency(owing)}</span>
                              : <span className="text-muted-foreground text-xs">—</span>
                            }
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{c.lastOrderDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Credit & payments tab ── */}
        <TabsContent value="credit">
          <div className="space-y-4">
            {/* Outstanding balances */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Customers with Outstanding Balances
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => {
                    toCsv(
                      customers.filter(c => (c.totalOwing ?? 0) > 0).map(c => ({
                        "Customer":     c.customerName,
                        "Email":        c.customerEmail,
                        "Orders":       c.totalOrders,
                        "Total Revenue": c.totalRevenue,
                        "Amount Paid":  c.totalCollected ?? c.totalRevenue,
                        "Amount Owing": c.totalOwing ?? 0,
                        "Last Order":   c.lastOrderDate,
                      })),
                      "outstanding-balances.csv"
                    );
                    toast.success("Exported!");
                  }} className="text-xs">
                    <Download className="h-3 w-3 mr-1" />Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customers.filter(c => (c.totalOwing ?? 0) > 0).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-60" />
                    <p className="text-sm">All customers are fully paid up.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-amber-50/50">
                          <th className="text-left p-3 text-xs font-semibold">Customer</th>
                          <th className="text-right p-3 text-xs font-semibold">Orders</th>
                          <th className="text-right p-3 text-xs font-semibold">Total Revenue</th>
                          <th className="text-right p-3 text-xs font-semibold">Amount Paid</th>
                          <th className="text-right p-3 text-xs font-semibold">Amount Owing</th>
                          <th className="text-right p-3 text-xs font-semibold">Collection %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers
                          .filter(c => (c.totalOwing ?? 0) > 0)
                          .sort((a, b) => (b.totalOwing ?? 0) - (a.totalOwing ?? 0))
                          .map(c => {
                            const owing     = c.totalOwing ?? 0;
                            const collected = c.totalCollected ?? (c.totalRevenue - owing);
                            const pct       = c.totalRevenue > 0 ? (collected / c.totalRevenue) * 100 : 0;
                            return (
                              <tr key={c.customerId} className="border-b hover:bg-muted/40">
                                <td className="p-3">
                                  <p className="font-medium">{c.customerName}</p>
                                  <p className="text-xs text-muted-foreground">{c.customerEmail}</p>
                                </td>
                                <td className="text-right p-3">{c.totalOrders}</td>
                                <td className="text-right p-3 font-semibold">{currency(c.totalRevenue)}</td>
                                <td className="text-right p-3 text-green-600 font-medium">{currency(collected)}</td>
                                <td className="text-right p-3">
                                  <span className="text-red-600 font-semibold">{currency(owing)}</span>
                                </td>
                                <td className="text-right p-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot className="border-t-2 bg-muted/20">
                        <tr>
                          <td className="p-3 font-semibold text-sm">Total</td>
                          <td />
                          <td className="text-right p-3 font-semibold">{currency(customers.filter(c => (c.totalOwing ?? 0) > 0).reduce((s,c) => s + c.totalRevenue, 0))}</td>
                          <td className="text-right p-3 font-semibold text-green-600">{currency(customers.filter(c => (c.totalOwing ?? 0) > 0).reduce((s,c) => s + (c.totalCollected ?? c.totalRevenue - (c.totalOwing ?? 0)), 0))}</td>
                          <td className="text-right p-3 font-semibold text-red-600">{currency(totalOwing)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paid in full customers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Fully Paid Customers ({customers.filter(c => !c.totalOwing || c.totalOwing === 0).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {customers.filter(c => !c.totalOwing || c.totalOwing === 0).slice(0, 8).map(c => (
                    <div key={c.customerId} className="flex items-center gap-2 p-2 rounded border bg-green-50/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{currency(c.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Top performers ── */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {topCustomers.map((c) => (
                <div key={c.rank} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 flex-shrink-0">
                    {c.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm font-semibold text-green-600">{currency(c.value)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all" style={{ width: `${c.percentage}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 inline-block">{c.orders} orders</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Insights ── */}
        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Customer Segments</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "VIP Customers",     count: segments.vip,     color: "bg-yellow-500" },
                  { label: "Regular Customers", count: segments.regular, color: "bg-blue-500"   },
                  { label: "New Customers",     count: segments.new,     color: "bg-green-500"  },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color} inline-block`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <span className="font-semibold">
                      {count} ({customers.length > 0 ? Math.round((count / customers.length) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Repeat Purchase Rate</span>
                  <span className="font-semibold">
                    {customers.length > 0 ? Math.round((customers.filter(c => c.totalOrders > 1).length / customers.length) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer Lifetime Value</span>
                  <span className="font-semibold">{currency(customers.length > 0 ? summary.totalRevenue / customers.length : 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Credit Collection Rate</span>
                  <span className="font-semibold text-green-600">
                    {summary.totalRevenue > 0 ? ((1 - totalOwing / summary.totalRevenue) * 100).toFixed(1) : 100}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customers with Credit</span>
                  <span className="font-semibold text-amber-600">{creditDebtors}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}