"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download, Printer, Package2, ShoppingCart, ArrowUpRight, Award,
  CreditCard, AlertTriangle, CheckCircle2, Clock, Ban, Banknote,
  Smartphone, WalletCards, ExternalLink, CalendarIcon, TrendingUp,
  DollarSign, Tag, BarChart2, Percent,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "../stock-movements/components/PageHeader";
import { SalesTimelineChart } from "./components/SalesTimeChart";
import { TopPerformersChart } from "./components/TopPerformersChart";
import { SalesByCustomerTable } from "./components/SalesByCustomerTable";
import SalesByItemTable from "./components/SalesByItemTable";
import {
  SalesReportData, SingleSaleDetail, WholesaleSaleDetail,
} from "@/actions/sales-reports";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

// ── CSV helpers ────────────────────────────────────────────────────────────────
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
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  downloadCsv(csv, filename);
}

// ── Accent config ──────────────────────────────────────────────────────────────
type Accent = "green" | "blue" | "purple" | "orange" | "amber" | "red" | "cyan" | "pink" | "indigo";

const accentConfig: Record<Accent, {
  border: string; bg: string; iconBg: string; iconColor: string;
  valueColor: string; badgeBg: string; badgeText: string;
}> = {
  green: {
    border:     "border-l-4 border-l-emerald-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-emerald-400/15",
    iconColor:  "text-emerald-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText:  "text-emerald-600 dark:text-emerald-300",
  },
  blue: {
    border:     "border-l-4 border-l-blue-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-blue-400/15",
    iconColor:  "text-blue-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-blue-50 dark:bg-blue-950/40",
    badgeText:  "text-blue-600 dark:text-blue-300",
  },
  purple: {
    border:     "border-l-4 border-l-violet-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-violet-400/15",
    iconColor:  "text-violet-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-violet-50 dark:bg-violet-950/40",
    badgeText:  "text-violet-600 dark:text-violet-300",
  },
  orange: {
    border:     "border-l-4 border-l-orange-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-orange-400/15",
    iconColor:  "text-orange-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-orange-50 dark:bg-orange-950/40",
    badgeText:  "text-orange-600 dark:text-orange-300",
  },
  amber: {
    border:     "border-l-4 border-l-amber-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-amber-400/15",
    iconColor:  "text-amber-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-amber-50 dark:bg-amber-950/40",
    badgeText:  "text-amber-600 dark:text-amber-300",
  },
  red: {
    border:     "border-l-4 border-l-red-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-red-400/15",
    iconColor:  "text-red-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-red-50 dark:bg-red-950/40",
    badgeText:  "text-red-600 dark:text-red-300",
  },
  cyan: {
    border:     "border-l-4 border-l-cyan-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-cyan-400/15",
    iconColor:  "text-cyan-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-cyan-50 dark:bg-cyan-950/40",
    badgeText:  "text-cyan-600 dark:text-cyan-300",
  },
  pink: {
    border:     "border-l-4 border-l-pink-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-pink-400/15",
    iconColor:  "text-pink-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-pink-50 dark:bg-pink-950/40",
    badgeText:  "text-pink-600 dark:text-pink-300",
  },
  indigo: {
    border:     "border-l-4 border-l-indigo-500",
    bg:         "bg-white dark:bg-card",
    iconBg:     "text-indigo-400/15",
    iconColor:  "text-indigo-500",
    valueColor: "text-slate-700 dark:text-slate-200",
    badgeBg:    "bg-indigo-50 dark:bg-indigo-950/40",
    badgeText:  "text-indigo-600 dark:text-indigo-300",
  },
};

