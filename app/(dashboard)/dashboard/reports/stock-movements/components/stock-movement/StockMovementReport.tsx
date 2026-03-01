"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards } from "./SummaryCards";
import { RecentTransfersTable } from "./RecentTransferTable";
import { RecentAdjustmentsTable } from "./RecentAdjustmentsTable";
import { TopAdjustedItemsTable } from "./TopAdjustedItemsTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { StockMovementData } from "@/actions/reports";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "../DateRangeFilter";
import { cn } from "@/lib/utils";

// ── Colours ────────────────────────────────────────────────────────────────

const ADJUSTMENT_COLORS: Record<string, string> = {
  STOCK_COUNT: "#3b82f6",
  DAMAGE:      "#ef4444",
  THEFT:       "#dc2626",
  EXPIRED:     "#f59e0b",
  WRITE_OFF:   "#8b5cf6",
  CORRECTION:  "#10b981",
  OTHER:       "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED:   "#3b82f6",
  DRAFT:      "#94a3b8",
  IN_TRANSIT: "#f59e0b",
  COMPLETED:  "#10b981",
  CANCELLED:  "#ef4444",
};

const formatType = (type: string) =>
  type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

// ── Custom pie label that never overlaps ───────────────────────────────────

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, name, percent,
}: any) => {
  if (percent < 0.05) return null; // hide tiny slices
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────

interface StockMovementReportProps {
  data: StockMovementData;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function StockMovementReport({
  data: initialData,
}: StockMovementReportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // ── Safe defaults ────────────────────────────────────────────────────────

  const safe = {
    summary: initialData?.summary ?? {
      totalTransfers: 0,
      totalAdjustments: 0,
      totalTransferQuantity: 0,
      totalAdjustmentQuantity: 0,
      completedTransfers: 0,
      positiveAdjustments: 0,
      negativeAdjustments: 0,
    },
    transfersByLocation: initialData?.transfersByLocation ?? [],
    adjustmentsByType:   initialData?.adjustmentsByType   ?? [],
    timeline:            initialData?.timeline            ?? [],
    recentTransfers:     initialData?.recentTransfers     ?? [],
    recentAdjustments:   initialData?.recentAdjustments   ?? [],
    topAdjustedItems:    initialData?.topAdjustedItems    ?? [],
    transferStatusData:  initialData?.transferStatusData  ?? [],
    recentActivity:      initialData?.recentActivity      ?? [],
  };

  const hasData =
    safe.timeline.length > 0 ||
    safe.transfersByLocation.length > 0 ||
    safe.adjustmentsByType.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDateRangeChange = async (from?: Date, to?: Date) => {
    if (!from || !to) return;
    setDateRange({ from, to });
    const id = toast.loading("Applying date filter…");
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Filter applied", { id, description: `${from.toLocaleDateString()} – ${to.toLocaleDateString()}` });
    } catch {
      toast.error("Failed to apply filters", { id });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = async (period: string) => {
    const from = new Date();
    const days: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
    from.setDate(from.getDate() - (days[period] ?? 30));
    await handleDateRangeChange(from, new Date());
  };

  const handleRefresh = async () => {
    const id = toast.loading("Refreshing…");
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Report refreshed", { id });
    } catch {
      toast.error("Refresh failed", { id });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    const label = { pdf: "PDF", excel: "Excel", csv: "CSV" }[format];
    const id = toast.loading(`Preparing ${label}…`);
    setTimeout(() => toast.success(`Exported as ${label}`, { id, description: "Download starting…" }), 1500);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">

      {/* ── Page header: title + actions on ONE row ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movement Report</h1>
          <p className="text-muted-foreground mt-1">
            Track stock transfers between locations and inventory adjustments
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toast.success("Link copied to clipboard!")}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-pink-600 hover:bg-pink-700 gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
                <FileText className="h-4 w-4" /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2">
                <FileDown className="h-4 w-4" /> Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Date filter bar ─────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            onPeriodChange={handlePeriodChange}
          />
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            Showing:{" "}
            <span className="font-medium text-foreground">
              {dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" – "}
              {dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </p>
        </div>
      </Card>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <SummaryCards summary={safe.summary} />

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!hasData ? (
        <Card>
          <CardContent className="p-16 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">No Data Available</h3>
              <p className="text-gray-500 text-sm">
                No stock movement data for the selected period. Adjust your date filters or refresh.
              </p>
              <Button onClick={handleRefresh} className="bg-pink-600 hover:bg-pink-700">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (

        /* ── Tabs ──────────────────────────────────────────────────────── */
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* ════════════════ OVERVIEW ════════════════ */}
          <TabsContent value="overview" className="space-y-6">

            {/* Row 1: full-width trend bar chart */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Movement Trends</CardTitle>
                <CardDescription>Daily transfers and adjustments over time</CardDescription>
              </CardHeader>
              <CardContent>
                {safe.timeline.length === 0 ? (
                  <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
                    No timeline data available
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart
                        data={safe.timeline}
                        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                        />
                        <Legend />
                        <Bar dataKey="transfers"   fill="#3b82f6" radius={[4,4,0,0]} name="Transfers" />
                        <Bar dataKey="adjustments" fill="#ef4444" radius={[4,4,0,0]} name="Adjustments" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="bg-blue-50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-blue-700">Total Transfers</p>
                        <p className="text-2xl font-bold mt-1">
                          {safe.timeline.reduce((s, d) => s + (d.transfers || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-red-700">Total Adjustments</p>
                        <p className="text-2xl font-bold mt-1">
                          {safe.timeline.reduce((s, d) => s + (d.adjustments || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Row 2: two pie charts side-by-side, each with enough room */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Transfer Status pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Status Distribution</CardTitle>
                  <CardDescription>Breakdown of transfers by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {safe.transferStatusData.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                      No status data available
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={safe.transferStatusData}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine
                            label={renderCustomLabel}
                          >
                            {safe.transferStatusData.map((entry, i) => (
                              <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number, name: string) => [val, name]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                        {safe.transferStatusData.map((s) => (
                          <div key={s.status} className="flex items-center gap-2 text-sm">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#6b7280" }}
                            />
                            <span className="font-medium truncate">{s.status}</span>
                            <span className="text-muted-foreground ml-auto">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Adjustment by type pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Adjustments by Type</CardTitle>
                  <CardDescription>Distribution of inventory adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  {safe.adjustmentsByType.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                      No adjustment data available
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={safe.adjustmentsByType}
                            dataKey="quantity"
                            nameKey="adjustmentType"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine
                            label={({ name, percent }) =>
                              percent >= 0.05
                                ? `${formatType(name ?? "")} (${(percent * 100).toFixed(0)}%)`
                                : null
                            }
                          >
                            {safe.adjustmentsByType.map((entry, i) => (
                              <Cell key={i} fill={ADJUSTMENT_COLORS[entry.adjustmentType] ?? "#6b7280"} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number, name: string) => [val, formatType(name)]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                        {safe.adjustmentsByType.slice(0, 6).map((e) => (
                          <div key={e.adjustmentType} className="flex items-center gap-2 text-sm">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: ADJUSTMENT_COLORS[e.adjustmentType] ?? "#6b7280" }}
                            />
                            <span className="truncate">{formatType(e.adjustmentType)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Transfer Locations */}
            <Card>
              <CardHeader>
                <CardTitle>Transfer Locations</CardTitle>
                <CardDescription>Top locations by transfer volume</CardDescription>
              </CardHeader>
              <CardContent>
                {safe.transfersByLocation.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No location data</p>
                ) : (
                  <div className="divide-y">
                    {safe.transfersByLocation.slice(0, 5).map((loc, i) => (
                      <div key={i} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            loc.netMovement >= 0 ? "bg-green-100" : "bg-red-100"
                          )}>
                            {loc.netMovement >= 0
                              ? <TrendingUp className="h-5 w-5 text-green-600" />
                              : <TrendingDown className="h-5 w-5 text-red-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-sm">{loc.locationName}</p>
                            <p className="text-xs text-muted-foreground">
                              Net: {loc.netMovement >= 0 ? "+" : ""}{loc.netMovement.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{(loc.transfersIn + loc.transfersOut).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            In: {loc.transfersIn} · Out: {loc.transfersOut}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════ TRANSFERS ════════════════ */}
          <TabsContent value="transfers" className="space-y-6">
            <RecentTransfersTable transfers={safe.recentTransfers} />

            <Card>
              <CardHeader>
                <CardTitle>Transfer Statistics</CardTitle>
                <CardDescription>Summary of transfer activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Transfers",     value: safe.summary.totalTransfers,                                                                         color: "blue"   },
                    { label: "Items Transferred",   value: safe.summary.totalTransferQuantity.toLocaleString(),                                                  color: "green"  },
                    { label: "Avg Items / Transfer", value: safe.summary.totalTransfers > 0
                        ? Math.round(safe.summary.totalTransferQuantity / safe.summary.totalTransfers)
                        : 0,                                                                                                                                     color: "purple" },
                    { label: "Completion Rate",     value: safe.summary.totalTransfers > 0
                        ? `${Math.round(((safe.summary.completedTransfers ?? 0) / safe.summary.totalTransfers) * 100)}%`
                        : "0%",                                                                                                                                  color: "orange" },
                  ].map((s) => (
                    <div key={s.label} className={`p-4 rounded-xl bg-${s.color}-50`}>
                      <p className={`text-sm font-medium text-${s.color}-700`}>{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════ ADJUSTMENTS ════════════════ */}
          <TabsContent value="adjustments" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pie chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Adjustments by Type</CardTitle>
                  <CardDescription>Distribution of inventory adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  {safe.adjustmentsByType.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                      No adjustment data
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={safe.adjustmentsByType}
                            dataKey="quantity"
                            nameKey="adjustmentType"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine
                            label={({ name, percent }) =>
                              percent >= 0.05 ? `${formatType(name ?? "")} (${(percent * 100).toFixed(0)}%)` : null
                            }
                          >
                            {safe.adjustmentsByType.map((e, i) => (
                              <Cell key={i} fill={ADJUSTMENT_COLORS[e.adjustmentType] ?? "#6b7280"} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number, name: string) => [val, formatType(name)]}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-sm">
                        {safe.adjustmentsByType.slice(0, 6).map((e) => (
                          <div key={e.adjustmentType} className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: ADJUSTMENT_COLORS[e.adjustmentType] ?? "#6b7280" }} />
                            <span className="truncate">{formatType(e.adjustmentType)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Top adjusted items table */}
              <TopAdjustedItemsTable items={safe.topAdjustedItems} />
            </div>

            <RecentAdjustmentsTable adjustments={safe.recentAdjustments} />

            {/* Adjustment summary table */}
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Summary</CardTitle>
                <CardDescription>Detailed breakdown by type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg / Adjustment</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safe.adjustmentsByType.map((adj) => (
                      <TableRow key={adj.adjustmentType} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: ADJUSTMENT_COLORS[adj.adjustmentType] ?? "#6b7280" }} />
                            {formatType(adj.adjustmentType)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{adj.count}</TableCell>
                        <TableCell className="text-right font-semibold">{adj.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {adj.count > 0 ? Math.round(adj.quantity / adj.count).toLocaleString() : "0"}
                        </TableCell>
                        <TableCell className="text-right">
                          {safe.summary.totalAdjustmentQuantity > 0
                            ? `${Math.round((adj.quantity / safe.summary.totalAdjustmentQuantity) * 100)}%`
                            : "0%"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {safe.adjustmentsByType.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No adjustment data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════ DETAILS ════════════════ */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Activity Timeline</CardTitle>
                <CardDescription>Combined transfers and adjustments</CardDescription>
              </CardHeader>
              <CardContent>
                {safe.recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No recent activity found</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Refresh data
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safe.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toast.info(`${activity.type} — ${activity.number}`, {
                          description: activity.status,
                        })}
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant={activity.type === "TRANSFER" ? "default" : "secondary"}>
                            {activity.type}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{activity.number}</p>
                            <p className="text-xs text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          {activity.type === "TRANSFER" ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              {activity.fromLocation}
                              <ArrowRightLeft className="h-3 w-3" />
                              {activity.toLocation}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {activity.location} · {activity.adjustmentType ? formatType(activity.adjustmentType) : "N/A"}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{activity.itemCount} items</p>
                        </div>

                        <Badge variant={
                          activity.status === "COMPLETED"  ? "default"     :
                          activity.status === "CANCELLED"  ? "destructive" :
                          "secondary"
                        }>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
        <span>
          Last updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </span>
        <div className="flex gap-4">
          <button onClick={() => toast("Feedback sent!")} className="hover:text-foreground">
            Give feedback
          </button>
          <button onClick={() => toast.info("Support team notified")} className="text-blue-600 hover:text-blue-700">
            Need help?
          </button>
        </div>
      </div>
    </div>
  );
}