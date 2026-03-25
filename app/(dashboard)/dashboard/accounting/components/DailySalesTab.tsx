// app/(dashboard)/dashboard/accounting/components/DailySalesTab.tsx
// Fix the missing totalCreditInvoiced property

"use client";
/**
 * DailySalesTab.tsx
 * Drop into:  app/dashboard/accounting/components/DailySalesTab.tsx
 *
 * Features:
 *  • Multi-day strip: Today · Tomorrow · Next 5 days  (click to select)
 *  • Date picker: select any date to jump to it
 *  • Selected-day breakdown:
 *      - Sales Orders  (with customer + items)
 *      - POS Sales     (cash/momo/card)
 *      - Credit Paid   (payments collected)
 *  • Summary KPI cards per day
 *  • Expandable order rows to see line items
 *  • Export CSV per section
 */

import { useState, useTransition, useCallback, useEffect } from "react";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Download, RefreshCw, ShoppingCart, Banknote, CreditCard,
  Smartphone, WalletCards, User, Package2, Clock, CheckCircle2,
  AlertTriangle, Calendar, TrendingUp,
} from "lucide-react";
import { getDailySales, DaySummary, DailySaleOrder } from "@/actions/daily-sales";
import { toast } from "sonner";

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS",minimumFractionDigits:2}).format(n??0);

function toCsv(rows: Record<string,string|number>[], filename: string) {
  if(!rows.length){ toast.error("No data to export."); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v: string|number) => { const s=String(v??""); return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}"`:s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url); toast.success("Exported!");
}

function paymentMethodIcon(method: string|null) {
  if(!method) return null;
  const m = method.toUpperCase();
  if(m==="CASH")  return <Banknote className="h-3.5 w-3.5 text-emerald-600"/>;
  if(m==="MOMO")  return <Smartphone className="h-3.5 w-3.5 text-blue-600"/>;
  if(m==="CARD")  return <WalletCards className="h-3.5 w-3.5 text-purple-600"/>;
  return <CreditCard className="h-3.5 w-3.5 text-muted-foreground"/>;
}

