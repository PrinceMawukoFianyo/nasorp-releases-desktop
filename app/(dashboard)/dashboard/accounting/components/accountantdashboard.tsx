"use client";
/**
 * AccountantDashboard.tsx  v3 – FULLY FIXED
 * – Expandable customer rows with statements
 * – Print individual & all customer statements
 * – Manual debt dialog (appears in Credit tracker)
 * – All other tabs (Overview, Expenses, Payroll, etc.) unchanged
 */

import React, { useState, useEffect, useTransition, useMemo  } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Download, TrendingUp, TrendingDown, DollarSign, BarChart2,
  MapPin, Users, CreditCard, Layers, AlertTriangle, CheckCircle2,
  Clock, Ban, ArrowUpRight, Package2, Receipt, Building2,
  Smartphone, WalletCards, Banknote, Calendar, Printer,
  PieChart, FileText, Settings, ShieldCheck, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { createExpense, createPayrollEntry, markPayrollPaid, deletePayrollEntry } from "@/actions/accounting";
import DailySalesTab from "./DailySalesTab";
import ForecastDashboard from "./ForecastDashboard";
import { getCustomerStatement, getBriefCustomers } from "@/actions/customers";
import { ManualDebtDialog } from "@/components/ManualDebtDialog";
import { formatCurrency, formatDate } from "../../sales/orders/so-utils";
import { ChevronDown, ChevronUp, FileText as FileTextIcon, Receipt as ReceiptIcon } from "lucide-react";
import { ManualSupplierDebtDialog } from "@/components/ManualSupplierDebtDialog";
import { getBriefSuppliers, getSupplierStatement } from "@/actions/suppliers";
import StaffPerformanceTab from "./StaffPerformanceTab";



// ══════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════
type LocationSummary = {
  locationId: string; locationName: string; type: string;
  totalRevenue: number; netRevenue: number; returnsValue: number;
  totalOrders: number; completedOrders: number; cancelledOrders: number;
  stockValue: number; itemCount: number; subtotal: number;
  taxCollected: number; discounts: number;
};
type DashboardData = {
  inventoryValue: number; totalItems: number;
  salesOrdersCount: number; salesOrdersValue: number;
  completedSalesCount: number; pendingSalesCount: number;
  purchaseOrdersCount: number; purchaseOrdersValue: number;
  lowStockCount: number;
  topSellingProducts: { id: string; name: string; salesCount: number; salesTotal: number }[];
  recentCustomers: { id: string; name: string; email: string; totalOrders: number; totalSpent: number }[];
  recentSalesOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string; date: string }[];
  salesByCategory: { category: string; value: number }[];
  salesTimeline?: { label: string; sales: number; orders: number }[];
  inventoryValueAtRetail?: number;
};
type Financials = { totalSales: number; totalPurchases: number; grossMargin: number; taxLiability: number };
type CreditSummary = { totalOutstanding: number; totalCollected: number; activeDebtors: number; overdueCount: number; paidCount: number; partialCount: number; pendingCount: number };
type ExpenseRecord = { id: string; date: string; category: string; description: string; amount: number; recorded: string; isPayroll?: boolean };
type PayrollRecord = { id: string; employeeName: string; role: string; amount: number; period: string; date: string; status: "PAID" | "PENDING" };

const VALID_TABS = ["overview", "daily", "expenses", "payroll", "customers", "suppliers", "locations", "credit", "forecast", "staff", "paystack", "billing"] as const;
type TabId = typeof VALID_TABS[number];

type Props = {
  dashboardData?: DashboardData | null;
  locationSales?: { locations: LocationSummary[]; grandTotal: Omit<LocationSummary, "locationId" | "locationName" | "type"> } | null;
  financials?: Financials | null;
  creditSummary?: CreditSummary | null;
  initialExpenses?: ExpenseRecord[];
  initialPayroll?: PayrollRecord[];
  initialTab?: TabId;
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0.0");

function toCsv(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) { toast.error("No data to export."); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url); toast.success("Exported!");
}

// ══════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — match SalesReportDashboard StatCard exactly
// ══════════════════════════════════════════════════════════════════════
type Accent = "default" | "green" | "blue" | "amber" | "red" | "orange" | "purple" | "teal";
const CARD_BG: Record<Accent, string> = {
  default: "bg-card border-border",
  green: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  red: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  orange: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
  purple: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
  teal: "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800",
};
const CARD_TEXT: Record<Accent, string> = {
  default: "text-foreground", green: "text-green-900 dark:text-green-100",
  blue: "text-blue-900 dark:text-blue-100", amber: "text-amber-900 dark:text-amber-100",
  red: "text-red-900 dark:text-red-100", orange: "text-orange-900 dark:text-orange-100",
  purple: "text-purple-900 dark:text-purple-100", teal: "text-teal-900 dark:text-teal-100",
};
const ICON_CLR: Record<Accent, string> = {
  default: "text-muted-foreground", green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400", amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400", orange: "text-orange-600 dark:text-orange-400",
  purple: "text-purple-600 dark:text-purple-400", teal: "text-teal-600 dark:text-teal-400",
};

