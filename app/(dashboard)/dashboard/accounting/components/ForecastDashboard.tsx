"use client";
// components/ForecastDashboard.tsx

import { useState, useCallback } from "react";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Zap, BarChart3, ShoppingCart, Package, CreditCard,
  DollarSign, RefreshCw, Send, Bell, ArrowUpRight, ArrowDownRight,
  Lightbulb, Target, Shield, Activity, Layers, Warehouse,
  MessageSquare, Mail, Phone, ChevronDown, ChevronUp,
  Star, AlertCircle, Info, ExternalLink, Smartphone, MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  FinancialProjection, 
  ForecastAlert, 
  ProductInsight, 
  ForecastReport,
  generateForecast,
  sendPaymentReminder
} from "@/actions/forecast";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0);

// ── Severity config ───────────────────────────────────────────────────────────
const SEV = {
  critical: { bg: "bg-red-50 border-red-200 dark:bg-red-950/30",   text: "text-red-700",   badge: "bg-red-100 text-red-700 border-red-200",   Icon: AlertTriangle },
  warning:  { bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30", text: "text-amber-700", badge: "bg-amber-100 text-amber-700 border-amber-200", Icon: Clock         },
  info:     { bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30",  text: "text-blue-700",  badge: "bg-blue-100 text-blue-700 border-blue-200",   Icon: Info          },
};

const INSIGHT = {
  HIGH_PERFORMER:  { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "⭐ High Performer"  },
  SLOW_MOVER:      { color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     label: "🐢 Slow Mover"      },
  FINANCIAL_DRAIN: { color: "text-red-600",     bg: "bg-red-50 border-red-200",         label: "🚨 Financial Drain" },
  RESTOCK_NEEDED:  { color: "text-orange-600",  bg: "bg-orange-50 border-orange-200",   label: "📦 Restock Needed"  },
  OVERSTOCKED:     { color: "text-violet-600",  bg: "bg-violet-50 border-violet-200",   label: "🏚 Overstocked"     },
};

// Extend ForecastAlert type to include reminder text fields
interface ExtendedForecastAlert extends ForecastAlert {
  whatsappText?: string;
  smsText?: string;
  emailSubject?: string;
  emailBody?: string;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, borderCls, watermarkCls, valueCls, positive }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  borderCls: string; watermarkCls: string; valueCls?: string; positive?: boolean;
}) {
  return (
    <div className={`relative bg-white dark:bg-card rounded-2xl border border-border shadow-sm border-l-4 ${borderCls} hover:shadow-md transition-shadow overflow-hidden`}>
      <Icon className={`absolute -top-2 right-1 h-24 w-24 ${watermarkCls} pointer-events-none select-none`} aria-hidden />
      <div className="px-5 pt-5 pb-4 relative z-[1]">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-2">{label}</p>
        <p className={`text-[1.6rem] font-bold leading-none tracking-tight mb-2 ${valueCls ?? "text-slate-700 dark:text-slate-200"}`}>{value}</p>
        {sub && (
          <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${positive === true ? "bg-emerald-50 text-emerald-600" : positive === false ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            {positive === true  && <ArrowUpRight   className="h-3 w-3 mr-0.5" />}
            {positive === false && <ArrowDownRight  className="h-3 w-3 mr-0.5" />}
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Reminder buttons for an alert ─────────────────────────────────────────────
function ReminderButtons({ alert, onDone }: { alert: ExtendedForecastAlert; onDone: (result: any) => void }) {
  const [busy, setBusy] = useState(false);

  const handleSend = useCallback(async () => {
    if (!alert.contact) return;
    setBusy(true);
    try {
      const res = await sendPaymentReminder({
        orderId: alert.id,
        recipientName: alert.contact.name,
        recipientEmail: alert.contact.email,
        recipientPhone: alert.contact.phone,
        orderNumber: alert.title,
        amountOwing: alert.amount ?? 0,
        type: alert.type === "OVERDUE_CREDIT" ? "CREDIT_CUSTOMER" : "SUPPLIER",
      });

      if (res.success) {
        toast.success(`Reminder sent via: ${res.channels.join(", ")}`);
        onDone({ 
          alertId: alert.id, 
          name: alert.contact.name, 
          email: alert.contact.email, 
          phone: alert.contact.phone, 
          channels: res.channels.map(c => ({ channel: c, status: "sent" }))
        });
      } else {
        toast.error(res.error ?? "Failed to send");
      }
    } finally {
      setBusy(false);
    }
  }, [alert, onDone]);

  // Show WhatsApp link button (manual)
  const showWhatsAppLink = alert.contact?.phone;
  const whatsappMessage = `Hello ${alert.contact?.name}, this is a reminder that GHS ${alert.amount?.toFixed(2)} is outstanding for ${alert.title}. Please arrange payment. Thank you.`;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {alert.contact?.email && (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50" disabled={busy} onClick={handleSend}>
          <Mail className="h-3 w-3" />Email
        </Button>
      )}
      {alert.contact?.phone && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50" disabled={busy} onClick={handleSend}>
            <Smartphone className="h-3 w-3" />SMS
          </Button>
          {showWhatsAppLink && (
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => window.open(`https://wa.me/${alert.contact!.phone!.replace(/\D/g, "").replace(/^0/, "233")}?text=${encodeURIComponent(whatsappMessage)}`, "_blank")}
            >
              <MessageCircle className="h-3 w-3" />WhatsApp
            </Button>
          )}
        </>
      )}
      {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}
    </div>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({ alert, onReminderSent }: { alert: ExtendedForecastAlert; onReminderSent: (result: any) => void }) {
  const cfg = SEV[alert.severity];
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <cfg.Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className={`font-semibold text-sm ${cfg.text}`}>{alert.title}</p>
              <Badge variant="outline" className={`text-[10px] ${cfg.badge}`}>{alert.severity.toUpperCase()}</Badge>
              {alert.type === "OVERDUE_CREDIT" && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">AR</Badge>}
              {alert.type === "BILL_DUE"       && <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">AP</Badge>}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{alert.message}</p>

            {/* Contact info */}
            {alert.contact && (alert.contact.phone || alert.contact.email) && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                {alert.contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{alert.contact.phone}</span>}
                {alert.contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{alert.contact.email}</span>}
              </div>
            )}

            {/* Reminder buttons */}
            {(alert.contact?.email || alert.contact?.phone) && (
              <ReminderButtons alert={alert} onDone={onReminderSent} />
            )}
          </div>
        </div>

        {alert.amount && (
          <p className={`font-bold text-sm whitespace-nowrap flex-shrink-0 ${cfg.text}`}>{fmt(alert.amount)}</p>
        )}
      </div>
    </div>
  );
}

// ── Product Insight Card ──────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: ProductInsight }) {
  const [open, setOpen] = useState(false);
  const cfg = INSIGHT[insight.insight];
  return (
    <div className={`rounded-xl border p-4 cursor-pointer ${cfg.bg}`} onClick={() => setOpen(o => !o)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={`text-[10px] border-0 ${cfg.color} bg-white/60 flex-shrink-0`}>{cfg.label}</Badge>
          <span className="font-semibold text-sm truncate">{insight.itemName}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-600">{fmt(insight.revenue)}</span>
          <span className={`text-xs font-semibold ${insight.grossMargin >= 25 ? "text-emerald-600" : insight.grossMargin >= 10 ? "text-amber-600" : "text-red-600"}`}>{insight.grossMargin.toFixed(1)}%</span>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-white/60 space-y-1">
          <p className="text-xs text-slate-600"><strong>Why:</strong> {insight.reason}</p>
          <p className={`text-xs font-semibold ${cfg.color}`}><strong>Do this:</strong> {insight.suggestion}</p>
          <div className="flex gap-4 text-xs text-slate-400 mt-1"><span>Stock: {insight.stockLeft}</span><span>SKU: {insight.sku}</span></div>
        </div>
      )}
    </div>
  );
}

// ── Projection Card ───────────────────────────────────────────────────────────
function ProjectionCard({ proj }: { proj: FinancialProjection }) {
  const isPos = proj.projectedProfit >= 0;
  const confColor = proj.confidence === "HIGH" ? "text-emerald-600" : proj.confidence === "MEDIUM" ? "text-amber-600" : "text-slate-400";
  return (
    <div className="rounded-2xl border bg-white dark:bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700 dark:text-slate-200">{proj.period}</h3>
        <Badge variant="outline" className={`text-[10px] ${confColor}`}>{proj.confidence} Confidence</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Revenue", fmt(proj.projectedRevenue), "text-emerald-600"], ["COGS", fmt(proj.projectedCOGS), "text-orange-500"], ["Profit", fmt(proj.projectedProfit), isPos ? "text-violet-600" : "text-red-600"]].map(([l, v, c]) => (
          <div key={l}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{l}</p><p className={`text-sm font-bold ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {proj.growthRate >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
        <span className={`text-sm font-semibold ${proj.growthRate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {proj.growthRate >= 0 ? "+" : ""}{proj.growthRate.toFixed(1)}% projected growth
        </span>
      </div>
      <div className="space-y-1">
        {proj.assumptions.map((a, i) => <p key={i} className="text-xs text-slate-500 flex gap-1.5"><span className="text-slate-300">•</span>{a}</p>)}
      </div>
    </div>
  );
}

// ── Narrative Section ─────────────────────────────────────────────────────────
function Narrative({ title, content, icon: Icon, color }: { title: string; content: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4 text-white" /></div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{content}</p>
    </div>
  );
}

// ── Reminder Result Row ────────────────────────────────────────────────────────
function ReminderRow({ r }: { r: any }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{r.name}</p>
        <div className="flex gap-1.5 flex-wrap">
          {r.channels.map((c: any, i: number) => (
            <Badge key={i} variant="outline" className={`text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200`}>
              {c.channel} — sent
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────────
export default function ForecastDashboard() {
  const [report,  setReport]  = useState<ForecastReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentLog, setSentLog] = useState<any[]>([]);
  const [lastGen, setLastGen] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    toast.info("AI is analysing your business data…", { duration: 5000 });
    try {
      const res = await generateForecast();
      if (res.success && res.data) {
        setReport(res.data);
        setSentLog(res.data.remindersSent);
        setLastGen(new Date().toLocaleTimeString("en-GH"));
        toast.success("AI forecast ready!");
        if (res.data.remindersSent.length > 0)
          toast.info(`${res.data.remindersSent.length} auto-reminders sent to critical debtors`);
      } else {
        toast.error(res.error ?? "Failed to generate forecast");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  const onReminderSent = useCallback((result: any) => {
    setSentLog(prev => [result, ...prev.filter((x: any) => x.alertId !== result.alertId)]);
  }, []);

  // Cast alerts to ExtendedForecastAlert
  const extendedAlerts: ExtendedForecastAlert[] = report?.alerts?.map(alert => ({
    ...alert,
    whatsappText: undefined,
    smsText: undefined,
    emailSubject: undefined,
    emailBody: undefined,
  })) || [];

  const kpis = report?.kpis;
  const criticals = extendedAlerts.filter(a => a.severity === "critical").length ?? 0;
  const warnings  = extendedAlerts.filter(a => a.severity === "warning").length  ?? 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Financial Consultant</h1>
            <p className="text-sm text-slate-500">
              Forecasts · Alerts · Product Insights · Payment Reminders (Email + SMS + WhatsApp)
              {lastGen && <span className="ml-2 text-slate-400">· Updated {lastGen}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {criticals > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />{criticals} Critical</Badge>}
          {warnings  > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Bell className="h-3 w-3 mr-1" />{warnings} Warnings</Badge>}
          <Button onClick={handleGenerate} disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md">
            {loading
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analysing…</>
              : <><Zap className="h-4 w-4 mr-2" />{report ? "Refresh Forecast" : "Generate AI Forecast"}</>}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!report && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/40 p-14 text-center space-y-4">
          <Brain className="h-14 w-14 text-violet-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-700">Your AI Financial Consultant</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
            Reads your sales, inventory, credit, payables and expenses — then uses Gemini AI to generate forecasts,
            product insights, cash flow alerts, and sends payment reminders to customers and suppliers via
            <strong> Email, SMS (Africa's Talking), and WhatsApp</strong>.
          </p>

          {/* How messaging works */}
          <div className="max-w-lg mx-auto rounded-xl border bg-white p-4 text-left space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How reminders reach your customers</p>
            {[
              { icon: Mail,          color: "text-blue-500",    label: "Email",                desc: "Sent automatically via Resend (free tier: 3,000/mo)" },
              { icon: Smartphone,    color: "text-green-500",   label: "SMS (Africa's Talking)", desc: "Cheap Ghana SMS (~GHS 0.05/msg). Your Sender ID, e.g. 'YOURBIZ'" },
              { icon: MessageCircle, color: "text-emerald-500", label: "WhatsApp",              desc: "Click a pre-filled link → opens WA on YOUR phone → you tap Send" },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleGenerate} size="lg"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg px-8 mt-2">
            <Zap className="h-5 w-5 mr-2" />Generate AI Forecast Now
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border bg-white dark:bg-card p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center animate-pulse mx-auto">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Analysing your business…</h3>
          <div className="space-y-1.5 text-sm text-slate-500 max-w-xs mx-auto">
            {["Fetching sales & inventory", "Computing margins & COGS", "Analysing credit & payables", "Calling Gemini AI", "Preparing reminders"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts {criticals > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{criticals}</span>}
            </TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="actions">Action Plan</TabsTrigger>
            <TabsTrigger value="reminders">
              Reminders {sentLog.length > 0 && <Badge variant="outline" className="ml-1 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">{sentLog.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="rounded-2xl border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-violet-600" />
                <h2 className="font-bold text-violet-800 dark:text-violet-200">Executive Summary</h2>
                <Badge variant="outline" className="text-[10px] bg-violet-100 text-violet-700 border-violet-300">AI Generated</Badge>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{report.executiveSummary}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Revenue (30d)"     value={fmt(kpis!.totalRevenue30d)} sub={`${kpis!.grossMargin.toFixed(1)}% gross margin`} icon={DollarSign} borderCls="border-l-emerald-500" watermarkCls="text-emerald-400/[.12]" valueCls="text-emerald-700" positive={kpis!.grossMargin >= 25} />
              <KpiCard label="Net Margin"        value={`${kpis!.netMargin.toFixed(1)}%`} sub={kpis!.netMargin >= 10 ? "Healthy" : kpis!.netMargin >= 0 ? "Tight" : "Loss"} icon={TrendingUp} borderCls="border-l-blue-500" watermarkCls="text-blue-400/[.12]" valueCls="text-blue-700" positive={kpis!.netMargin >= 10} />
              <KpiCard label="AR (Credit Owed)"  value={fmt(kpis!.totalCreditOwed)} sub={`${kpis!.overdueCreditCount} overdue`} icon={CreditCard} borderCls="border-l-orange-500" watermarkCls="text-orange-400/[.12]" valueCls="text-orange-600" positive={kpis!.overdueCreditCount === 0} />
              <KpiCard label="AP (We Owe)"       value={fmt(kpis!.totalPayablesOwed)} sub="Supplier payables" icon={Layers} borderCls="border-l-red-500" watermarkCls="text-red-400/[.12]" valueCls="text-red-600" positive={false} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Inventory Value"  value={fmt(kpis!.inventoryValue)} sub="At cost price" icon={Warehouse} borderCls="border-l-cyan-500" watermarkCls="text-cyan-400/[.12]" />
              <KpiCard label="Avg Order Value"  value={fmt(kpis!.avgOrderValue)}  sub="Per transaction" icon={ShoppingCart} borderCls="border-l-indigo-500" watermarkCls="text-indigo-400/[.12]" />
              <KpiCard label="Stock Issues"     value={kpis!.outOfStockCount.toString()} sub={`${kpis!.lowStockCount} low stock`} icon={Package} borderCls="border-l-amber-500" watermarkCls="text-amber-400/[.12]" valueCls={kpis!.outOfStockCount > 0 ? "text-amber-600" : "text-slate-700"} positive={kpis!.outOfStockCount === 0} />
              <KpiCard label="Cash Collected (90d)" value={fmt(kpis!.cashCollected)} sub="From credit customers" icon={Activity} borderCls="border-l-teal-500" watermarkCls="text-teal-400/[.12]" valueCls="text-teal-600" positive />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-white dark:bg-card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Star className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Top Product (30d)</p><p className="font-bold text-slate-700">{kpis!.topProductName}</p></div>
              </div>
              <div className="rounded-xl border bg-white dark:bg-card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
                <div><p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Needs Attention</p><p className="font-bold text-slate-700">{kpis!.slowestProductName}</p></div>
              </div>
            </div>
          </TabsContent>

          {/* ── ALERTS ── */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-slate-700">{extendedAlerts.length} Alerts</h2>
              <p className="text-xs text-slate-400">Each alert has Email · SMS · WhatsApp reminder buttons</p>
            </div>
            {(["critical", "warning", "info"] as const).map(sev => {
              const items = extendedAlerts.filter(a => a.severity === sev);
              if (!items.length) return null;
              return (
                <div key={sev} className="space-y-2">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${SEV[sev].text}`}>{sev} ({items.length})</h3>
                  {items.map(a => <AlertCard key={a.id} alert={a} onReminderSent={onReminderSent} />)}
                </div>
              );
            })}
            {extendedAlerts.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                <p className="font-semibold">No alerts — business looks great!</p>
              </div>
            )}
          </TabsContent>

          {/* ── PRODUCTS ── */}
          <TabsContent value="products" className="space-y-4">
            <h2 className="font-bold text-slate-700">Product Intelligence</h2>
            {(["FINANCIAL_DRAIN", "RESTOCK_NEEDED", "SLOW_MOVER", "OVERSTOCKED", "HIGH_PERFORMER"] as const).map(type => {
              const items = report.productInsights.filter(p => p.insight === type);
              if (!items.length) return null;
              return (
                <div key={type} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{INSIGHT[type].label} ({items.length})</h3>
                  {items.map(p => <InsightCard key={p.itemId} insight={p} />)}
                </div>
              );
            })}
          </TabsContent>

          {/* ── PROJECTIONS ── */}
          <TabsContent value="projections" className="space-y-4">
            <h2 className="font-bold text-slate-700">Financial Projections</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {report.projections.map(p => <ProjectionCard key={p.period} proj={p} />)}
            </div>
            <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Ghana Market:</strong> Projections factor in Cedi depreciation (~15-20%/yr) and inflation.
                For imported goods, review prices quarterly and consider USD-indexed pricing. Promote MoMo payments to speed collections and reduce cash handling.
              </p>
            </div>
          </TabsContent>

          {/* ── AI ANALYSIS ── */}
          <TabsContent value="analysis" className="space-y-4">
            <h2 className="font-bold text-slate-700">AI Financial Analysis</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Narrative title="Financial Health"    content={report.financialHealth}    icon={Activity}  color="bg-emerald-500" />
              <Narrative title="Revenue Analysis"   content={report.revenueAnalysis}    icon={TrendingUp} color="bg-blue-500"   />
              <Narrative title="Cash Flow"          content={report.cashFlowInsights}   icon={DollarSign} color="bg-violet-500" />
              <Narrative title="Inventory"          content={report.inventoryInsights}  icon={Package}    color="bg-orange-500" />
              <Narrative title="Credit Risk"        content={report.creditRiskAnalysis} icon={Shield}     color="bg-red-500"   />
              <Narrative title="Supplier Payables"  content={report.supplierPayables}   icon={Layers}     color="bg-amber-500" />
            </div>
            <Narrative title="Ghana Market Context & Cedi Depreciation" content={report.marketContext} icon={Activity} color="bg-indigo-500" />
          </TabsContent>

          {/* ── ACTION PLAN ── */}
          <TabsContent value="actions" className="space-y-4">
            <h2 className="font-bold text-slate-700">AI Action Plan</h2>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Target className="h-4 w-4 text-violet-500" />Priority Actions</h3>
              {report.actionPlan.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border bg-white dark:bg-card p-4">
                  <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-sm flex-shrink-0">{i + 1}</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Profit Techniques</h3>
              {report.profitTechniques.map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0">💡</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── REMINDERS ── */}
          <TabsContent value="reminders" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-slate-700">Payment Reminders</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"><Mail className="h-3 w-3 mr-1" />Email</Badge>
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200"><Smartphone className="h-3 w-3 mr-1" />SMS</Badge>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><MessageCircle className="h-3 w-3 mr-1" />WhatsApp</Badge>
              </div>
            </div>

            {/* How it works explainer */}
            <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">How each channel works</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Mail,          color: "text-blue-500",    bg: "bg-blue-50",    title: "Email", desc: "Sent automatically from your Resend account to the customer's email address stored in your system. No action needed from you." },
                  { icon: Smartphone,    color: "text-green-600",   bg: "bg-green-50",   title: "SMS (Africa's Talking)", desc: "Sent to the customer's Ghana phone number. Message shows your Sender ID (e.g. 'MYBIZ'). ~GHS 0.05/SMS. Customer sees it as a text from your business." },
                  { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50", title: "WhatsApp (via link)", desc: "Clicking the WhatsApp button opens WhatsApp on YOUR phone with the message pre-filled. You just tap Send. The message goes from YOUR WhatsApp number to the customer." },
                ].map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className={`rounded-lg p-3 ${bg} border`}>
                    <div className="flex items-center gap-2 mb-1.5"><Icon className={`h-4 w-4 ${color}`} /><p className="text-xs font-bold text-slate-700">{title}</p></div>
                    <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-sent reminders */}
            {sentLog.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Reminders Sent This Session ({sentLog.length})</h3>
                {sentLog.map((r, i) => (
                  <div key={i} className="rounded-xl border bg-white dark:bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{r.recipient}</p>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {r.type} — {r.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All overdue credits with reminder buttons */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                All Overdue Credit Customers ({extendedAlerts.filter(a => a.type === "OVERDUE_CREDIT").length})
              </h3>
              {extendedAlerts.filter(a => a.type === "OVERDUE_CREDIT").map(a => (
                <AlertCard key={a.id} alert={a} onReminderSent={onReminderSent} />
              ))}
            </div>

            {/* Supplier bills */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Supplier Bills ({extendedAlerts.filter(a => a.type === "BILL_DUE").length})
              </h3>
              {extendedAlerts.filter(a => a.type === "BILL_DUE").map(a => (
                <AlertCard key={a.id} alert={a} onReminderSent={onReminderSent} />
              ))}
            </div>

            {/* Env vars needed */}
            <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-600">Required .env variables to activate each channel:</p>
              <p><code className="bg-slate-200 px-1 rounded">RESEND_API_KEY</code> + <code className="bg-slate-200 px-1 rounded">FROM_EMAIL</code> → Email</p>
              <p><code className="bg-slate-200 px-1 rounded">TWILIO_ACCOUNT_SID</code> + <code className="bg-slate-200 px-1 rounded">TWILIO_AUTH_TOKEN</code> + <code className="bg-slate-200 px-1 rounded">TWILIO_PHONE_NUMBER</code> → SMS & WhatsApp</p>
              <p className="text-slate-400 mt-1">WhatsApp links work immediately without any API key — they just open WhatsApp on your phone.</p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}