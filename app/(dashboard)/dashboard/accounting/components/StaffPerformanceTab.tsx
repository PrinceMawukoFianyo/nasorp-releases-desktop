"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import {
  getStaffPerformance,
  getEarliestOrderDate,
  StaffPerformance,
  StaffTransaction,
} from "@/actions/staff-performance";
import { toast } from "sonner";
import { formatCurrency } from "../../sales/orders/so-utils";
import Link from "next/link";
import { DateRangePicker } from "./date-range-picker";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Human-readable badge label + colour for each transaction type */
function TxBadge({ type }: { type: StaffTransaction["type"] }) {
  switch (type) {
    case "POS_SALE":
      return (
        <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 border-violet-200">
          POS
        </Badge>
      );
    case "CASH_SALE":
      return (
        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-green-200">
          Cash Sale
        </Badge>
      );
    case "CREDIT_SALE":
      return (
        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
          Credit Order
        </Badge>
      );
    case "CREDIT_PAYMENT":
      return (
        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
          Payment Collected
        </Badge>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Quick preset config
// ─────────────────────────────────────────────────────────────────────
type Preset = "today" | "7d" | "month" | "year" | "all";

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────
export default function StaffPerformanceTab() {
  const [loading, setLoading]           = useState(true);
  const [data, setData]                 = useState<StaffPerformance[]>([]);
  const [earliestDate, setEarliestDate] = useState<Date | null>(null);

  // Default: null = "all time". We resolve the real date once on mount.
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate]     = useState<Date>(new Date());
  const [preset, setPreset]     = useState<Preset>("all");

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedDay, setExpandedDay]   = useState<string | null>(null);

  // ── Load earliest date once so we can label "All Time (since …)" ───
  useEffect(() => {
    getEarliestOrderDate().then((res) => {
      if (res.success) setEarliestDate(res.date);
    });
  }, []);

  // ── Core data loader ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStaffPerformance(fromDate, toDate);
      if (result.success) {
        setData(result.data);
      } else {
        const failed = result as { success: false; error: string };
        toast.error(failed.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff performance");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Preset handlers ───────────────────────────────────────────────
  const applyPreset = (p: Preset) => {
    const now = new Date();
    setPreset(p);
    setToDate(now);
    switch (p) {
      case "today":
        setFromDate(now);
        break;
      case "7d":
        setFromDate(subDays(now, 6));
        break;
      case "month":
        setFromDate(startOfMonth(now));
        break;
      case "year":
        setFromDate(startOfYear(now));
        break;
      case "all":
        // null = no lower bound (server returns from the very beginning)
        setFromDate(null);
        break;
    }
  };

  // ── Summary totals ────────────────────────────────────────────────
  const totals = data.reduce(
    (acc, u) => ({
      revenue: acc.revenue + u.totalRevenue,
      orders: acc.orders + u.totalOrders,
    }),
    { revenue: 0, orders: 0 }
  );

  const presets: { id: Preset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d",    label: "Last 7 Days" },
    { id: "month", label: "This Month" },
    { id: "year",  label: "This Year" },
    { id: "all",   label: earliestDate ? `All Time (since ${format(earliestDate, "d MMM yyyy")})` : "All Time" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Staff Performance</h2>
          <p className="text-sm text-muted-foreground">
            Revenue contribution by team member — includes POS, cash sales, credit orders, and
            credit payments collected.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Custom date picker for manual range */}
          <DateRangePicker
            from={fromDate ?? earliestDate ?? undefined}
            to={toDate}
            onRangeChange={(from, to) => {
              setPreset("all"); // clear preset label
              if (from) setFromDate(from);
              if (to) setToDate(to);
            }}
          />
        </div>
      </div>

      {/* ── Quick presets ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={preset === p.id ? "default" : "outline"}
            className={`h-7 text-xs ${preset === p.id ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* ── KPI cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground uppercase font-medium">
                Active Staff
              </span>
            </div>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground uppercase font-medium">
                Total Revenue
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(totals.revenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground uppercase font-medium">
                Total Transactions
              </span>
            </div>
            <p className="text-2xl font-bold">{totals.orders}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Staff list ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Revenue by Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              /* Skeleton loader */
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                    <div className="h-6 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              data.map((staff) => {
                const isUserExpanded = expandedUser === staff.userId;

                return (
                  <div
                    key={staff.userId}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* ── User header row ── */}
                    <div
                      className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        setExpandedUser(isUserExpanded ? null : staff.userId)
                      }
                    >
                      <div>
                        <p className="font-semibold">{staff.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {staff.totalOrders} transactions ·{" "}
                          {staff.dailyBreakdown.length} active days
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-green-700">
                          {formatCurrency(staff.totalRevenue)}
                        </span>
                        {isUserExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* ── Expanded daily breakdown ── */}
                    {isUserExpanded && (
                      <div className="p-4 space-y-3 border-t">
                        {staff.dailyBreakdown.map((day) => {
                          const dayKey       = `${staff.userId}-${day.date}`;
                          const isDayExpanded = expandedDay === dayKey;

                          return (
                            <div key={day.date} className="border rounded-md">
                              {/* Day header */}
                              <div
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/20"
                                onClick={() =>
                                  setExpandedDay(isDayExpanded ? null : dayKey)
                                }
                              >
                                <div className="flex items-center gap-3">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {format(
                                      new Date(day.date + "T00:00:00"),
                                      "EEEE, d MMM yyyy"
                                    )}
                                  </span>
                                  <Badge variant="outline">
                                    {day.ordersCount} sales
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-700">
                                    {formatCurrency(day.totalRevenue)}
                                  </span>
                                  {isDayExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>

                              {/* Transaction rows */}
                              {isDayExpanded && (
                                <div className="p-3 border-t bg-muted/10">
                                  <div className="space-y-2">
                                    {day.transactions.map((tx) => (
                                      <div
                                        key={tx.id}
                                        className="flex items-center justify-between text-sm p-2 rounded bg-white dark:bg-card"
                                      >
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <TxBadge type={tx.type} />
                                            <span className="font-mono text-xs">
                                              {tx.orderNumber}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {tx.customerName} ·{" "}
                                            {format(new Date(tx.date), "HH:mm")}
                                            {tx.paymentMethod &&
                                              ` · ${tx.paymentMethod}`}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`font-semibold ${
                                              tx.amount === 0
                                                ? "text-muted-foreground"
                                                : "text-green-700"
                                            }`}
                                          >
                                            {formatCurrency(tx.amount)}
                                          </span>
                                          <Link
                                            href={`/dashboard/sales/orders/${tx.id}`}
                                            target="_blank"
                                          >
                                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                          </Link>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Daily sub-total */}
                                    <div className="flex justify-between items-center pt-2 border-t text-xs font-semibold text-muted-foreground">
                                      <span>Day total</span>
                                      <span className="text-green-700 text-sm">
                                        {formatCurrency(day.totalRevenue)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}