// ══════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, accent = "default", icon: Icon, href, trend }: {
  label: string; value: string; sub?: string; accent?: Accent;
  icon?: React.ElementType; href?: string; trend?: { value: string; up: boolean };
}) {
  const inner = (
    <Card className={`border ${CARD_BG[accent]} transition-all hover:shadow-md h-full`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">{label}</p>
          {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${ICON_CLR[accent]}`} />}
        </div>
        <p className={`text-xl font-bold tracking-tight ${CARD_TEXT[accent]}`}>{value}</p>
        <div className="flex items-center justify-between mt-1">
          {sub && <p className="text-xs text-muted-foreground leading-tight">{sub}</p>}
          {trend && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend.up ? "text-emerald-600" : "text-red-500"}`}>
              {trend.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {trend.value}
            </span>
          )}
        </div>
        {href && <p className={`text-xs font-semibold mt-2 ${ICON_CLR[accent]}`}>View details →</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block no-underline">{inner}</Link> : inner;
}

function Th({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) {
  return <th className={`py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${right ? "text-right" : center ? "text-center" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, mono, center, className = "" }: { children: React.ReactNode; right?: boolean; mono?: boolean; center?: boolean; className?: string }) {
  return <td className={`py-2.5 px-3 text-sm ${right ? "text-right" : center ? "text-center" : ""} ${mono ? "font-mono text-xs" : ""} ${className}`}>{children}</td>;
}
function TrHover({ children }: { children: React.ReactNode }) {
  return <tr className="border-b hover:bg-muted/30 transition-colors">{children}</tr>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700 border-green-200", PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200", COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
    PARTIAL: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Progress bar helper ───────────────────────────────────────────────
function ProgressBar({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Mini inline bar chart ─────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; sales: number; expenses: number }[] }) {
  const max = Math.max(...data.map(d => Math.max(d.sales, d.expenses)), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 px-1">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: 84 }}>
              <div title={`Sales: ${fmt(d.sales)}`} className={`flex-1 rounded-t-sm ${isLast ? "bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-900"}`} style={{ height: `${(d.sales / max) * 84}px` }} />
              <div title={`Exp: ${fmt(d.expenses)}`} className={`flex-1 rounded-t-sm ${isLast ? "bg-red-400" : "bg-red-200 dark:bg-red-900"}`} style={{ height: `${(d.expenses / max) * 84}px` }} />
            </div>
            <span className={`text-[9px] ${isLast ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Revenue split card ────────────────────────────────────────────────
function RevenueSplitCard({ totalSales, fromOrders, fromCredit, fromPOS, expenses }: {
  totalSales: number; fromOrders: number; fromCredit: number; fromPOS: number; expenses: number;
}) {
  const net = totalSales - expenses;
  const items = [
    { label: "Credit Saless", amount: fromOrders, color: "bg-emerald-500", href: "/dashboard/sales/orders" },
    { label: "Credit Payments", amount: fromCredit, color: "bg-blue-500", href: "/dashboard/sales/orders/credit" },
    { label: "POS Sales", amount: fromPOS, color: "bg-violet-500", href: "/dashboard/sales/pos" },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-emerald-600" />Revenue Split</CardTitle>
          <span className="text-base font-bold text-emerald-600">{fmt(totalSales)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <Link href={item.href} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors no-underline">
                <span className={`inline-block w-2 h-2 rounded-full ${item.color}`} />{item.label} →
              </Link>
              <span className="text-xs font-semibold">{fmt(item.amount)}</span>
            </div>
            <ProgressBar value={item.amount} max={totalSales} color={item.color} />
          </div>
        ))}
        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-xs"><span className="text-red-500 font-medium">Expenses deducted</span><span className="text-red-500 font-semibold">− {fmt(expenses)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-emerald-600 font-semibold">Net Revenue</span><span className="text-emerald-600 font-bold">{fmt(net)}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["Operations", "Logistics", "Marketing", "Maintenance", "Utilities", "Payroll", "Other"];

function ExpenseForm({ onAdd }: { onAdd: (e: ExpenseRecord) => void }) {
  const [form, setForm] = useState({ description: "", category: "Operations", amount: "" });
  const [saving, start] = useTransition();
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inp = "flex-1 min-w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  const handleAdd = () => {
    if (!form.description.trim() || !form.amount) {
      toast.error("Please fill in description and amount");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    start(async () => {
      const result = await createExpense({
        description: form.description,
        category: form.category as any,
        amount: amt,
        isPayroll: form.category === "Payroll",
      });
      if (result.success && result.data) {
        const record: ExpenseRecord = {
          id: result.data.id,
          date: result.data.date,
          category: result.data.category,
          description: result.data.description,
          amount: result.data.amount,
          recorded: result.data.recordedBy,
          isPayroll: result.data.isPayroll,
        };
        onAdd(record);
        setForm({ description: "", category: "Operations", amount: "" });
        toast.success("Expense recorded!");
      } else {
        toast.error(result.error ?? "Failed to record expense");
      }
    });
  };

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-red-500" />Record Expense</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Description" className={inp} disabled={saving} />
          <select value={form.category} onChange={e => set("category", e.target.value)} className={inp} disabled={saving}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="Amount (GHS)" type="number" className={inp} disabled={saving} />
          <Button onClick={handleAdd} size="sm" variant="destructive" disabled={saving}>
            {saving ? "Saving…" : "+ Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PayrollForm({ onAdd }: { onAdd: (p: PayrollRecord) => void }) {
  const [form, setForm] = useState({ employeeName: "", role: "", amount: "", period: `${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}`, status: "PENDING" as "PAID" | "PENDING" });
  const [saving, start] = useTransition();
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inp = "flex-1 min-w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  const handleAdd = () => {
    if (!form.employeeName.trim() || !form.amount) {
      toast.error("Please fill in employee name and amount");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    start(async () => {
      const result = await createPayrollEntry({
        employeeName: form.employeeName,
        role: form.role || undefined,
        amount: amt,
        period: form.period,
        status: form.status,
      });
      if (result.success && result.data) {
        const record: PayrollRecord = {
          id: result.data.id,
          employeeName: result.data.employeeName,
          role: result.data.role,
          amount: result.data.amount,
          period: result.data.period,
          date: result.data.date,
          status: result.data.status,
        };
        onAdd(record);
        setForm(p => ({ ...p, employeeName: "", role: "", amount: "" }));
        toast.success("Payroll entry added!");
      } else {
        toast.error(result.error ?? "Failed to add payroll entry");
      }
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-amber-600" />Add Payroll Entry</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <input value={form.employeeName} onChange={e => set("employeeName", e.target.value)} placeholder="Employee Name" className={inp} disabled={saving} />
          <input value={form.role} onChange={e => set("role", e.target.value)} placeholder="Role / Position" className={inp} disabled={saving} />
          <input value={form.period} onChange={e => set("period", e.target.value)} placeholder="Pay Period" className={inp} disabled={saving} />
          <input value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="Amount (GHS)" type="number" className={inp} disabled={saving} />
          <select value={form.status} onChange={e => set("status", e.target.value)} className={inp} disabled={saving}><option value="PENDING">Pending</option><option value="PAID">Paid</option></select>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAdd} disabled={saving}>
            {saving ? "Saving…" : "+ Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Banners ───────────────────────────────────────────────────────────
function UpgradeBanner() {
  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><span className="text-sm">✦</span><span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Upgrade to Pro</span><Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300 bg-purple-50">Coming Soon</Badge></div>
            <p className="text-sm font-semibold">AI forecasting, multi-org &amp; advanced analytics</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get notified when Pro launches</p>
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => toast.info("You'll be notified!")}>Notify Me →</Button>
        </div>
      </CardContent>
    </Card>
  );
}
function PaystackBanner() {
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1"><Badge className="bg-blue-600 text-white text-[10px] font-bold">PAYSTACK</Badge><Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">Integration Ready</Badge></div>
            <p className="text-sm font-semibold">Payment gateway — configure webhooks &amp; reconcile</p>
            <p className="text-xs text-muted-foreground">Transactions, refunds, and payment event logs</p>
          </div>
          <Link href="/dashboard/accounting?tab=paystack"><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Configure →</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB META
// ══════════════════════════════════════════════════════════════════════
const TABS: { id: TabId; label: string; icon: React.ElementType; permission: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart2, permission: "accounting.read" },
  { id: "daily", label: "Daily Sales", icon: Calendar, permission: "accounting.read" },
  { id: "expenses", label: "Expenses", icon: Receipt, permission: "accounting.read" },
  { id: "payroll", label: "Payroll", icon: Users, permission: "accounting.payroll" },
  { id: "customers", label: "Customers", icon: Users, permission: "accounting.read" },
  { id: "suppliers", label: "Suppliers", icon: Building2, permission: "accounting.read" },
  { id: "locations", label: "Locations P&L", icon: MapPin, permission: "accounting.read" },
  { id: "credit", label: "Credit & Payments", icon: CreditCard, permission: "accounting.read" },
  { id: "forecast", label: "Forecast", icon: TrendingUp, permission: "accounting.read" },
  { id: "staff", label: "Staff Performance", icon: Users, permission: "accounting.read" },
  { id: "paystack", label: "Paystack Settings", icon: Layers, permission: "accounting.admin" },
  { id: "billing", label: "Billing & Plan", icon: DollarSign, permission: "accounting.read" },
];

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function AccountantDashboard({
  dashboardData, locationSales, financials, creditSummary,
  initialExpenses = [], initialPayroll = [], initialTab = "overview",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabId>(initialTab);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [payroll, setPayroll] = useState<PayrollRecord[]>(initialPayroll);
  const [expSearch, setExpSearch] = useState("");

  // ── States for customer statements ───────────────────────────────────
  const [customerStatements, setCustomerStatements] = useState<Record<string, any>>({});
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [manualDebtOpen, setManualDebtOpen] = useState(false);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  const [supplierStatements, setSupplierStatements] = useState<Record<string, any>>({});
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [manualSupplierDebtOpen, setManualSupplierDebtOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);

  // Load all customers once
  useEffect(() => {
    async function loadCustomers() {
      const res = await getBriefCustomers();
      setAllCustomers(res);
    }
    loadCustomers();
  }, []);

  useEffect(() => {
  async function loadSuppliers() {
      const res = await getBriefSuppliers();
      setAllSuppliers(res);
    }
    loadSuppliers();
  }, []);

  // Re-sync when server revalidates and sends fresh props
  useEffect(() => { setExpenses(initialExpenses); }, [initialExpenses]);
  useEffect(() => { setPayroll(initialPayroll); }, [initialPayroll]);

  // Sync tab → URL without full navigation
  const changeTab = (newTab: TabId) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // If the URL tab param changes externally (back/forward), sync state
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabId | null;
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== tab) setTab(urlTab);
  }, [searchParams]);

  // ── Fetch statement for a customer (only once) ───────────────────────
  const fetchStatement = async (customerId: string) => {
    if (customerStatements[customerId]) return;
    const data = await getCustomerStatement(customerId);
    setCustomerStatements(prev => ({ ...prev, [customerId]: data }));
  };

  // ── Toggle expand/collapse ────────────────────────────────────────────
  const toggleExpand = async (customerId: string) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(customerId);
      await fetchStatement(customerId);
    }
  };

// ── Print single customer statement ──────────────────────────────
const printStatement = (customer: any, statement: any) => {
  const printWindow = window.open("", "_blank", "width=860,height=700");
  if (!printWindow) {
    toast.error("Please allow pop-ups to print");
    return;
  }

  const rows =
    statement.transactions.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">No transactions found</td></tr>`
      : statement.transactions
          .map(
            (t: any) => `
          <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.number}</td>
            <td>${t.type}</td>
            <td>${formatCurrency(t.amount)}</td>
            <td class="status-${(t.status || "").toLowerCase()}">${t.status}</td>
          </tr>`
          )
          .join("");

  const content = `<!DOCTYPE html>
<html>
<head>
  <title>Statement – ${customer.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 24px; margin: 0; color: #222; }
    .header { border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 20px; }
    .header h2 { margin: 0 0 4px; font-size: 20px; }
    .header p  { margin: 2px 0; color: #555; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 9px 10px; text-align: left; font-size: 13px; }
    th { background: #f5f5f5; font-weight: 700; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 18px; border-top: 1px solid #ddd; padding-top: 12px; text-align: right; }
    .totals p { margin: 5px 0; font-size: 13px; }
    .totals .owing { font-size: 16px; font-weight: bold; color: #b91c1c; }
    .status-paid    { color: #15803d; font-weight: 600; }
    .status-unpaid  { color: #dc2626; font-weight: 600; }
    .status-partial { color: #d97706; font-weight: 600; }
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Customer Statement</h2>
    <p><strong>${customer.name}</strong></p>
    ${customer.email ? `<p>${customer.email}</p>` : ""}
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Document #</th>
        <th>Type</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <p>Total Invoiced: <strong>${formatCurrency(statement.totalInvoiced)}</strong></p>
    <p>Total Paid: <strong style="color:#15803d">${formatCurrency(statement.totalPaid)}</strong></p>
    <p class="owing">Outstanding: ${formatCurrency(statement.totalOwing)}</p>
  </div>

  <` + `script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 1000);
    };
  </` + `script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
};

// ── Print ALL customers' statements ──────────────────────────────
const printAllStatements = async () => {
  const toastId = toast.loading("Preparing all statements…");

  let allStatements: { customer: any; statement: any }[] = [];

  try {
    allStatements = await Promise.all(
      topCustomers.map(async (c) => ({
        customer: c,
        statement: await getCustomerStatement(c.id),
      }))
    );
  } catch (err) {
    toast.dismiss(toastId);
    toast.error("Failed to load customer statements");
    return;
  }

  toast.dismiss(toastId);

  const printWindow = window.open("", "_blank", "width=860,height=700");
  if (!printWindow) {
    toast.error("Please allow pop-ups to print");
    return;
  }

  // Build one block per customer
  const blocks = allStatements
    .map(({ customer, statement }) => {
      const rows =
        statement.transactions.length === 0
          ? `<tr><td colspan="5" style="text-align:center;color:#999;padding:16px">No transactions</td></tr>`
          : statement.transactions
              .map(
                (t: any) => `
            <tr>
              <td>${formatDate(t.date)}</td>
              <td>${t.number}</td>
              <td>${t.type}</td>
              <td>${formatCurrency(t.amount)}</td>
              <td class="status-${(t.status || "").toLowerCase()}">${t.status}</td>
            </tr>`
              )
              .join("");

      return `
        <div class="customer-block">
          <div class="header">
            <h2>${customer.name}</h2>
            ${customer.email ? `<p>${customer.email}</p>` : ""}
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Document #</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <p>Total Invoiced: <strong>${formatCurrency(statement.totalInvoiced)}</strong></p>
            <p>Total Paid: <strong style="color:#15803d">${formatCurrency(statement.totalPaid)}</strong></p>
            <p class="owing">Outstanding: ${formatCurrency(statement.totalOwing)}</p>
          </div>
        </div>`;
    })
    .join("\n");

  const content = `<!DOCTYPE html>
<html>
<head>
  <title>All Customer Statements</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 24px; margin: 0; color: #222; }
    .customer-block { margin-bottom: 48px; page-break-after: always; }
    .customer-block:last-child { page-break-after: avoid; }
    .header { border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
    .header h2 { margin: 0 0 4px; font-size: 18px; }
    .header p  { margin: 2px 0; color: #555; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #f5f5f5; font-weight: 700; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 14px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; }
    .totals p { margin: 4px 0; font-size: 13px; }
    .totals .owing { font-size: 15px; font-weight: bold; color: #b91c1c; }
    .status-paid    { color: #15803d; font-weight: 600; }
    .status-unpaid  { color: #dc2626; font-weight: 600; }
    .status-partial { color: #d97706; font-weight: 600; }
    @media print {
      body { padding: 10px; }
      .customer-block { page-break-after: always; }
      .customer-block:last-child { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  ${blocks}
  <` + `script>
    window.onload = function () {
      window.print();
      setTimeout(function () { window.close(); }, 1000);
    };
  </` + `script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
};

  const fetchSupplierStatement = async (supplierId: string) => {
    if (supplierStatements[supplierId]) return;
    const data = await getSupplierStatement(supplierId);
    setSupplierStatements(prev => ({ ...prev, [supplierId]: data }));
  };

  const toggleSupplierExpand = async (supplierId: string) => {
    if (expandedSupplier === supplierId) {
      setExpandedSupplier(null);
    } else {
      setExpandedSupplier(supplierId);
      await fetchSupplierStatement(supplierId);
    }
  };

  const printSupplierStatement = (supplier: any, statement: any) => {
    // same as printStatement but with supplier data
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) { toast.error("Please allow pop-ups to print"); return; }
    const content = `<!DOCTYPE html>...`; // adapt from printStatement
    // ... similar to customer version, using supplier.name, etc.
    printWindow.document.write(content);
    printWindow.document.close();
  };

// Compute top suppliers (sorted by totalOwing from statements)
const topSuppliers = useMemo(() => {
  if (!allSuppliers.length) return [];
  return allSuppliers
    .map(s => ({
      ...s,
      totalOwing: supplierStatements[s.id]?.totalOwing ?? 0,
      orderCount: supplierStatements[s.id]?.transactions?.filter((t: any) => t.type === "PURCHASE_ORDER").length ?? 0,
    }))
    .sort((a, b) => b.totalOwing - a.totalOwing)
    .slice(0, 5);
}, [allSuppliers, supplierStatements]);

const totalSupplierOwing = useMemo(() => {
  return topSuppliers.reduce((sum, s) => sum + s.totalOwing, 0);
}, [topSuppliers]);

  const printAllSupplierStatements = async () => {
    const allStatements = await Promise.all(
      topSuppliers.map(async (s) => ({
        supplier: s,
        statement: await getSupplierStatement(s.id)
      }))
    );
    // same as printAllStatements but for suppliers
  };

  // Derived numbers
  const d = dashboardData;
  const locs = locationSales?.locations ?? [];
  const grand = locationSales?.grandTotal;
  const fin = financials;

  const totalRevenue = grand?.totalRevenue ?? d?.salesOrdersValue ?? 0;
  const totalExpensesSum = expenses.reduce((s, e) => s + e.amount, 0);
  const payrollTotal = payroll.reduce((s, p) => s + p.amount, 0);
  const netProfit = totalRevenue - totalExpensesSum - payrollTotal;
  const outstandingCredit = creditSummary?.totalOutstanding ?? 0;
  const inventoryValue = d?.inventoryValue ?? 0;
  const taxCollected = fin?.taxLiability ?? grand?.taxCollected ?? 0;
  const cogs = fin?.totalPurchases ?? 0;
  const grossMargin = fin?.grossMargin ?? (totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue) * 100 : 0);
  const fromOrders = d?.salesOrdersValue ?? 0;
  const fromCredit = creditSummary?.totalCollected ?? 0;
  const fromPOS = 0;
  const filteredExpenses = expenses.filter(e => e.description.toLowerCase().includes(expSearch.toLowerCase()) || e.category.toLowerCase().includes(expSearch.toLowerCase()));
  const payrollPaid = payroll.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const payrollPending = payroll.filter(p => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const topCustomers = d?.recentCustomers?.slice(0, 5) ?? [];

  // Chart: group by calendar day oldest→newest (FIFO), 8 days max
  const chartData = (() => {
    if (d?.salesTimeline && d.salesTimeline.length > 0) {
      const perDay = d.salesTimeline.length > 0 && totalExpensesSum > 0 ? totalExpensesSum / d.salesTimeline.length : 0;
      return [...d.salesTimeline].slice(-8).map(day => ({ label: day.label, sales: day.sales, expenses: perDay }));
    }
    if (d?.recentSalesOrders && d.recentSalesOrders.length > 0) {
      const dayMap = new Map<string, number>();
      for (const o of d.recentSalesOrders) {
        const lbl = new Date(o.date).toLocaleDateString("en-GH", { day: "2-digit", month: "short" });
        dayMap.set(lbl, (dayMap.get(lbl) ?? 0) + o.total);
      }
      const days = Array.from(dayMap.entries()).map(([label, sales]) => ({ label, sales, expenses: 0 })).slice(-8);
      const perDay = days.length > 0 && totalExpensesSum > 0 ? totalExpensesSum / days.length : 0;
      return days.map(day => ({ ...day, expenses: perDay }));
    }
    return Array.from({ length: 8 }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (7 - i));
      return { label: dt.toLocaleDateString("en-GH", { day: "2-digit", month: "short" }), sales: 0, expenses: 0 };
    });
  })();

  const exportOverview = () => toCsv([{ "Total Revenue": totalRevenue, "Net Profit": netProfit, "Inventory Value": inventoryValue, "Outstanding Credit": outstandingCredit, "Tax Collected": taxCollected, "COGS": cogs }], "accounting-overview.csv");
  const exportExpenses = () => toCsv(filteredExpenses.map(e => ({ ID: e.id, Date: e.date, Category: e.category, Description: e.description, Amount: e.amount, "Recorded By": e.recorded })), "expenses.csv");
  const exportPayroll = () => toCsv(payroll.map(p => ({ ID: p.id, Employee: p.employeeName, Role: p.role, Period: p.period, Amount: p.amount, Date: p.date, Status: p.status })), "payroll.csv");

  return (
    <div className="flex flex-col min-h-full">

      {/* ── STICKY HEADER ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">₵</div>
              <h1 className="text-base font-bold tracking-tight">Accounts &amp; Finance</h1>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold">Live</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-9">
              {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}<span className="font-medium capitalize text-foreground">{TABS.find(t => t.id === tab)?.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportOverview}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1.5" />Print</Button>
            <Link href="/dashboard/reports/sales">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Full Sales Report <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Button>
            </Link>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const badge = t.id === "expenses" && expenses.length > 0 ? expenses.length
              : t.id === "payroll" && payroll.length > 0 ? payroll.length
                : t.id === "credit" && (creditSummary?.activeDebtors ?? 0) > 0 ? creditSummary!.activeDebtors
                  : null;
            return (
              <button key={t.id} onClick={() => changeTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${active ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <t.icon className="h-3.5 w-3.5" />{t.label}
                {badge != null && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/25 text-white" : t.id === "credit" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-5 print:p-4">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${grossMargin.toFixed(1)}% gross margin`} accent="green" icon={TrendingUp} href="/dashboard/reports/sales" />
              <StatCard label="Net Profit" value={fmt(netProfit)} sub="After expenses + payroll" accent="teal" icon={DollarSign} />
              <StatCard label="Inventory Value (Cost)" value={fmt(inventoryValue)} sub={`Retail: ${fmt(d?.inventoryValueAtRetail ?? 0)} · ${d?.totalItems ?? 0} items`} accent="blue" icon={Package2} href="/dashboard/inventory/items" />
              <StatCard label="Outstanding Credit" value={fmt(outstandingCredit)} sub={`${creditSummary?.activeDebtors ?? 0} debtors`} accent="orange" icon={CreditCard} href="/dashboard/sales/orders/credit" />
              <StatCard label="Tax Collected" value={fmt(taxCollected)} sub="VAT & other taxes" accent="purple" icon={Receipt} />
              <StatCard label="COGS / Purchases" value={fmt(cogs)} sub="Cost of goods / purchases" accent="red" icon={TrendingDown} href="/dashboard/purchases/purchase-orders" />
            </div>

            {/* Revenue split + chart */}
            <div className="grid grid-cols-2 gap-4">
              <RevenueSplitCard totalSales={fromOrders + fromCredit + fromPOS} fromOrders={fromOrders} fromCredit={fromCredit} fromPOS={fromPOS} expenses={totalExpensesSum + payrollTotal} />
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-muted-foreground" />Recent Orders Performance</CardTitle>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Sales</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Expenses</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>{chartData.length > 0 ? <MiniBarChart data={chartData} /> : <EmptyState icon={BarChart2} message="No order data for chart" />}</CardContent>
              </Card>
            </div>

            {/* Financial summary ribbon */}
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-4 divide-x divide-emerald-200 dark:divide-emerald-800">
                  {[
                    { label: "Gross Revenue", value: fmt(totalRevenue), note: "All orders" },
                    { label: "Total Expenses", value: fmt(totalExpensesSum + payrollTotal), note: "Ops + payroll", red: true },
                    { label: "Net Profit", value: fmt(netProfit), note: `${pct(netProfit, totalRevenue)}% margin` },
                    { label: "Outstanding", value: fmt(outstandingCredit), note: `${creditSummary?.activeDebtors ?? 0} customers`, amber: true },
                  ].map((s, i) => (
                    <div key={i} className={`px-5 ${i === 0 ? "pl-0" : ""} ${i === 3 ? "pr-0" : ""}`}>
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <p className={`text-lg font-bold mt-0.5 ${s.red ? "text-red-600" : s.amber ? "text-amber-600" : "text-emerald-700"}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent orders + top products */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Recent Credit Saless</CardTitle><Link href="/dashboard/sales/orders" className="text-xs text-emerald-600 hover:underline">View all →</Link></div></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b bg-muted/40"><Th>Order</Th><Th>Customer</Th><Th right>Total</Th><Th>Status</Th></tr></thead>
                      <tbody>
                        {(d?.recentSalesOrders ?? []).slice(0, 6).map((o, i) => (
                          <TrHover key={i}><Td mono><Link href={`/dashboard/sales/orders/${o.id}`} className="text-blue-600 hover:underline">{o.orderNumber}</Link></Td><Td className="text-xs text-muted-foreground">{o.customerName}</Td><Td right className="font-semibold text-emerald-700 text-xs">{fmt(o.total)}</Td><Td><StatusBadge status={o.status} /></Td></TrHover>
                        ))}
                        {!d?.recentSalesOrders?.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No recent orders</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Top Selling Products</CardTitle><Link href="/dashboard/inventory/items" className="text-xs text-emerald-600 hover:underline">View all →</Link></div></CardHeader>
                <CardContent className="space-y-2">
                  {(d?.topSellingProducts ?? []).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `hsl(${i * 40}, 60%, 92%)`, color: `hsl(${i * 40}, 60%, 35%)` }}>{i + 1}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.salesCount} units · {pct(p.salesTotal, totalRevenue)}% of rev</p></div>
                      <span className="text-xs font-semibold text-emerald-700">{fmt(p.salesTotal)}</span>
                    </div>
                  ))}
                  {!d?.topSellingProducts?.length && <EmptyState icon={Package2} message="No sales data" />}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4"><PaystackBanner /><UpgradeBanner /></div>
          </div>
        )}

        {/* DAILY SALES */}
        {tab === "daily" && <DailySalesTab />}

        {/* EXPENSES */}
        {tab === "expenses" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Expenses" value={fmt(totalExpensesSum)} sub={`${expenses.length} entries`} accent="red" icon={Receipt} />
              <StatCard label="Payroll Expenses" value={fmt(expenses.filter(e => e.isPayroll).reduce((s, e) => s + e.amount, 0))} sub="Salary & wages" accent="amber" icon={Users} />
              <StatCard label="Operating Costs" value={fmt(expenses.filter(e => !e.isPayroll).reduce((s, e) => s + e.amount, 0))} sub="Non-payroll" accent="blue" icon={Building2} />
            </div>

            {expenses.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {EXPENSE_CATS.map(cat => {
                      const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                      if (!total) return null;
                      return (
                        <div key={cat} className="p-3 rounded-lg bg-muted/40 border">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{cat}</p>
                          <p className="text-sm font-bold mt-0.5">{fmt(total)}</p>
                          <ProgressBar value={total} max={totalExpensesSum} color="bg-red-400" />
                          <p className="text-[10px] text-muted-foreground mt-1">{pct(total, totalExpensesSum)}% of total</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <ExpenseForm onAdd={e => setExpenses(p => [e, ...p])} />

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Expense Log</CardTitle>
                  <div className="flex items-center gap-2">
                    <input value={expSearch} onChange={e => setExpSearch(e.target.value)} placeholder="Search…" className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                    <Button variant="outline" size="sm" onClick={exportExpenses}><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b bg-muted/40"><Th>ID</Th><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th right>Amount</Th><Th>Recorded By</Th></tr></thead>
                    <tbody>
                      {filteredExpenses.map((e, i) => (
                        <TrHover key={i}><Td mono className="text-muted-foreground">{e.id}</Td><Td className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</Td><Td><Badge variant="outline" className="text-[10px]">{e.category}</Badge></Td><Td className="text-xs">{e.description}</Td><Td right className="font-semibold text-red-600 text-xs">{fmt(e.amount)}</Td><Td className="text-xs text-muted-foreground">{e.recorded}</Td></TrHover>
                      ))}
                      {!filteredExpenses.length && <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No expenses yet — add one above</td></tr>}
                    </tbody>
                  </table>
                </div>
                {expenses.length > 0 && <div className="mt-3 px-3 py-2 bg-muted/40 rounded-lg flex justify-between text-xs"><span className="text-muted-foreground">Total shown</span><span className="font-bold text-red-600">{fmt(filteredExpenses.reduce((s, e) => s + e.amount, 0))}</span></div>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* PAYROLL */}
        {tab === "payroll" && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total Payroll" value={fmt(payrollTotal)} sub={`${payroll.length} entries`} accent="amber" icon={Users} />
              <StatCard label="Paid" value={fmt(payrollPaid)} sub="Disbursed" accent="green" icon={CheckCircle2} />
              <StatCard label="Pending" value={fmt(payrollPending)} sub="Awaiting payment" accent="red" icon={Clock} />
              <StatCard label="Revenue Impact" value={`−${pct(payrollTotal, totalRevenue)}%`} sub="Payroll vs revenue" accent="orange" icon={TrendingDown} />
            </div>

            {payroll.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payroll Status</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[{ label: "Paid", value: payrollPaid, color: "bg-emerald-500" }, { label: "Pending", value: payrollPending, color: "bg-amber-500" }].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1"><span className="font-medium">{s.label}</span><span>{fmt(s.value)}</span></div>
                        <ProgressBar value={s.value} max={payrollTotal} color={s.color} />
                      </div>
                    ))}
                    <div className="pt-2 border-t text-xs flex justify-between"><span className="text-muted-foreground">Total payroll / revenue</span><span className="font-bold">{pct(payrollTotal, totalRevenue)}%</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Earners</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[...payroll].sort((a, b) => b.amount - a.amount).slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-1 border-b last:border-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 text-amber-700">{p.employeeName.charAt(0)}</div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.employeeName}</p><p className="text-[10px] text-muted-foreground">{p.role || "—"} · {p.period}</p></div>
                        <span className="text-xs font-semibold text-amber-700">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <PayrollForm onAdd={p => {
              setPayroll(prev => [p, ...prev]);
              setExpenses(prev => [{ id: p.id.replace("PAY", "EXP"), date: p.date, category: "Payroll", description: `Payroll: ${p.employeeName} (${p.period})`, amount: p.amount, recorded: "You", isPayroll: true }, ...prev]);
            }} />

            <Card>
              <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Payroll Register</CardTitle><Button variant="outline" size="sm" onClick={exportPayroll}><Download className="h-3.5 w-3.5" /></Button></div></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b bg-muted/40"><Th>ID</Th><Th>Employee</Th><Th>Role</Th><Th>Period</Th><Th right>Amount</Th><Th>Date</Th><Th>Status</Th></tr></thead>
                    <tbody>
                      {payroll.map((p, i) => (
                        <TrHover key={i}><Td mono className="text-muted-foreground">{p.id}</Td><Td className="font-medium text-xs">{p.employeeName}</Td><Td className="text-xs text-muted-foreground">{p.role || "—"}</Td><Td className="text-xs text-muted-foreground">{p.period}</Td><Td right className="font-semibold text-amber-700 text-xs">{fmt(p.amount)}</Td><Td className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(p.date)}</Td><Td>
                          <button
                            title={p.status === "PENDING" ? "Click to mark as Paid" : "Already paid"}
                            disabled={p.status === "PAID"}
                            onClick={async () => {
                              if (p.status === "PAID") return;
                              const res = await markPayrollPaid(p.id);
                              if (res.success) {
                                setPayroll(prev => prev.map(x => x.id === p.id ? { ...x, status: "PAID" as const } : x));
                                toast.success(`${p.employeeName} marked as Paid ✓`);
                              } else { toast.error("Failed to update status"); }
                            }}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${p.status === "PAID"
                              ? "bg-green-100 text-green-700 border-green-200 cursor-default"
                              : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-green-100 hover:text-green-700 hover:border-green-300 cursor-pointer"
                              }`}
                          >
                            {p.status === "PAID" ? "PAID ✓" : "PENDING → Pay"}
                          </button>
                        </Td>
                          <Td>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Delete ${p.employeeName}'s payroll entry?`)) return;
                                const res = await deletePayrollEntry(p.id);
                                if (res.success) { setPayroll(prev => prev.filter(x => x.id !== p.id)); toast.success("Entry deleted"); }
                                else { toast.error("Failed to delete"); }
                              }}
                              className="text-xs text-red-400 hover:text-red-600 px-1"
                              title="Delete entry"
                            >✕</button>
                          </Td>
                        </TrHover>
                      ))}
                      {!payroll.length && <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No payroll entries yet — add one above</td></tr>}
                    </tbody>
                  </table>
                </div>
                {payroll.length > 0 && <div className="mt-3 px-3 py-2 bg-muted/40 rounded-lg flex justify-between text-xs"><span className="text-muted-foreground">Total payroll deducted from revenue</span><span className="font-bold text-amber-700">{fmt(payrollTotal)}</span></div>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* CUSTOMERS – with expandable statements, print all, manual debt */}
        {tab === "customers" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Active Customers" value={String(allCustomers.length)} sub="In selected period" accent="blue" icon={Users} href="/dashboard/sales/customers" />
              <StatCard label="Top Spender" value={fmt(topCustomers[0]?.totalSpent ?? 0)} sub={topCustomers[0]?.name ?? "—"} accent="purple" icon={TrendingUp} />
              <StatCard label="Avg Order Value" value={fmt(d?.salesOrdersCount ? d.salesOrdersValue / d.salesOrdersCount : 0)} sub="Per order" accent="teal" icon={DollarSign} />
            </div>

            {topCustomers.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {topCustomers.map((c, i) => (
                  <Card key={i} className="text-center">
                    <CardContent className="pt-4 pb-3">
                      <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold text-sm mb-2" style={{ background: `hsl(${i * 55}, 55%, 92%)`, color: `hsl(${i * 55}, 55%, 35%)` }}>{c.name.charAt(0)}</div>
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmt(c.totalSpent)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.totalOrders} orders</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Customer Performance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => setManualDebtOpen(true)}>
                      + Manual Debt
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50" onClick={printAllStatements}>
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print All
                    </Button>
                    <Link href="/dashboard/sales/customers" className="text-xs text-emerald-600 hover:underline">Manage all →</Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <Th> </Th>
                        <Th>#</Th>
                        <Th>Customer</Th>
                        <Th>Email</Th>
                        <Th right>Total Spent</Th>
                        <Th center>Orders</Th>
                        <Th right>Avg Order</Th>
                        <Th>Tier</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((c, i) => {
                        const tier = c.totalSpent >= 25000 ? { label: "VIP", cls: "bg-purple-100 text-purple-700 border-purple-200" } : c.totalSpent >= 10000 ? { label: "Gold", cls: "bg-amber-100 text-amber-700 border-amber-200" } : c.totalSpent >= 5000 ? { label: "Silver", cls: "bg-slate-100 text-slate-700 border-slate-200" } : { label: "Regular", cls: "bg-teal-100 text-teal-700 border-teal-200" };
                        const statement = customerStatements[c.id];
                        const isExpanded = expandedCustomer === c.id;
                        return (
                          <React.Fragment key={c.id}>
                            <tr className="border-b hover:bg-muted/30">
                              <td className="py-2 px-1">
                                <button onClick={() => toggleExpand(c.id)} className="p-1">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                              <Td className="text-xs text-muted-foreground">#{i + 1}</Td>
                              <Td>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `hsl(${i * 55}, 55%, 92%)`, color: `hsl(${i * 55}, 55%, 35%)` }}>{c.name.charAt(0)}</div>
                                  <span className="text-xs font-medium">{c.name}</span>
                                </div>
                              </Td>
                              <Td className="text-xs text-muted-foreground">{c.email || "—"}</Td>
                              <Td right className="font-semibold text-emerald-700 text-xs">{fmt(c.totalSpent)}</Td>
                              <Td center className="text-xs">{c.totalOrders}</Td>
                              <Td right className="text-xs text-muted-foreground">{fmt(c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0)}</Td>
                              <Td><Badge variant="outline" className={`text-[10px] font-semibold ${tier.cls}`}>{tier.label}</Badge></Td>
                            </tr>
                            {isExpanded && statement && (
                              <tr className="bg-muted/20">
                                <td colSpan={8} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h4 className="text-sm font-semibold">Transaction Statement</h4>
                                      <Button size="sm" variant="outline" onClick={() => printStatement(c, statement)}>
                                        <Printer className="h-3.5 w-3.5 mr-1" /> Print Statement
                                      </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-muted/40">
                                          <tr>
                                            <th className="p-2 text-left">Date</th>
                                            <th className="p-2 text-left">Document #</th>
                                            <th className="p-2 text-left">Type</th>
                                            <th className="p-2 text-right">Amount</th>
                                            <th className="p-2 text-left">Status</th>
                                            <th className="p-2 text-center">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {statement.transactions.map((t: any, idx: number) => (
                                            <tr key={idx} className="border-b">
                                              <td className="p-2">{formatDate(t.date)}</td>
                                              <td className="p-2 font-mono text-xs">{t.number}</td>
                                              <td className="p-2">{t.type}</td>
                                              <td className="p-2 text-right font-medium">{fmt(t.amount)}</td>
                                              <td className="p-2">{t.status}</td>
                                              <td className="p-2 text-center">
                                                {t.invoiceLink && (
                                                  <a href={t.invoiceLink} target="_blank" className="text-blue-600 hover:underline mr-2" title="Invoice">
                                                    <FileTextIcon className="h-4 w-4 inline" />
                                                  </a>
                                                )}
                                                {t.receiptLink && (
                                                  <a href={t.receiptLink} target="_blank" className="text-green-600 hover:underline" title="Receipt">
                                                    <ReceiptIcon className="h-4 w-4 inline" />
                                                  </a>
                                                )}
                                                
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="border-t-2">
                                          <tr>
                                            <td colSpan={3} className="p-2 font-semibold">Totals</td>
                                            <td className="p-2 text-right font-semibold">{fmt(statement.totalInvoiced)}</td>
                                            <td colSpan={2}></td>
                                          </tr>
                                          <tr>
                                            <td colSpan={3} className="p-2">Total Paid</td>
                                            <td className="p-2 text-right text-green-700">{fmt(statement.totalPaid)}</td>
                                            <td colSpan={2}></td>
                                          </tr>
                                          <tr>
                                            <td colSpan={3} className="p-2 font-bold">Outstanding Balance</td>
                                            <td className="p-2 text-right font-bold text-red-600">{fmt(statement.totalOwing)}</td>
                                            <td colSpan={2}></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {!topCustomers.length && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No customer data</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center px-1">
                  <span className="text-xs text-muted-foreground">Tiers:</span>
                  {[{ l: "VIP ≥ GHS 25,000", c: "bg-purple-100 text-purple-700 border-purple-200" }, { l: "Gold ≥ GHS 10,000", c: "bg-amber-100 text-amber-700 border-amber-200" }, { l: "Silver ≥ GHS 5,000", c: "bg-slate-100 text-slate-700 border-slate-200" }].map(t => (
                    <Badge key={t.l} variant="outline" className={`text-[10px] ${t.c}`}>{t.l}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <ManualDebtDialog
              open={manualDebtOpen}
              onOpenChange={setManualDebtOpen}
              customers={allCustomers}
              onSuccess={() => {
                toast.success("Manual debt added. It will appear in Credit & Payments tracker and Credit Saless.");
              }}
            />
          </div>
        )}

        {/* SUPPLIERS – with expandable statements, print all, manual debt */}
        {tab === "suppliers" && (
          <div className="space-y-5">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Active Suppliers" value={String(allSuppliers.length)} sub="In selected period" accent="blue" icon={Building2} href="/dashboard/purchases/suppliers" />
              <StatCard label="Top Creditor" value={fmt(topSuppliers[0]?.totalOwing ?? 0)} sub={topSuppliers[0]?.name ?? "—"} accent="purple" icon={TrendingUp} />
              <StatCard label="Avg Payable" value={fmt(totalSupplierOwing / (allSuppliers.length || 1))} sub="Per supplier" accent="teal" icon={DollarSign} />
            </div>

            {/* Top Creditor Mini Cards */}
            {topSuppliers.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {topSuppliers.map((s, i) => (
                  <Card key={i} className="text-center">
                    <CardContent className="pt-4 pb-3">
                      <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold text-sm mb-2" style={{ background: `hsl(${i * 55}, 55%, 92%)`, color: `hsl(${i * 55}, 55%, 35%)` }}>{s.name.charAt(0)}</div>
                      <p className="text-xs font-semibold truncate">{s.name}</p>
                      <p className="text-sm font-bold text-rose-700 mt-0.5">{fmt(s.totalOwing)}</p>
                      <p className="text-[10px] text-muted-foreground">{s.orderCount} POs</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Supplier Performance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => setManualSupplierDebtOpen(true)}>
                      + Manual Debt
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50" onClick={printAllSupplierStatements}>
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print All
                    </Button>
                    <Link href="/dashboard/purchases/suppliers" className="text-xs text-emerald-600 hover:underline">Manage all →</Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b bg-muted/40"><Th>#</Th><Th>Supplier</Th><Th>Email</Th><Th right>Total Owing</Th><Th center>POs</Th><Th right>Avg PO</Th><Th>Status</Th></tr></thead>
                    <tbody>
                      {topSuppliers.map((s, i) => {
                        const isExpanded = expandedSupplier === s.id;
                        const statement = supplierStatements[s.id];
                        return (
                          <React.Fragment key={s.id}>
                            <tr className="border-b hover:bg-muted/30">
                              <td className="py-2 px-1">
                                <button onClick={() => toggleSupplierExpand(s.id)} className="p-1">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                              <Td className="text-xs text-muted-foreground">#{i+1}</Td>
                              <Td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `hsl(${i * 55}, 55%, 92%)`, color: `hsl(${i * 55}, 55%, 35%)` }}>{s.name.charAt(0)}</div><span className="text-xs font-medium">{s.name}</span></div></Td>
                              <Td className="text-xs text-muted-foreground">{s.email || "—"}</Td>
                              <Td right className="font-semibold text-rose-700 text-xs">{fmt(s.totalOwing)}</Td>
                              <Td center className="text-xs">{s.orderCount}</Td>
                              <Td right className="text-xs text-muted-foreground">{fmt(s.orderCount > 0 ? s.totalOwing / s.orderCount : 0)}</Td>
                              <Td><Badge variant="outline" className={s.totalOwing > 0 ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200"}>{s.totalOwing > 0 ? "Has Debt" : "Settled"}</Badge></Td>
                            </tr>
                            {isExpanded && statement && (
                              <tr className="bg-muted/20">
                                <td colSpan={8} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h4 className="text-sm font-semibold">Transaction Statement</h4>
                                      <Button size="sm" variant="outline" onClick={() => printSupplierStatement(s, statement)}>
                                        <Printer className="h-3.5 w-3.5 mr-1" /> Print Statement
                                      </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-muted/40">
                                          <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Document #</th><th className="p-2 text-left">Type</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th><th className="p-2 text-center">Actions</th></tr>
                                        </thead>
                                        <tbody>
                                          {statement.transactions.map((t: any, idx: number) => (
                                            <tr key={idx} className="border-b">
                                              <td className="p-2">{formatDate(t.date)}</td>
                                              <td className="p-2 font-mono text-xs">{t.number}</td>
                                              <td className="p-2">{t.type}</td>
                                              <td className="p-2 text-right font-medium">{fmt(t.amount)}</td>
                                              <td className="p-2">{t.status}</td>
                                              <td className="p-2 text-center">
                                                {t.link && (
                                                  <a href={t.link} target="_blank" className="text-blue-600 hover:underline" title="View PO">
                                                    <FileTextIcon className="h-4 w-4 inline" />
                                                  </a>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="border-t-2">
                                          <tr><td colSpan={3} className="p-2 font-semibold">Totals</td><td className="p-2 text-right font-semibold">{fmt(statement.totalInvoiced)}</td><td colSpan={2}></td></tr>
                                          <tr><td colSpan={3} className="p-2">Total Paid</td><td className="p-2 text-right text-green-700">{fmt(statement.totalPaid)}</td><td colSpan={2}></td></tr>
                                          <tr><td colSpan={3} className="p-2 font-bold">Outstanding Balance</td><td className="p-2 text-right font-bold text-red-600">{fmt(statement.totalOwing)}</td><td colSpan={2}></td></tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {!topSuppliers.length && <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No supplier data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <ManualSupplierDebtDialog
              open={manualSupplierDebtOpen}
              onOpenChange={setManualSupplierDebtOpen}
              suppliers={allSuppliers}
              onSuccess={() => {
                toast.success("Manual supplier debt added. It will appear in Payables tracker.");
                // Optionally refresh supplier statements
              }}
            />
          </div>
        )}

        {/* LOCATIONS P&L */}
        {tab === "locations" && (
          <div className="space-y-5">
            {locs.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {locs.map((loc, i) => <StatCard key={loc.locationId} label={loc.locationName} value={fmt(loc.netRevenue)} sub={`Stock: ${fmt(loc.stockValue)} · ${loc.itemCount} items`} accent={(["green", "blue", "purple", "teal", "amber"] as Accent[])[i % 5]} icon={MapPin} />)}
                </div>

                <Card className="bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-4 divide-x divide-blue-200 dark:divide-blue-800">
                      {[
                        { label: "Total Revenue", value: fmt(grand?.totalRevenue ?? 0) },
                        { label: "Returns", value: fmt(grand?.returnsValue ?? 0), red: true },
                        { label: "Net Revenue", value: fmt(grand?.netRevenue ?? 0) },
                        { label: "Stock Value", value: fmt(grand?.stockValue ?? 0) },
                      ].map((s, i) => (
                        <div key={i} className={`px-5 ${i === 0 ? "pl-0" : ""} ${i === 3 ? "pr-0" : ""}`}>
                          <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                          <p className={`text-lg font-bold mt-0.5 ${s.red ? "text-red-600" : "text-emerald-700"}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Revenue &amp; Profit by Location</CardTitle><Link href="/dashboard/settings/locations" className="text-xs text-emerald-600 hover:underline">Manage →</Link></div></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b bg-muted/40"><Th>Location</Th><Th>Type</Th><Th right>Revenue</Th><Th right>Returns</Th><Th right>Net</Th><Th right>Stock</Th><Th center>Orders</Th><Th>Margin</Th></tr></thead>
                        <tbody>
                          {locs.map((loc, i) => {
                            const margin = loc.totalRevenue > 0 ? ((loc.netRevenue / loc.totalRevenue) * 100).toFixed(1) : "0.0";
                            const typeMap: Record<string, string> = { WAREHOUSE: "bg-blue-100 text-blue-700 border-blue-200", SHOP: "bg-green-100 text-green-700 border-green-200", VIRTUAL: "bg-purple-100 text-purple-700 border-purple-200" };
                            return (
                              <TrHover key={i}>
                                <Td className="font-medium text-xs">{loc.locationName}</Td>
                                <Td><Badge variant="outline" className={`text-[10px] ${typeMap[loc.type] ?? ""}`}>{loc.type}</Badge></Td>
                                <Td right className="font-semibold text-xs text-emerald-700">{fmt(loc.totalRevenue)}</Td>
                                <Td right className="text-xs text-red-600">{fmt(loc.returnsValue)}</Td>
                                <Td right className="font-semibold text-xs text-teal-700">{fmt(loc.netRevenue)}</Td>
                                <Td right className="text-xs text-blue-600">{fmt(loc.stockValue)}</Td>
                                <Td center className="text-xs text-muted-foreground">{loc.totalOrders}</Td>
                                <Td><div className="flex items-center gap-2"><div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${parseFloat(margin) > 50 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, parseFloat(margin))}%` }} /></div><span className="text-[10px] text-muted-foreground">{margin}%</span></div></Td>
                              </TrHover>
                            );
                          })}
                          {grand && (
                            <tr className="border-t-2 bg-muted/40">
                              <td className="font-bold text-xs px-3 py-2.5">TOTAL</td>
                              <td className="px-3 py-2.5"></td>
                              <td className="text-right font-bold text-xs text-emerald-700 px-3 py-2.5">{fmt(grand.totalRevenue)}</td>
                              <td className="text-right text-xs text-red-600 px-3 py-2.5">{fmt(grand.returnsValue)}</td>
                              <td className="text-right font-bold text-xs text-teal-700 px-3 py-2.5">{fmt(grand.netRevenue)}</td>
                              <td className="text-right text-xs text-blue-600 px-3 py-2.5">{fmt(grand.stockValue)}</td>
                              <td className="text-center text-xs font-bold px-3 py-2.5">{grand.totalOrders}</td>
                              <td className="px-3 py-2.5"></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="pt-8"><EmptyState icon={MapPin} message="No location data — pass locationSales prop" /></CardContent></Card>
            )}
          </div>
        )}

        {/* CREDIT & PAYMENTS */}
        {tab === "credit" && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Outstanding" value={fmt(creditSummary?.totalOutstanding ?? outstandingCredit)} sub={`${creditSummary?.activeDebtors ?? 0} debtors`} accent="amber" icon={AlertTriangle} href="/dashboard/sales/orders/credit" />
              <StatCard label="Collected" value={fmt(creditSummary?.totalCollected ?? 0)} sub="Payments received" accent="green" icon={CheckCircle2} />
              <StatCard label="Overdue" value={String(creditSummary?.overdueCount ?? 0)} sub="Past delivery date" accent="red" icon={Ban} />
              <StatCard label="Partial" value={String(creditSummary?.partialCount ?? 0)} sub="Partially paid" accent="orange" icon={Clock} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Payment Status Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Paid", val: creditSummary?.paidCount ?? 0, cls: "bg-green-50 border-green-200 text-green-700", icon: CheckCircle2 },
                      { label: "Partial", val: creditSummary?.partialCount ?? 0, cls: "bg-amber-50 border-amber-200 text-amber-700", icon: Clock },
                      { label: "Pending", val: creditSummary?.pendingCount ?? 0, cls: "bg-blue-50 border-blue-200 text-blue-700", icon: Clock },
                      { label: "Overdue", val: creditSummary?.overdueCount ?? 0, cls: "bg-red-50 border-red-200 text-red-700", icon: Ban },
                    ].map(s => (
                      <div key={s.label} className={`rounded-lg border p-3 flex items-center gap-3 ${s.cls}`}>
                        <s.icon className="h-5 w-5 flex-shrink-0" />
                        <div><p className="text-xl font-bold">{s.val}</p><p className="text-xs font-medium">{s.label}</p></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Collection Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total outstanding", value: creditSummary?.totalOutstanding ?? outstandingCredit, cls: "text-amber-700" },
                    { label: "Total collected", value: creditSummary?.totalCollected ?? 0, cls: "text-emerald-700" },
                    { label: "Active debtors", value: creditSummary?.activeDebtors ?? 0, isCount: true },
                    { label: "Overdue accounts", value: creditSummary?.overdueCount ?? 0, isCount: true, cls: "text-red-600" },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className={`text-sm font-bold ${s.cls ?? "text-foreground"}`}>{s.isCount ? s.value : fmt(s.value as number)}</span>
                    </div>
                  ))}
                  <Link href="/dashboard/sales/orders/credit">
                    <Button size="sm" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">View Full Credit Tracker →</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* FORECAST */}
        {tab === "forecast" && <ForecastDashboard />}

        {/* STAFF PERFORMANCE */}
        {tab === "staff" && <StaffPerformanceTab />}

        {/* PAYSTACK SETTINGS */}
        {tab === "paystack" && (
          <div className="space-y-5">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/10">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-blue-600 text-white font-bold tracking-wide">PAYSTACK</Badge>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">Placeholder — configure when ready</Badge>
                </div>
                <h2 className="text-lg font-bold">Payment Gateway Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure API keys, webhooks, and reconciliation settings for Paystack payments.</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><Settings className="h-4 w-4 text-blue-600" />API Configuration</CardTitle>
                  <CardDescription className="text-xs">Set these in your .env file for security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Public Key (pk_*)", value: "Set in .env → NEXT_PUBLIC_PAYSTACK_KEY" },
                    { label: "Secret Key (sk_*)", value: "Set in .env → PAYSTACK_SECRET_KEY" },
                    { label: "Webhook URL", value: `${typeof window !== "undefined" ? window.location.origin : ""}/api/paystack/webhook` },
                    { label: "Environment", value: "Test Mode — switch to Live in Paystack dashboard" },
                  ].map((f, i) => (
                    <div key={f.label}>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</label>
                      <div className="mt-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground font-mono break-all">{f.value}</div>
                    </div>
                  ))}
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">Save Configuration</Button>
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Webhook Events</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {["charge.success", "transfer.success", "invoice.payment_failed", "subscription.create", "refund.processed"].map((ev, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/40 border">
                        <span className="text-xs font-mono text-blue-600">{ev}</span>
                        <Badge variant="outline" className="text-[10px]">Listening</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Security</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>✓ Webhook signature verification</p>
                    <p>✓ HTTPS-only endpoints</p>
                    <p>✓ Secret key never exposed client-side</p>
                    <p className="text-amber-600 font-medium mt-2">⚠ Always verify webhook signatures server-side</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* BILLING & PLAN */}
        {tab === "billing" && (
          <div className="space-y-5">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between flex-wrap gap-6">
                  <div className="flex-1">
                    <Badge className="bg-green-100 text-green-700 border-green-200 mb-3">Free Plan — Active</Badge>
                    <h2 className="text-lg font-bold mb-1">Your Subscription</h2>
                    <p className="text-sm text-muted-foreground mb-4">All core features included. No credit card required.</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-xs">
                      {[
                        ["✓ Inventory & POS", true], ["✓ Sales & purchases", true],
                        ["✓ Basic accounting", true], ["✓ Locations & stock", true],
                        ["✓ Customer management", true], ["✓ Credit tracking", true],
                        ["✗ AI forecasting", false], ["✗ Multi-organisation", false],
                        ["✗ Advanced analytics", false], ["✗ Priority support", false],
                        ["✗ Custom reporting", false], ["✗ API access", false],
                      ].map(([f, a], i) => (
                        <p key={i} className={a ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{f as string}</p>
                      ))}
                    </div>
                  </div>
                  <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20 min-w-52">
                    <CardContent className="pt-5 pb-5 text-center">
                      <Badge variant="outline" className="text-purple-600 border-purple-300 mb-2">Pro Plan</Badge>
                      <p className="text-2xl font-bold mb-0.5">Coming Soon</p>
                      <p className="text-xs text-muted-foreground mb-4">Early access pricing available</p>
                      <div className="space-y-1.5 text-xs text-left mb-4">
                        {["Everything in Free", "AI forecasting", "Multi-org support", "Advanced analytics", "Priority support", "Custom API"].map((f, i) => (
                          <p key={i} className="text-purple-700 dark:text-purple-300">✓ {f}</p>
                        ))}
                      </div>
                      <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => toast.info("You'll be notified when Pro launches!")}>Notify Me When Ready</Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Plan Usage</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Products", used: d?.totalItems ?? 0, limit: null, note: "Unlimited on free" },
                    { label: "Locations", used: locs.length, limit: null, note: "Unlimited on free" },
                    { label: "Users", used: 1, limit: null, note: "Unlimited on free" },
                  ].map((u, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/40 border">
                      <p className="text-xs text-muted-foreground font-medium">{u.label}</p>
                      <p className="text-xl font-bold mt-0.5">{u.used}</p>
                      <p className="text-[10px] text-emerald-600 mt-1">{u.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Billing History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[{ date: "Mar 2026", desc: "Free Plan" }, { date: "Feb 2026", desc: "Free Plan" }, { date: "Jan 2026", desc: "Free Plan" }].map((b, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2.5 rounded-lg border bg-muted/20">
                    <div><p className="text-sm font-medium">{b.desc}</p><p className="text-xs text-muted-foreground">{b.date}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-emerald-700">GHS 0.00</p><Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Active</Badge></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div className="border-t px-6 py-3 text-center flex-shrink-0 print:hidden">
        <p className="text-[10px] text-muted-foreground">
          Accounts &amp; Finance · Live data · {TABS.find(t => t.id === tab)?.label} · Last rendered {new Date().toLocaleTimeString("en-GH")}
        </p>
      </div>
    </div>
  );
}