// ── Stat Card — matches the screenshot design ──────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  subHighlight,
  accent = "green",
  icon: Icon,
  linkToAccounting,
  growth,
}: {
  label: string;
  value: string;
  sub?: string;
  subHighlight?: string;   // coloured pill text (e.g. "220 orders")
  accent?: Accent;
  icon?: React.ElementType;
  linkToAccounting?: boolean;
  /** If provided, shows a growth chip: "+15.2%" in accent colour */
  growth?: { value: string; positive: boolean };
}) {
  const c = accentConfig[accent];

  return (
    <div className={`relative rounded-xl border shadow-sm overflow-hidden ${c.border} ${c.bg}`}>
      {/* Watermark icon — large, very faint */}
      {Icon && (
        <Icon
          className={`absolute top-2 right-3 h-16 w-16 ${c.iconBg} pointer-events-none select-none`}
          aria-hidden
        />
      )}

      {/* External link */}
      {linkToAccounting && (
        <Link
          href="/accounting/profit-loss"
          className="absolute top-2.5 right-2.5 opacity-40 hover:opacity-80 transition-opacity z-10"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      )}

      <div className="px-5 pt-5 pb-4 relative z-[1]">
        {/* Label — soft gray, uppercase, spaced */}
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-2">
          {label}
        </p>

        {/* Main value — charcoal, not pure black */}
        <p className={`text-[1.75rem] font-bold tracking-tight leading-none mb-3 ${c.valueColor}`}>
          {value}
        </p>

        {/* Sub line */}
        <div className="flex items-center gap-2 flex-wrap">
          {subHighlight && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.badgeBg} ${c.badgeText}`}>
              {subHighlight}
            </span>
          )}
          {sub && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>
          )}
          {growth && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                growth.positive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
              )}
            >
              <TrendingUp className={cn("h-3 w-3", !growth.positive && "rotate-180")} />
              {growth.value}
            </span>
          )}
        </div>
      </div>
    </div>
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
    <Badge variant="outline" className={`text-[10px] font-semibold ${s.className}`}>{s.label}</Badge>
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
              <td className="py-2.5 px-3"><p className="font-medium text-xs whitespace-nowrap">{l.orderNumber}</p><p className="text-[10px] text-muted-foreground">{l.orderDate}</p></td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.customerName}</td>
              <td className="py-2.5 px-3"><p className="font-medium whitespace-nowrap">{l.itemName}</p><p className="text-[10px] text-muted-foreground">{l.sku}</p></td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.locationName}</td>
              <td className="py-2.5 px-3"><Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] whitespace-nowrap">{l.tierName}</Badge></td>
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
              <td className="py-2.5 px-3"><p className="font-medium text-xs whitespace-nowrap">{l.orderNumber}</p><p className="text-[10px] text-muted-foreground">{l.orderDate}</p></td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{l.customerName}</td>
              <td className="py-2.5 px-3"><p className="font-medium whitespace-nowrap">{l.itemName}</p><p className="text-[10px] text-muted-foreground">{l.sku}</p></td>
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
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${vs.singleRevenuePercent}%` }} />
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${vs.wholesaleRevenuePercent}%` }} />
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />Single — {currency(vs.singleRevenue)} ({vs.singleRevenuePercent.toFixed(1)}%)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Wholesale — {currency(vs.wholesaleRevenue)} ({vs.wholesaleRevenuePercent.toFixed(1)}%)</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Wholesale Revenue" accent="amber" icon={Package2} value={currency(vs.wholesaleRevenue)} subHighlight={`${vs.wholesaleUnitsSold.toLocaleString()} units`} sub="in packs" />
        <StatCard label="Single-Unit Revenue" accent="blue" icon={ShoppingCart} value={currency(vs.singleRevenue)} subHighlight={`${vs.singleUnitsSold.toLocaleString()} units`} />
        <StatCard label="Savings Given" accent="green" icon={Tag} value={currency(vs.totalSavingsGiven)} sub="vs buying individually" />
        <StatCard label="Wholesale Orders" accent="purple" icon={BarChart2} value={`${vs.wholesaleOrders}`} sub={`of ${vs.totalOrders} total`} />
      </div>

      {vs.packBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Package2 className="h-4 w-4 text-amber-600" />Sales by Pack Type</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>{["Pack Type","Packs Sold","Units Deducted","Revenue","% of Wholesale"].map(h => (<th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground text-left last:text-right">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {vs.packBreakdown.map((p) => (
                    <tr key={p.tierName} className="border-b hover:bg-muted/30">
                      <td className="py-2.5 px-3"><div className="flex items-center gap-2"><div className="p-1 bg-amber-100 rounded"><Package2 className="h-3 w-3 text-amber-600" /></div><span className="font-medium">{p.tierName}</span></div></td>
                      <td className="py-2.5 px-3 font-semibold">{p.packsSold}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{p.unitsSold}</td>
                      <td className="py-2.5 px-3 font-semibold">{currency(p.revenue)}</td>
                      <td className="py-2.5 px-3 text-right"><div className="flex items-center justify-end gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.percentage}%` }} /></div><span className="text-muted-foreground text-xs">{p.percentage.toFixed(1)}%</span></div></td>
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
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-amber-600" />Top Wholesale Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vs.topWholesaleItems.map((item, i) => (
                <div key={item.sku} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.itemName}</p><p className="text-[10px] text-muted-foreground">{item.sku} · {item.unitsSold} units sold</p></div>
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
        {activeSubTab === "single"    && <Card><CardContent className="pt-4"><SingleTable    rows={data.singleDetails}    /></CardContent></Card>}
        {activeSubTab === "overview" && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3"><Package2 className="h-4 w-4 text-amber-600" /><h4 className="text-sm font-semibold">Wholesale Summary</h4><Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">{data.wholesaleDetails.length} lines</Badge></div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-semibold">{currency(vs.wholesaleRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Units sold (in packs)</span><span className="font-semibold">{vs.wholesaleUnitsSold.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Orders with wholesale</span><span className="font-semibold">{vs.wholesaleOrders}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Savings given</span><span className="font-semibold text-green-600">{currency(vs.totalSavingsGiven)}</span></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3"><ShoppingCart className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-semibold">Single-Unit Summary</h4><Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-[10px]">{data.singleDetails.length} lines</Badge></div>
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
    toCsv([{
      "Cash Revenue": cp.cashRevenue, "MoMo Revenue": cp.momoRevenue,
      "Card Revenue": cp.cardRevenue, "Total Collected": cp.totalCollected,
      "Outstanding Credit": cp.totalOutstanding, "Paid Orders": cp.paidOrders,
      "Partial Orders": cp.partialOrders, "Pending Orders": cp.pendingOrders,
      "Cancelled Orders": cp.cancelledOrders,
    }], "credit-payment-summary.csv");
    toast.success("Exported credit summary!");
  };

  const handleExportDebtors = () => {
    toCsv(cp.topDebtors.map(d => ({
      "Customer": d.customerName, "Total Owing": d.totalOwing,
      "Order Count": d.orderCount, "Overdue": d.isOverdue ? "Yes" : "No",
    })), "top-debtors.csv");
    toast.success("Exported debtors list!");
  };

  const paymentMethods = [
    { label: "Cash",  value: cp.cashRevenue,  icon: Banknote,    color: "text-green-600",  bg: "bg-green-100"  },
    { label: "MoMo",  value: cp.momoRevenue,  icon: Smartphone,  color: "text-blue-600",   bg: "bg-blue-100"   },
    { label: "Card",  value: cp.cardRevenue,  icon: WalletCards, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track credit orders, payment collections, and outstanding balances.</p>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Collected"    accent="green"  icon={Banknote}      value={currency(cp.totalCollected)}  subHighlight="Cash + MoMo + Card" />
        <StatCard label="Outstanding Credit" accent="orange" icon={AlertTriangle} value={currency(cp.totalOutstanding)} sub={`${cp.pendingOrders + cp.partialOrders} open orders`} />
        <StatCard label="Fully Paid Orders"  accent="blue"   icon={CheckCircle2}  value={`${cp.paidOrders}`}           subHighlight="Payment complete" />
        <StatCard label="Credit / Partial"   accent="amber"  icon={Clock}         value={`${cp.pendingOrders + cp.partialOrders}`} sub={`${cp.partialOrders} partial · ${cp.pendingOrders} pending`} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Revenue by Payment Method</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {paymentMethods.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div><p className="text-xs text-muted-foreground font-medium">{label}</p><p className="text-lg font-bold">{currency(value)}</p></div>
              </div>
            ))}
          </div>
          {cp.totalCollected > 0 && (
            <div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted">
                <div className="h-full bg-green-500"  style={{ width: `${(cp.cashRevenue  / cp.totalCollected) * 100}%` }} />
                <div className="h-full bg-blue-500"   style={{ width: `${(cp.momoRevenue  / cp.totalCollected) * 100}%` }} />
                <div className="h-full bg-purple-500" style={{ width: `${(cp.cardRevenue  / cp.totalCollected) * 100}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Cash {((cp.cashRevenue/cp.totalCollected)*100).toFixed(0)}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />MoMo {((cp.momoRevenue/cp.totalCollected)*100).toFixed(0)}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Card {((cp.cardRevenue/cp.totalCollected)*100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Orders by Payment Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Fully Paid",  count: cp.paidOrders,      icon: CheckCircle2,   color: "text-green-600", bg: "bg-green-50  border-green-200"  },
              { label: "Partial",     count: cp.partialOrders,   icon: Clock,          color: "text-amber-600", bg: "bg-amber-50  border-amber-200"  },
              { label: "Pending",     count: cp.pendingOrders,   icon: AlertTriangle,  color: "text-blue-600",  bg: "bg-blue-50   border-blue-200"   },
              { label: "Cancelled",   count: cp.cancelledOrders, icon: Ban,            color: "text-red-600",   bg: "bg-red-50    border-red-200"    },
            ].map(({ label, count, icon: Icon, color, bg }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-lg border ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
                <div><p className="text-xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {cp.topDebtors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Top Outstanding Balances</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleExportDebtors} className="text-xs"><Download className="h-3 w-3 mr-1" />Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-left">Customer</th>
                  <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-center">Orders</th>
                  <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-right">Amount Owing</th>
                  <th className="py-2 px-3 text-xs font-semibold text-muted-foreground text-center">Status</th>
                </tr></thead>
                <tbody>
                  {cp.topDebtors.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{d.customerName.charAt(0).toUpperCase()}</div><span className="font-medium">{d.customerName}</span></div></td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground">{d.orderCount}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-red-600">{currency(d.totalOwing)}</td>
                      <td className="py-2.5 px-3 text-center">{d.isOverdue ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">Overdue</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>}</td>
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

// ── Recent Orders Table ────────────────────────────────────────────────────────
function EnrichedRecentOrdersTable({ orders }: { orders: SalesReportData["recentOrders"] }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Orders</CardTitle></CardHeader>
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
                  <td className="py-2.5 px-3 text-green-600 font-medium whitespace-nowrap">{o.amountPaid > 0 ? currency(o.amountPaid) : "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{o.amountOwing > 0 ? <span className="text-red-600 font-medium">{currency(o.amountOwing)}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-2.5 px-3"><PaymentBadge status={o.paymentStatus} /></td>
                  <td className="py-2.5 px-3 text-right"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function SalesReportDashboard({ data, onDateRangeChange }: SalesReportDashboardProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [toDate,   setToDate]   = useState<Date | undefined>(new Date());
  const [period,   setPeriod]   = useState<string>("30");

  const { summary, salesByCustomer, salesByItem, timeline, topCustomers, topItems, recentOrders } = data;

  // Computed financial metrics
  const totalCOGS        = salesByItem.reduce((s, i) => s + i.totalCOGS, 0);
  const totalGrossProfit = salesByItem.reduce((s, i) => s + i.grossProfit, 0);
  const avgGrossMargin   = salesByItem.length > 0
    ? salesByItem.reduce((s, i) => s + i.grossMargin, 0) / salesByItem.length : 0;

  // Revenue growth: compare current vs previous period (naive: half the timeline)
  const revenueGrowthPct: number | null = (() => {
    if (!timeline || timeline.length < 2) return null;
    const mid = Math.floor(timeline.length / 2);
    const prev = timeline.slice(0, mid).reduce((s: number, d: { revenue: number }) => s + d.revenue, 0);
    const curr = timeline.slice(mid).reduce((s: number, d: { revenue: number }) => s + d.revenue, 0);
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  })();

  const avgItemsPerOrder = summary.totalOrders > 0
    ? (salesByItem.reduce((s, i) => s + i.totalQuantitySold, 0) / summary.totalOrders).toFixed(1)
    : "0";

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const end = new Date();
    const daysMap: Record<string, number> = { "7": 7, "30": 30, "90": 90, "365": 365 };
    const start = subDays(end, daysMap[value] ?? 30);
    setFromDate(startOfDay(start));
    setToDate(endOfDay(end));
    onDateRangeChange(startOfDay(start), endOfDay(end));
  };

  const handleApplyDateRange = () => {
    if (fromDate && toDate) {
      onDateRangeChange(startOfDay(fromDate), endOfDay(toDate));
      toast.success(`Filtered: ${format(fromDate, "MMM dd, yyyy")} → ${format(toDate, "MMM dd, yyyy")}`);
    }
  };

  const handleReset = () => {
    const end = new Date();
    const start = subDays(end, 30);
    setFromDate(startOfDay(start));
    setToDate(endOfDay(end));
    setPeriod("30");
    onDateRangeChange(startOfDay(start), endOfDay(end));
    toast.success("Reset to last 30 days");
  };

  const handleExportAll = () => {
    toCsv(recentOrders.map(o => ({
      "Order #": o.orderNumber, "Customer": o.customerName, "Date": o.date,
      "Items": o.itemCount, "Order Total": o.total, "Amount Paid": o.amountPaid,
      "Amount Owing": o.amountOwing, "Payment Status": o.paymentStatus, "Order Status": o.status,
    })), `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("Sales report exported!");
  };

  return (
    <div className="space-y-6 p-6 print:p-0">
      {/* Header */}
      <PageHeader title="Sales Report" description="Comprehensive sales analytics and performance metrics">
        <Button variant="outline" onClick={handleExportAll}><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </PageHeader>

      {/* ── Date Range Filter ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Period</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleApplyDateRange} className="bg-primary hover:bg-primary/90">Apply</Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 1: Core revenue metrics ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          accent="green"
          icon={DollarSign}
          value={currency(summary.totalRevenue)}
          subHighlight={`${summary.totalOrders} orders`}
        />
        <StatCard
          label="Total Orders"
          accent="blue"
          icon={ShoppingCart}
          value={summary.totalOrders.toString()}
          subHighlight={`Avg. per day: ${(summary.totalOrders / (parseInt(period) || 30)).toFixed(1)}`}
        />
        <StatCard
          label="Avg. Order Value"
          accent="purple"
          icon={ArrowUpRight}
          value={currency(summary.averageOrderValue)}
          subHighlight="Per transaction"
        />
        <StatCard
          label="Net Revenue"
          accent="cyan"
          icon={Percent}
          value={currency(summary.netRevenue)}
          sub="After tax & discounts"
          subHighlight={`Net margin: ${summary.totalRevenue > 0 ? ((summary.netRevenue / summary.totalRevenue) * 100).toFixed(1) : 0}%`}
        />
      </div>

      {/* ── Row 2: Secondary metrics ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tax"
          accent="orange"
          icon={CreditCard}
          value={currency(summary.totalTax)}
          subHighlight="Collected"
        />
        <StatCard
          label="Total Discount"
          accent="red"
          icon={Tag}
          value={currency(summary.totalDiscount)}
          subHighlight="Given"
        />
        <StatCard
          label="Items / Order"
          accent="pink"
          icon={Package2}
          value={avgItemsPerOrder}
          subHighlight="Average items"
        />
        <StatCard
          label="Revenue Growth"
          accent="indigo"
          icon={TrendingUp}
          value={revenueGrowthPct !== null ? `${revenueGrowthPct > 0 ? "+" : ""}${revenueGrowthPct.toFixed(1)}%` : "—"}
          sub="vs previous period"
          growth={revenueGrowthPct !== null ? { value: `${Math.abs(revenueGrowthPct).toFixed(1)}%`, positive: revenueGrowthPct >= 0 } : undefined}
        />
      </div>

      {/* ── Row 3: COGS / Margin ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total COGS"
          accent="orange"
          icon={Package2}
          value={currency(totalCOGS)}
          subHighlight="Cost of Goods Sold"
        />
        <StatCard
          label="Avg Gross Margin"
          accent="green"
          icon={BarChart2}
          value={`${avgGrossMargin.toFixed(1)}%`}
          sub="Average across all products"
        />
        <StatCard
          label="Total Gross Profit"
          accent="purple"
          icon={ExternalLink}
          value={currency(totalGrossProfit)}
          sub="Revenue - COGS · Go to accounting →"
          linkToAccounting
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Sales Summary</TabsTrigger>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="items">By Item</TabsTrigger>
          <TabsTrigger value="wholesale" className="gap-1.5">
            <Package2 className="h-3.5 w-3.5 text-amber-600" />Single vs Wholesale
          </TabsTrigger>
          <TabsTrigger value="credit" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-blue-500" />Credit &amp; Payments
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
          <SalesByItemTable data={{ items: salesByItem, summary }} />
        </TabsContent>

        <TabsContent value="wholesale">
          <WholesaleVsSingleTab data={data} />
        </TabsContent>

        <TabsContent value="credit">
          <CreditPaymentTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}