"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer, Package2, ShoppingCart, TrendingDown, ArrowUpRight, Award } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "../stock-movements/components/PageHeader";
import { DateRangeFilter } from "../stock-movements/components/DateRangeFilter";
import { SalesSummaryCards } from "./components/SalesSummaryCards";
import { SalesTimelineChart } from "./components/SalesTimeChart";
import { TopPerformersChart } from "./components/TopPerformersChart";
import { RecentOrdersTable } from "./components/RecentOrdersTable";
import { SalesByCustomerTable } from "./components/SalesByCustomerTable";
import { SalesByItemTable } from "./components/SalesByItemTable";
import { SalesReportData, SingleSaleDetail, WholesaleSaleDetail } from "@/actions/sales-reports";

interface SalesReportDashboardProps {
  data: SalesReportData;
}

// ── Currency helper ────────────────────────────────────────────────────────────
function currency(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n);
}

// ── Mini stat card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent = "default",
}: {
  label: string; value: string; sub?: string;
  accent?: "default" | "amber" | "blue" | "green" | "red";
}) {
  const colours = {
    default: "bg-card border-border",
    amber:   "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    blue:    "bg-blue-50  border-blue-200  dark:bg-blue-950/20  dark:border-blue-800",
    green:   "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    red:     "bg-red-50   border-red-200   dark:bg-red-950/20   dark:border-red-800",
  };
  const textColours = {
    default: "text-foreground",
    amber:   "text-amber-900 dark:text-amber-100",
    blue:    "text-blue-900  dark:text-blue-100",
    green:   "text-green-900 dark:text-green-100",
    red:     "text-red-900   dark:text-red-100",
  };
  return (
    <Card className={`border ${colours[accent]}`}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${textColours[accent]}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Wholesale details table ────────────────────────────────────────────────────
function WholesaleTable({ rows }: { rows: WholesaleSaleDetail[] }) {
  if (!rows.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No wholesale sales in this period.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-amber-50/60 dark:bg-amber-950/20">
            {[
              "Order", "Customer", "Item", "Location",
              "Pack Type", "Packs", "Units/Pack", "Total Units",
              "Price/Pack", "Unit Price", "Saving/Unit", "Total Savings", "Line Total",
            ].map(h => (
              <th key={h} className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left whitespace-nowrap last:text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-3">
                <p className="font-medium text-xs whitespace-nowrap">{l.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground">{l.orderDate}</p>
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.customerName}</td>
              <td className="py-2.5 px-3">
                <p className="font-medium whitespace-nowrap">{l.itemName}</p>
                <p className="text-[10px] text-muted-foreground">{l.sku}</p>
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.locationName}</td>
              <td className="py-2.5 px-3">
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] whitespace-nowrap">
                  {l.tierName}
                </Badge>
              </td>
              <td className="py-2.5 px-3 font-semibold text-center">{l.packQuantity}</td>
              <td className="py-2.5 px-3 text-muted-foreground text-center">{l.unitsPerPack}</td>
              <td className="py-2.5 px-3 font-semibold text-center text-green-700">{l.totalUnits}</td>
              <td className="py-2.5 px-3 whitespace-nowrap">{currency(l.pricePerPack)}</td>
              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{currency(l.pricePerUnit)}</td>
              <td className="py-2.5 px-3 text-green-600 whitespace-nowrap">
                {l.savingsPerUnit > 0 ? `-${currency(l.savingsPerUnit)}` : "—"}
              </td>
              <td className="py-2.5 px-3 text-green-600 font-medium whitespace-nowrap">
                {l.totalSavings > 0 ? currency(l.totalSavings) : "—"}
              </td>
              <td className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">{currency(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Single-unit details table ──────────────────────────────────────────────────
function SingleTable({ rows }: { rows: SingleSaleDetail[] }) {
  if (!rows.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No single-unit sales in this period.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {["Order", "Customer", "Item", "Location", "Qty", "Unit Price", "Line Total"].map(h => (
              <th key={h} className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left last:text-right whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-3">
                <p className="font-medium text-xs whitespace-nowrap">{l.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground">{l.orderDate}</p>
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.customerName}</td>
              <td className="py-2.5 px-3">
                <p className="font-medium whitespace-nowrap">{l.itemName}</p>
                <p className="text-[10px] text-muted-foreground">{l.sku}</p>
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.locationName}</td>
              <td className="py-2.5 px-3 font-semibold">{l.quantity}</td>
              <td className="py-2.5 px-3 whitespace-nowrap">{currency(l.unitPrice)}</td>
              <td className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">{currency(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Wholesale vs Single overview tab ──────────────────────────────────────────
function WholesaleVsSingleTab({ data }: { data: SalesReportData }) {
  const vs = data.wholesaleVsSingle;
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "wholesale" | "single">("overview");

  return (
    <div className="space-y-6">

      {/* ── Revenue split bar ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            Revenue Split — Single vs Wholesale
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="w-full h-6 rounded-full overflow-hidden flex mb-2 bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${vs.singleRevenuePercent}%` }}
              title={`Single: ${vs.singleRevenuePercent.toFixed(1)}%`}
            />
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${vs.wholesaleRevenuePercent}%` }}
              title={`Wholesale: ${vs.wholesaleRevenuePercent.toFixed(1)}%`}
            />
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              Single — {currency(vs.singleRevenue)} ({vs.singleRevenuePercent.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
              Wholesale — {currency(vs.wholesaleRevenue)} ({vs.wholesaleRevenuePercent.toFixed(1)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Wholesale Revenue" accent="amber"
          value={currency(vs.wholesaleRevenue)}
          sub={`${vs.wholesaleUnitsSold.toLocaleString()} units in packs`}
        />
        <StatCard label="Single-Unit Revenue" accent="blue"
          value={currency(vs.singleRevenue)}
          sub={`${vs.singleUnitsSold.toLocaleString()} single units`}
        />
        <StatCard label="Savings Given to Customers" accent="green"
          value={currency(vs.totalSavingsGiven)}
          sub="vs buying individually"
        />
        <StatCard label="Wholesale Orders" accent="default"
          value={`${vs.wholesaleOrders}`}
          sub={`of ${vs.totalOrders} total orders`}
        />
      </div>

      {/* ── Pack type breakdown ── */}
      {vs.packBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package2 className="h-4 w-4 text-amber-600" />
              Sales by Pack Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {["Pack Type", "Packs Sold", "Units Deducted", "Revenue", "% of Wholesale"].map(h => (
                      <th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground text-left last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vs.packBreakdown.map((p) => (
                    <tr key={p.tierName} className="border-b hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 rounded">
                            <Package2 className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="font-medium">{p.tierName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{p.packsSold}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{p.unitsSold}</td>
                      <td className="py-2.5 px-3 font-semibold">{currency(p.revenue)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.percentage}%` }} />
                          </div>
                          <span className="text-muted-foreground text-xs">{p.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top wholesale items ── */}
      {vs.topWholesaleItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />
              Top Wholesale Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vs.topWholesaleItems.map((item, i) => (
                <div key={item.sku} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.itemName}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sku} · {item.unitsSold} units sold</p>
                  </div>
                  <span className="text-sm font-semibold">{currency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Sub-tab: detail line tables ── */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {(["overview", "wholesale", "single"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveSubTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSubTab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "overview"   ? "Overview"
               : t === "wholesale" ? `Wholesale Lines (${data.wholesaleDetails.length})`
               :                    `Single Lines (${data.singleDetails.length})`}
            </button>
          ))}
        </div>

        {activeSubTab === "wholesale" && (
          <Card>
            <CardContent className="pt-4">
              <WholesaleTable rows={data.wholesaleDetails} />
            </CardContent>
          </Card>
        )}

        {activeSubTab === "single" && (
          <Card>
            <CardContent className="pt-4">
              <SingleTable rows={data.singleDetails} />
            </CardContent>
          </Card>
        )}

        {activeSubTab === "overview" && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Wholesale summary */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package2 className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-semibold">Wholesale Summary</h4>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                      {data.wholesaleDetails.length} lines
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-semibold">{currency(vs.wholesaleRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Units sold (in packs)</span><span className="font-semibold">{vs.wholesaleUnitsSold.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Orders with wholesale</span><span className="font-semibold">{vs.wholesaleOrders}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Savings given</span><span className="font-semibold text-green-600">{currency(vs.totalSavingsGiven)}</span></div>
                  </div>
                </div>

                {/* Single summary */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-semibold">Single-Unit Summary</h4>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-[10px]">
                      {data.singleDetails.length} lines
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-semibold">{currency(vs.singleRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Units sold</span><span className="font-semibold">{vs.singleUnitsSold.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Orders with single lines</span><span className="font-semibold">{vs.singleOrders}</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function SalesReportDashboard({ data }: SalesReportDashboardProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { summary, salesByCustomer, salesByItem, timeline, topCustomers, topItems, recentOrders } = data;

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setDateRange({ from, to });
    toast.info("Date range filter applied");
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sales Report"
        description="Comprehensive sales analytics and performance metrics"
      >
        <Button variant="outline" onClick={() => toast.info("Exporting…")}>
          <Download className="h-4 w-4 mr-2" />Export
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />Print
        </Button>
      </PageHeader>

      <DateRangeFilter
        onDateRangeChange={handleDateRangeChange}
        onPeriodChange={() => {}}
      />

      <SalesSummaryCards summary={summary} />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Sales Summary</TabsTrigger>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="items">By Item</TabsTrigger>
          <TabsTrigger value="wholesale" className="gap-1.5">
            <Package2 className="h-3.5 w-3.5 text-amber-600" />
            Single vs Wholesale
          </TabsTrigger>
        </TabsList>

        {/* ── Summary tab ── */}
        <TabsContent value="summary" className="space-y-6">
          <SalesTimelineChart data={timeline} />
          <div className="grid gap-6 md:grid-cols-2">
            <TopPerformersChart data={topCustomers} title="Top Customers" description="Top 5 by revenue" color="#3b82f6" />
            <TopPerformersChart data={topItems}     title="Top Products"  description="Top 5 by revenue" color="#10b981" />
          </div>
          <RecentOrdersTable orders={recentOrders} />
        </TabsContent>

        {/* ── Customers tab ── */}
        <TabsContent value="customers" className="space-y-6">
          <TopPerformersChart data={topCustomers} title="Top Customers by Revenue" description="Top 5 performing customers" color="#3b82f6" />
          <SalesByCustomerTable customers={salesByCustomer} />
        </TabsContent>

        {/* ── Items tab ── */}
        <TabsContent value="items" className="space-y-6">
          <TopPerformersChart data={topItems} title="Top Products by Revenue" description="Best performing products" color="#10b981" />
          <SalesByItemTable items={salesByItem} />
        </TabsContent>

        {/* ── Wholesale vs Single tab ── */}
        <TabsContent value="wholesale">
          <WholesaleVsSingleTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}