function paymentMethodBadge(method: string|null) {
  if(!method) return null;
  const m = method.toUpperCase();
  const cls = m==="CASH"?"bg-emerald-100 text-emerald-700 border-emerald-200"
            : m==="MOMO"?"bg-blue-100 text-blue-700 border-blue-200"
            : m==="CARD"?"bg-purple-100 text-purple-700 border-purple-200"
            : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${cls}`}>{paymentMethodIcon(method)}{method}</Badge>;
}

function statusBadge(status: string, paymentStatus: string) {
  const cls = paymentStatus==="PAID"?"bg-green-100 text-green-700 border-green-200"
            : paymentStatus==="PARTIAL"?"bg-amber-100 text-amber-700 border-amber-200"
            : paymentStatus==="PENDING"?"bg-blue-100 text-blue-700 border-blue-200"
            : "bg-muted text-muted-foreground";
  const label = paymentStatus==="PAID"?"Paid":paymentStatus==="PARTIAL"?"Partial":"Credit";
  return <Badge variant="outline" className={`text-[10px] font-semibold ${cls}`}>{label}</Badge>;
}

// ══════════════════════════════════════════════════════════════════════
// ORDER ROW — expandable
// ══════════════════════════════════════════════════════════════════════
function OrderRow({ order, accent="default" }: { order: DailySaleOrder; accent?: "green"|"blue"|"amber"|"purple"|"default" }) {
  const [expanded, setExpanded] = useState(false);

  const accentCls = {
    green:   "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10",
    blue:    "border-blue-200    bg-blue-50/40    dark:bg-blue-950/10",
    amber:   "border-amber-200   bg-amber-50/40   dark:bg-amber-950/10",
    purple:  "border-purple-200  bg-purple-50/40  dark:bg-purple-950/10",
    default: "border-border      bg-muted/20",
  }[accent];

  const headerCls = {
    green:  "text-emerald-700 dark:text-emerald-400",
    blue:   "text-blue-700    dark:text-blue-400",
    amber:  "text-amber-700   dark:text-amber-400",
    purple: "text-purple-700  dark:text-purple-400",
    default:"text-foreground",
  }[accent];

  return (
    <div className={`rounded-lg border ${accentCls} overflow-hidden`}>
      {/* Header row */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Time */}
        <span className="text-[10px] text-muted-foreground font-mono w-10 flex-shrink-0">{order.time}</span>

        {/* Order number */}
        <span className={`text-xs font-bold font-mono flex-shrink-0 ${headerCls}`}>{order.orderNumber}</span>

        {/* Customer */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted">
            {order.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{order.customerName}</p>
            {order.customerPhone && <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>}
          </div>
        </div>

        {/* Items count */}
        <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">
          {order.items.length} item{order.items.length!==1?"s":""}
        </span>

        {/* Payment method */}
        <div className="flex-shrink-0">{paymentMethodBadge(order.paymentMethod)}</div>

        {/* Payment status */}
        <div className="flex-shrink-0">{statusBadge(order.status, order.paymentStatus)}</div>

        {/* Amounts */}
        <div className="text-right flex-shrink-0 min-w-[100px]">
          <p className={`text-sm font-bold ${headerCls}`}>{fmt(order.total)}</p>
          {order.amountOwing > 0 && (
            <p className="text-[10px] text-red-500">Owing: {fmt(order.amountOwing)}</p>
          )}
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
        </div>
      </button>

      {/* Expanded: line items + customer detail */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-background/60">
          {/* Customer info */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{order.customerName}</p>
              <div className="flex flex-wrap gap-3 mt-0.5">
                {order.customerEmail && <span className="text-[10px] text-muted-foreground">{order.customerEmail}</span>}
                {order.customerPhone && <span className="text-[10px] text-muted-foreground">{order.customerPhone}</span>}
              </div>
            </div>
            {order.customerId && (
              <a href={`/dashboard/sales/customers/${order.customerId}`} className="text-[10px] text-emerald-600 hover:underline flex-shrink-0">View profile →</a>
            )}
          </div>

          {/* Line items table */}
          {order.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-1.5 px-2 text-left font-semibold text-muted-foreground">Item</th>
                    <th className="py-1.5 px-2 text-left font-semibold text-muted-foreground">SKU</th>
                    <th className="py-1.5 px-2 text-center font-semibold text-muted-foreground">Qty</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-muted-foreground">Unit Price</th>
                    <th className="py-1.5 px-2 text-right font-semibold text-muted-foreground">Line Total</th>
                   </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 px-2 font-medium">{item.itemName}</td>
                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{item.sku}</td>
                      <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                      <td className="py-1.5 px-2 text-right">{fmt(item.unitPrice)}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{fmt(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={4} className="py-1.5 px-2 font-semibold text-right text-muted-foreground">Order Total</td>
                    <td className="py-1.5 px-2 text-right font-bold">{fmt(order.total)}</td>
                  </tr>
                  {order.amountPaid > 0 && order.amountPaid < order.total && (
                    <>
                      <tr>
                        <td colSpan={4} className="py-1 px-2 text-right text-[10px] text-muted-foreground">Amount Paid</td>
                        <td className="py-1 px-2 text-right text-[10px] text-emerald-600 font-semibold">{fmt(order.amountPaid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="py-1 px-2 text-right text-[10px] text-muted-foreground">Balance Owing</td>
                        <td className="py-1 px-2 text-right text-[10px] text-red-600 font-semibold">{fmt(order.amountOwing)}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <p className="text-[10px] text-muted-foreground italic border-l-2 border-muted pl-2">{order.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SECTION: Sales Orders / POS / Credit
// ══════════════════════════════════════════════════════════════════════
function SalesSection({
  title, icon: Icon, orders, total, accent, emptyMsg, onExport,
}: {
  title:    string;
  icon:     React.ElementType;
  orders:   DailySaleOrder[];
  total:    number;
  accent:   "green"|"blue"|"amber"|"purple";
  emptyMsg: string;
  onExport: ()=>void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const borderCls = {
    green:  "border-emerald-200 dark:border-emerald-800",
    blue:   "border-blue-200    dark:border-blue-800",
    amber:  "border-amber-200   dark:border-amber-800",
    purple: "border-purple-200  dark:border-purple-800",
  }[accent];

  const bgCls = {
    green:  "bg-emerald-50/60 dark:bg-emerald-950/20",
    blue:   "bg-blue-50/60    dark:bg-blue-950/20",
    amber:  "bg-amber-50/60   dark:bg-amber-950/20",
    purple: "bg-purple-50/60  dark:bg-purple-950/20",
  }[accent];

  const textCls = {
    green:  "text-emerald-700 dark:text-emerald-400",
    blue:   "text-blue-700    dark:text-blue-400",
    amber:  "text-amber-700   dark:text-amber-400",
    purple: "text-purple-700  dark:text-purple-400",
  }[accent];

  return (
    <Card className={`border ${borderCls}`}>
      <CardHeader className={`py-3 px-4 ${bgCls} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 flex-1 text-left"
            onClick={() => setCollapsed(c => !c)}
          >
            <Icon className={`h-4 w-4 ${textCls}`}/>
            <span className={`text-sm font-semibold ${textCls}`}>{title}</span>
            <Badge variant="outline" className={`text-[10px] ml-1 ${borderCls} ${textCls}`}>
              {orders.length} order{orders.length!==1?"s":""}
            </Badge>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1"/> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1"/>}
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-base font-bold ${textCls}`}>{fmt(total)}</span>
            {orders.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onExport} className="h-7 px-2">
                <Download className="h-3.5 w-3.5"/>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-3 pb-3 space-y-2">
          {orders.length > 0 ? (
            orders.map(o => (
              <OrderRow key={`${o.orderId}-${o.type}`} order={o} accent={accent}/>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Icon className="h-8 w-8 mx-auto mb-2 opacity-20"/>
              <p className="text-xs">{emptyMsg}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DAY STRIP BUTTON
// ══════════════════════════════════════════════════════════════════════
function DayChip({
  day, isSelected, onClick,
}: {
  day: DaySummary; isSelected: boolean; onClick: ()=>void;
}) {
  const hasSales = day.orderCount > 0;
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all min-w-[80px] ${
        isSelected
          ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
          : day.isToday
          ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700"
          : day.isFuture
          ? "bg-muted/30 border-dashed border-muted-foreground/30 text-muted-foreground"
          : "bg-background border-border hover:bg-muted/40"
      }`}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected?"text-white/80":day.isToday?"text-emerald-600 dark:text-emerald-400":"text-muted-foreground"}`}>
        {day.label}
      </span>
      <span className={`text-sm font-bold mt-0.5 ${isSelected?"text-white":""}`}>
        {format(parseISO(day.date), "d MMM")}
      </span>
      {hasSales ? (
        <span className={`text-[10px] mt-1 font-medium ${isSelected?"text-white/90":"text-emerald-600 dark:text-emerald-400"}`}>
          {fmt(day.totalRevenue).replace("GH₵","₵")}
        </span>
      ) : (
        <span className={`text-[10px] mt-1 ${isSelected?"text-white/60":"text-muted-foreground/60"}`}>
          {day.isFuture ? "—" : "No sales"}
        </span>
      )}
      {!isSelected && hasSales && (
        <div className="flex gap-0.5 mt-1.5">
          {day.salesOrders.length>0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}
          {day.posOrders.length>0    && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>}
          {day.creditPaid.length>0   && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>}
        </div>
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DailySalesTab() {
  const today = startOfDay(new Date());

  // The multi-day strip shows: 2 days back + today + 7 days forward = 10 days
  // The window can be scrolled with prev/next buttons
  const [windowStart, setWindowStart] = useState(() => addDays(today, -2));
  const WINDOW_SIZE = 9;

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Custom date picker value
  const [pickerValue, setPickerValue] = useState<string>(format(today, "yyyy-MM-dd"));

  // Loaded data
  const [data, setData]     = useState<DaySummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState<string|null>(null);
  const [pending, startTransition] = useTransition();

  // ── Fetch a date range ────────────────────────────────────────────
  const fetchRange = useCallback((from: Date, to: Date) => {
    startTransition(async () => {
      setError(null);
      const res = await getDailySales({ fromDate: from, toDate: to });
      
      // Type guard to check if it's a success response
      if ('success' in res && res.success === true) {
        setData(res.data.days);
        setLoaded(true);
      } else {
        // Now TypeScript knows this is the error type
        const errorRes = res as { success: false; error: string };
        setError(errorRes.error);
        toast.error(errorRes.error);
      }
    });
  }, []);

  // Initial load: fetch the visible window
  const loadWindow = useCallback((start: Date) => {
    fetchRange(addDays(start, -1), addDays(start, WINDOW_SIZE + 1));
  }, [fetchRange]);

  // Load on mount
  useEffect(() => {
    loadWindow(windowStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When window scrolls, fetch new range
  const shiftWindow = (dir: 1|-1) => {
    const next = addDays(windowStart, dir * 3);
    setWindowStart(next);
    loadWindow(next);
  };

  // Visible days - FIXED: Added totalCreditInvoiced to the fallback object
  const visibleDays: DaySummary[] = Array.from({ length: WINDOW_SIZE }, (_, i) => {
    const d = addDays(windowStart, i);
    const key = format(d, "yyyy-MM-dd");
    return data.find(x => x.date === key) ?? {
      date:            key,
      label:           i===2 && isSameDay(d,today) ? "Today" : format(d,"EEE d MMM"),
      isToday:         isSameDay(d,today),
      isFuture:        d > today,
      salesOrders:     [],
      posOrders:       [],
      creditPaid:      [],
      totalRevenue:    0,
      totalPOS:        0,
      totalCreditInvoiced: 0,  // ← FIXED: Added missing property
      totalCredit:     0,
      totalCreditPaid: 0,
      orderCount:      0,
    };
  });

  // Selected day data - FIXED: Added totalCreditInvoiced to the fallback object
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDay = data.find(d => d.date === selectedKey) ?? {
    date:            selectedKey,
    label:           "",
    isToday:         false,
    isFuture:        false,
    salesOrders:     [],
    posOrders:       [],
    creditPaid:      [],
    totalRevenue:    0,
    totalPOS:        0,
    totalCreditInvoiced: 0,  // ← FIXED: Added missing property
    totalCredit:     0,
    totalCreditPaid: 0,
    orderCount:      0,
  };

  // Jump to picked date
  const jumpToDate = (dateStr: string) => {
    if(!dateStr) return;
    const d = parseISO(dateStr);
    setSelectedDate(d);
    setPickerValue(dateStr);
    // Shift window so picked date is visible (position 3 in strip)
    setWindowStart(addDays(d, -3));
    loadWindow(addDays(d, -4));
  };

  // Export helpers
  const exportSection = (orders: DailySaleOrder[], label: string) => {
    toCsv(
      orders.flatMap(o => o.items.map(item => ({
        "Date":          o.createdAt.split("T")[0],
        "Time":          o.time,
        "Order #":       o.orderNumber,
        "Customer":      o.customerName,
        "Email":         o.customerEmail,
        "Phone":         o.customerPhone,
        "Type":          o.type,
        "Item":          item.itemName,
        "SKU":           item.sku,
        "Qty":           item.quantity,
        "Unit Price":    item.unitPrice,
        "Line Total":    item.lineTotal,
        "Order Total":   o.total,
        "Amount Paid":   o.amountPaid,
        "Amount Owing":  o.amountOwing,
        "Payment Method":o.paymentMethod??"—",
        "Payment Status":o.paymentStatus,
      }))),
      `${label}-${selectedKey}.csv`
    );
  };

  const exportAll = () => {
    const allOrders = [...selectedDay.salesOrders, ...selectedDay.posOrders, ...selectedDay.creditPaid];
    exportSection(allOrders, `daily-sales`);
  };

  return (
    <div className="space-y-5">

      {/* ── TOP: KPI strip for selected day ──────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total Revenue",   value:selectedDay.totalRevenue,         accent:"green",   icon:TrendingUp,   sub:`${selectedDay.orderCount} orders` },
          { label:"Sales Orders",    value:selectedDay.totalCreditInvoiced,  accent:"emerald", icon:ShoppingCart, sub:`${selectedDay.salesOrders.length} orders · ${fmt(selectedDay.totalCredit)} received` },
          { label:"POS / Cash",      value:selectedDay.totalPOS,             accent:"blue",    icon:Banknote,     sub:`${selectedDay.posOrders.length} transactions` },
          { label:"Credit Collected",value:selectedDay.totalCreditPaid,      accent:"amber",   icon:CreditCard,   sub:`${selectedDay.creditPaid.length} payments` },
        ].map((s,i) => (
          <Card key={i} className={`border ${
            s.accent==="green" ?"bg-emerald-50  border-emerald-200  dark:bg-emerald-950/20  dark:border-emerald-800":
            s.accent==="emerald"?"bg-teal-50   border-teal-200    dark:bg-teal-950/20    dark:border-teal-800":
            s.accent==="blue"  ?"bg-blue-50    border-blue-200    dark:bg-blue-950/20    dark:border-blue-800":
                                 "bg-amber-50   border-amber-200   dark:bg-amber-950/20   dark:border-amber-800"
          }`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                <s.icon className={`h-4 w-4 ${
                  s.accent==="green"?"text-emerald-600":s.accent==="emerald"?"text-teal-600":s.accent==="blue"?"text-blue-600":"text-amber-600"
                }`}/>
              </div>
              <p className={`text-xl font-bold ${
                s.accent==="green"?"text-emerald-900 dark:text-emerald-100":s.accent==="emerald"?"text-teal-900 dark:text-teal-100":s.accent==="blue"?"text-blue-900 dark:text-blue-100":"text-amber-900 dark:text-amber-100"
              }`}>{fmt(s.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── DAY NAVIGATOR ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600"/>
              Daily Overview
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Date picker */}
              <div className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 bg-background">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
                <input
                  type="date"
                  value={pickerValue}
                  onChange={e => jumpToDate(e.target.value)}
                  className="text-xs font-medium bg-transparent outline-none w-32"
                />
              </div>
              {/* Today button */}
              <Button variant="outline" size="sm" className="text-xs h-8"
                onClick={() => jumpToDate(format(today,"yyyy-MM-dd"))}>
                Today
              </Button>
              {/* Refresh */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                onClick={() => loadWindow(windowStart)} disabled={pending}>
                <RefreshCw className={`h-3.5 w-3.5 ${pending?"animate-spin":""}`}/>
              </Button>
              {/* Export all */}
              <Button variant="outline" size="sm" className="h-8" onClick={exportAll}>
                <Download className="h-3.5 w-3.5 mr-1.5"/>Export Day
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {/* Scroll strip */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0"
              onClick={() => shiftWindow(-1)}>
              <ChevronLeft className="h-4 w-4"/>
            </Button>
            <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth:"none" }}>
              {pending && !loaded ? (
                Array.from({length:WINDOW_SIZE}).map((_,i) => (
                  <div key={i} className="flex-shrink-0 h-[78px] w-20 rounded-xl bg-muted/40 animate-pulse"/>
                ))
              ) : (
                visibleDays.map(day => (
                  <DayChip
                    key={day.date}
                    day={day}
                    isSelected={day.date === selectedKey}
                    onClick={() => {
                      setSelectedDate(parseISO(day.date));
                      setPickerValue(day.date);
                      // Fetch that day if not loaded
                      if(!data.find(d=>d.date===day.date)) {
                        fetchRange(parseISO(day.date), parseISO(day.date));
                      }
                    }}
                  />
                ))
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0"
              onClick={() => shiftWindow(1)}>
              <ChevronRight className="h-4 w-4"/>
            </Button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Sales Orders</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>POS/Cash</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Credit Collected</span>
          </div>
        </CardContent>
      </Card>

      {/* ── SELECTED DAY LABEL ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-bold">
            {selectedDay.isToday ? "Today's Sales" : selectedDay.isFuture ? `${format(parseISO(selectedKey),"EEEE, d MMMM yyyy")} — Forecast` : format(parseISO(selectedKey),"EEEE, d MMMM yyyy")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedDay.isFuture
              ? "No sales yet — this is a future date"
              : `${selectedDay.orderCount} orders · ${fmt(selectedDay.totalRevenue)} total revenue`}
          </p>
        </div>
        {error && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">Error loading data</Badge>}
        {pending && <Badge variant="outline" className="text-[10px]">Loading…</Badge>}
      </div>

      {/* ── FUTURE DAY PLACEHOLDER ───────────────────────────────── */}
      {selectedDay.isFuture ? (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center">
            <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30"/>
            <p className="text-sm font-medium">No sales yet for this date</p>
            <p className="text-xs text-muted-foreground mt-1">Sales and transactions will appear here once they are recorded</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── SALES ORDERS SECTION ─────────────────────────────── */}
          <SalesSection
            title="Sales Orders"
            icon={ShoppingCart}
            orders={selectedDay.salesOrders}
            total={selectedDay.totalCreditInvoiced}
            accent="green"
            emptyMsg="No sales orders for this day"
            onExport={() => exportSection(selectedDay.salesOrders, "sales-orders")}
          />

          {/* ── POS SALES SECTION ────────────────────────────────── */}
          <SalesSection
            title="POS / Cash Sales"
            icon={Banknote}
            orders={selectedDay.posOrders}
            total={selectedDay.totalPOS}
            accent="blue"
            emptyMsg="No POS sales for this day"
            onExport={() => exportSection(selectedDay.posOrders, "pos-sales")}
          />

          {/* ── CREDIT PAID SECTION ──────────────────────────────── */}
          <SalesSection
            title="Credit Payments Collected"
            icon={CreditCard}
            orders={selectedDay.creditPaid}
            total={selectedDay.totalCreditPaid}
            accent="amber"
            emptyMsg="No credit payments collected this day"
            onExport={() => exportSection(selectedDay.creditPaid, "credit-paid")}
          />

          {/* ── DAILY SUMMARY FOOTER ─────────────────────────────── */}
          {selectedDay.orderCount > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-4 divide-x divide-border">
                  {[
                    { label:"Orders Invoiced",  value:selectedDay.totalCreditInvoiced, cls:"text-emerald-700" },
                    { label:"Revenue from POS",    value:selectedDay.totalPOS,        cls:"text-blue-700" },
                    { label:"Credit Collected",    value:selectedDay.totalCreditPaid, cls:"text-amber-700" },
                    { label:"Total Revenue",       value:selectedDay.totalRevenue,    cls:"text-emerald-700 font-bold" },
                  ].map((s,i)=>(
                    <div key={i} className={`px-4 ${i===0?"pl-0":""} ${i===3?"pr-0":""}`}>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${s.cls}`}>{fmt(s.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}