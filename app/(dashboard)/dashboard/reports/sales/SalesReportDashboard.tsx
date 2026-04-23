"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download, Printer, Package2, ShoppingCart, ArrowUpRight, Award,
  CreditCard, AlertTriangle, CheckCircle2, Clock, Ban, Banknote,
  Smartphone, WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "../stock-movements/components/PageHeader";
import { SalesSummaryCards } from "./components/SalesSummaryCards";
import { SalesTimelineChart } from "./components/SalesTimeChart";
import { TopPerformersChart } from "./components/TopPerformersChart";
import { SalesByCustomerTable } from "./components/SalesByCustomerTable";
import SalesByItemTable from "./components/SalesByItemTable";

import {
  SalesReportData, SingleSaleDetail, WholesaleSaleDetail,
} from "@/actions/sales-reports";
import { DateRangePicker } from "../../sales/orders/components/DateRangePicker";

interface SalesReportDashboardProps {
  data: SalesReportData;
  onDateRangeChange: (from?: Date, to?: Date) => void;
}

// ── Currency helper ────────────────────────────────────────────────────────────
function currency(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n);
}

// ── CSV download helper ────────────────────────────────────────────────────────
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) { toast.error("No data to export."); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  downloadCsv(csv, filename);
}

// ── Mini stat card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent = "default",
}: {
  label: string; value: string; sub?: string;
  accent?: "default" | "amber" | "blue" | "green" | "red" | "orange" | "purple";
}) {
  const colours: Record<string, string> = {
    default: "bg-card border-border",
    amber:   "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    blue:    "bg-blue-50  border-blue-200  dark:bg-blue-950/20  dark:border-blue-800",
    green:   "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    red:     "bg-red-50   border-red-200   dark:bg-red-950/20   dark:border-red-800",
    orange:  "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
    purple:  "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
  };
  const textColours: Record<string, string> = {
    default: "text-foreground",
    amber:   "text-amber-900 dark:text-amber-100",
    blue:    "text-blue-900  dark:text-blue-100",
    green:   "text-green-900 dark:text-green-100",
    red:     "text-red-900   dark:text-red-100",
    orange:  "text-orange-900 dark:text-orange-100",
    purple:  "text-purple-900 dark:text-purple-100",
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

// ── Payment status badge ───────────────────────────────────────────────────────
function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PAID:     { label: "Paid",     className: "bg-green-100 text-green-700 border-green-200" },
    PARTIAL:  { label: "Partial",  className: "bg-amber-100 text-amber-700 border-amber-200" },
    PENDING:  { label: "Credit",   className: "bg-blue-100  text-blue-700  border-blue-200"  },
    REFUNDED: { label: "Refunded", className: "bg-red-100   text-red-700   border-red-200"   },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${s.className}`}>
      {s.label}
    </Badge>
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
            {["Order","Customer","Item","Location","Pack Type","Packs","Units/Pack","Total Units","Price/Pack","Unit Price","Saving/Unit","Total Savings","Line Total"].map(h => (
              <th key={h} className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left whitespace-nowrap last:text-right">{h}</th>
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
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] whitespace-nowrap">{l.tierName}</Badge>
              </td>
              <td className="py-2.5 px-3 font-semibold text-center">{l.packQuantity}</td>
              <td className="py-2.5 px-3 text-muted-foreground text-center">{l.unitsPerPack}</td>
              <td className="py-2.5 px-3 font-semibold text-center text-green-700">{l.totalUnits}</td>
              <td className="py-2.5 px-3 whitespace-nowrap">{currency(l.pricePerPack)}</td>
              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{currency(l.pricePerUnit)}</td>
              <td className="py-2.5 px-3 text-green-600 whitespace-nowrap">{l.savingsPerUnit > 0 ? `-${currency(l.savingsPerUnit)}` : "—"}</td>
              <td className="py-2.5 px-3 text-green-600 font-medium whitespace-nowrap">{l.totalSavings > 0 ? currency(l.totalSavings) : "—"}</td>
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
            {["Order","Customer","Item","Location","Qty","Unit Price","Line Total"].map(h => (
              <th key={h} className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left last:text-right whitespace-nowrap">{h}</th>
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

// ── Wholesale vs Single tab ────────────────────────────────────────────────────
function WholesaleVsSingleTab({ data }: { data: SalesReportData }) {
  const vs = data.wholesaleVsSingle;
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "wholesale" | "single">("overview");

  const handleExport = () => {
    if (activeSubTab === "wholesale") {
      toCsv(data.wholesaleDetails.map(l => ({
        "Order": l.orderNumber, "Date": l.orderDate, "Customer": l.customerName,
        "Location": l.locationName, "Item": l.itemName, "SKU": l.sku,
        "Pack Type": l.tierName, "Packs": l.packQuantity, "Units/Pack": l.unitsPerPack,
        "Total Units": l.totalUnits, "Price/Pack": l.pricePerPack,
        "Unit Price": l.pricePerUnit, "Line Total": l.lineTotal,
      })), "wholesale-sales.csv");
    } else if (activeSubTab === "single") {
      toCsv(data.singleDetails.map(l => ({
        "Order": l.orderNumber, "Date": l.orderDate, "Customer": l.customerName,
        "Location": l.locationName, "Item": l.itemName, "SKU": l.sku,
        "Qty": l.quantity, "Unit Price": l.unitPrice, "Line Total": l.lineTotal,
      })), "single-sales.csv");
    } else {
      toCsv([{
        "Wholesale Revenue": vs.wholesaleRevenue, "Single Revenue": vs.singleRevenue,
        "Wholesale Units": vs.wholesaleUnitsSold, "Single Units": vs.singleUnitsSold,
        "Savings Given": vs.totalSavingsGiven,
      }], "wholesale-vs-single-overview.csv");
    }
    toast.success("Exported!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            Revenue Split — Single vs Wholesale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-6 rounded-full overflow-hidden flex mb-2 bg-muted">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${vs.singleRevenuePercent}%` }} title={`Single: ${vs.singleRevenuePercent.toFixed(1)}%`} />
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${vs.wholesaleRevenuePercent}%` }} title={`Wholesale: ${vs.wholesaleRevenuePercent.toFixed(1)}%`} />
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Wholesale Revenue" accent="amber" value={currency(vs.wholesaleRevenue)} sub={`${vs.wholesaleUnitsSold.toLocaleString()} units in packs`} />
        <StatCard label="Single-Unit Revenue" accent="blue" value={currency(vs.singleRevenue)} sub={`${vs.singleUnitsSold.toLocaleString()} single units`} />
        <StatCard label="Savings Given" accent="green" value={currency(vs.totalSavingsGiven)} sub="vs buying individually" />
        <StatCard label="Wholesale Orders" value={`${vs.wholesaleOrders}`} sub={`of ${vs.totalOrders} total`} />
      </div>

      {vs.packBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package2 className="h-4 w-4 text-amber-600" />Sales by Pack Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {["Pack Type","Packs Sold","Units Deducted","Revenue","% of Wholesale"].map(h => (
                      <th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground text-left last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vs.packBreakdown.map((p) => (
                    <tr key={p.tierName} className="border-b hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 rounded"><Package2 className="h-3 w-3 text-amber-600" /></div>
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

      {vs.topWholesaleItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600" />Top Wholesale Items
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

      <div className="space-y-2">
        <div className="flex gap-2">
          {(["overview", "wholesale", "single"] as const).map((t) => (
            <button key={t} onClick={() => setActiveSubTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSubTab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t === "overview" ? "Overview" : t === "wholesale" ? `Wholesale Lines (${data.wholesaleDetails.length})` : `Single Lines (${data.singleDetails.length})`}
            </button>
          ))}
        </div>

        {activeSubTab === "wholesale" && <Card><CardContent className="pt-4"><WholesaleTable rows={data.wholesaleDetails} /></CardContent></Card>}
        {activeSubTab === "single"    && <Card><CardContent className="pt-4"><SingleTable rows={data.singleDetails} /></CardContent></Card>}

        {activeSubTab === "overview" && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package2 className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-semibold">Wholesale Summary</h4>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">{data.wholesaleDetails.length} lines</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-semibold">{currency(vs.wholesaleRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Units sold (in packs)</span><span className="font-semibold">{vs.wholesaleUnitsSold.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Orders with wholesale</span><span className="font-semibold">{vs.wholesaleOrders}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Savings given</span><span className="font-semibold text-green-600">{currency(vs.totalSavingsGiven)}</span></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-semibold">Single-Unit Summary</h4>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-[10px]">{data.singleDetails.length} lines</Badge>
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

// ── Credit & Payment tab ───────────────────────────────────────────────────────
function CreditPaymentTab({ data }: { data: SalesReportData }) {
  const cp = data.creditPayment;

  const handleExport = () => {
    toCsv([
      {
        "Cash Revenue":       cp.cashRevenue,
        "MoMo Revenue":       cp.momoRevenue,
        "Card Revenue":       cp.cardRevenue,
        "Total Collected":    cp.totalCollected,
        "Outstanding Credit": cp.totalOutstanding,
        "Paid Orders":        cp.paidOrders,
        "Partial Orders":     cp.partialOrders,
        "Pending Orders":     cp.pendingOrders,
        "Cancelled Orders":   cp.cancelledOrders,
      },
    ], "credit-payment-summary.csv");
    toast.success("Exported credit summary!");
  };

  const handleExportDebtors = () => {
    toCsv(
      cp.topDebtors.map(d => ({
        "Customer":     d.customerName,
        "Total Owing":  d.totalOwing,
        "Order Count":  d.orderCount,
        "Overdue":      d.isOverdue ? "Yes" : "No",
      })),
      "top-debtors.csv"
    );
    toast.success("Exported debtors list!");
  };

  const paymentMethods = [
    { label: "Cash",        value: cp.cashRevenue,  icon: Banknote,     color: "text-green-600",  bg: "bg-green-100" },
    { label: "MoMo",        value: cp.momoRevenue,  icon: Smartphone,   color: "text-blue-600",   bg: "bg-blue-100"  },
    { label: "Card",        value: cp.cardRevenue,  icon: WalletCards,  color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track credit orders, payment collections, and outstanding balances.</p>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Collected" accent="green"
          value={currency(cp.totalCollected)}
          sub="Cash + MoMo + Card"
        />
        <StatCard label="Outstanding Credit" accent="orange"
          value={currency(cp.totalOutstanding)}
          sub={`${cp.pendingOrders + cp.partialOrders} open orders`}
        />
        <StatCard label="Fully Paid Orders" accent="blue"
          value={`${cp.paidOrders}`}
          sub="Payment complete"
        />
        <StatCard label="Credit / Partial" accent="amber"
          value={`${cp.pendingOrders + cp.partialOrders}`}
          sub={`${cp.partialOrders} partial · ${cp.pendingOrders} pending`}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Revenue by Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {paymentMethods.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-lg font-bold">{currency(value)}</p>
                </div>
              </div>
            ))}
          </div>
          {cp.totalCollected > 0 && (
            <div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted">
                <div className="h-full bg-green-500" style={{ width: `${(cp.cashRevenue / cp.totalCollected) * 100}%` }} title="Cash" />
                <div className="h-full bg-blue-500"  style={{ width: `${(cp.momoRevenue / cp.totalCollected) * 100}%` }} title="MoMo" />
                <div className="h-full bg-purple-500" style={{ width: `${(cp.cardRevenue / cp.totalCollected) * 100}%` }} title="Card" />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Cash {cp.totalCollected > 0 ? ((cp.cashRevenue/cp.totalCollected)*100).toFixed(0) : 0}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>MoMo {cp.totalCollected > 0 ? ((cp.momoRevenue/cp.totalCollected)*100).toFixed(0) : 0}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/>Card {cp.totalCollected > 0 ? ((cp.cardRevenue/cp.totalCollected)*100).toFixed(0) : 0}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Orders by Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Fully Paid",  count: cp.paidOrders,      icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50  border-green-200"  },
              { label: "Partial",     count: cp.partialOrders,   icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50  border-amber-200"  },
              { label: "Pending",     count: cp.pendingOrders,   icon: AlertTriangle,color: "text-blue-600",   bg: "bg-blue-50   border-blue-200"   },
              { label: "Cancelled",   count: cp.cancelledOrders, icon: Ban,          color: "text-red-600",    bg: "bg-red-50    border-red-200"     },
            ].map((item) => (
              <div key={item.label} className={`flex items-center gap-3 p-3 rounded-lg border ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <div>
                  <p className="text-xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {cp.topDebtors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Top Outstanding Balances
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleExportDebtors} className="text-xs">
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-left">Customer</th>
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-center">Orders</th>
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-right">Amount Owing</th>
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cp.topDebtors.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {d.customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{d.customerName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground">{d.orderCount}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-red-600">{currency(d.totalOwing)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {d.isOverdue
                          ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">Overdue</Badge>
                          : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Recent Orders Table with payment status ────────────────────────────────────
function EnrichedRecentOrdersTable({ orders }: { orders: SalesReportData["recentOrders"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Order","Customer","Date","Items","Order Total","Paid","Owing","Payment","Status"].map(h => (
                  <th key={h} className="py-2 px-3 text-xs font-semibold text-muted-foreground text-left last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs font-medium">{o.orderNumber}</td>
                  <td className="py-2.5 px-3 text-xs">{o.customerName}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{o.date}</td>
                  <td className="py-2.5 px-3 text-center text-xs">{o.itemCount}</td>
                  <td className="py-2.5 px-3 font-semibold whitespace-nowrap">{currency(o.total)}</td>
                  <td className="py-2.5 px-3 text-green-600 font-medium whitespace-nowrap">
                    {o.amountPaid > 0 ? currency(o.amountPaid) : "—"}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {o.amountOwing > 0
                      ? <span className="text-red-600 font-medium">{currency(o.amountOwing)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3"><PaymentBadge status={o.paymentStatus} /></td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function SalesReportDashboard({ data, onDateRangeChange }: SalesReportDashboardProps) {
  const { summary, salesByCustomer, salesByItem, timeline, topCustomers, topItems, recentOrders } = data;
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const handleRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setFromDate(from);
    setToDate(to);
    onDateRangeChange(from, to);
  };

  const handleExportAll = () => {
    toCsv(
      recentOrders.map(o => ({
        "Order #":        o.orderNumber,
        "Customer":       o.customerName,
        "Date":           o.date,
        "Items":          o.itemCount,
        "Order Total":    o.total,
        "Amount Paid":    o.amountPaid,
        "Amount Owing":   o.amountOwing,
        "Payment Status": o.paymentStatus,
        "Order Status":   o.status,
      })),
      `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    toast.success("Sales report exported!");
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print, button:not(.print-button), .tabs-list, .date-range-picker, .page-header-actions {
            display: none !important;
          }
          body, main, .space-y-6, .card {
            margin: 0;
            padding: 0;
            width: 100%;
            break-inside: avoid;
          }
          .text-xs, p, span { font-size: 9pt; }
          h1 { font-size: 18pt; }
          h2 { font-size: 14pt; }
          table { font-size: 8pt; }
          .grid { display: block; }
          .grid > * { margin-bottom: 12px; }
        }
      `}</style>

      <div className="space-y-6 p-6 print:p-0">
        <PageHeader title="Sales Report" description="Comprehensive sales analytics and performance metrics">
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </PageHeader>

        <DateRangePicker from={fromDate} to={toDate} onRangeChange={handleRangeChange} />

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
            <TabsTrigger value="credit" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
              Credit &amp; Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <SalesTimelineChart data={timeline} />
            <div className="grid gap-6 md:grid-cols-2">
              <TopPerformersChart data={topCustomers} title="Top Customers" description="Top 5 by revenue" color="#3b82f6" />
              <TopPerformersChart data={topItems}     title="Top Products"  description="Top 5 by revenue" color="#10b981" />
            </div>
            <EnrichedRecentOrdersTable orders={recentOrders} />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <TopPerformersChart data={topCustomers} title="Top Customers by Revenue" description="Top 5 performing customers" color="#3b82f6" />
            <SalesByCustomerTable customers={salesByCustomer} />
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <TopPerformersChart data={topItems} title="Top Products by Revenue" description="Best performing products" color="#10b981" />
            <SalesByItemTable data={{ items: salesByItem, summary: summary }} />
          </TabsContent>

          <TabsContent value="wholesale">
            <WholesaleVsSingleTab data={data} />
          </TabsContent>

          <TabsContent value="credit">
            <CreditPaymentTab data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}