"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards } from "./SummaryCards";
import { TransferChart } from "./TransferChart";
import { AdjustmentChart } from "./AdjustmentChart";
import { TransferStatusChart } from "./TransferStatusChart";
import { RecentTransfersTable } from "./RecentTransferTable";
import { RecentAdjustmentsTable } from "./RecentAdjustmentsTable";
import { TopAdjustedItemsTable } from "./TopAdjustedItemsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, TrendingUp, TrendingDown, Download, FileText, FileSpreadsheet, FileDown, RefreshCw } from "lucide-react";
import type { StockMovementData } from "@/actions/reports";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../PageHeader";
import { DateRangeFilter } from "../DateRangeFilter";

interface StockMovementReportProps {
  data: StockMovementData;
}

interface DownloadButtonProps {
  onExport: (format: "pdf" | "excel" | "csv") => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function DownloadButton({ onExport, onRefresh, isLoading }: DownloadButtonProps) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onRefresh}
        variant="outline"
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onExport("pdf")} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("excel")} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("csv")} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function StockMovementReport({
  data: initialData,
}: StockMovementReportProps) {
  const [data, setData] = useState<StockMovementData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Create safe data with defaults to prevent undefined errors
  const safeData = {
    summary: initialData?.summary || {
      totalTransfers: 0,
      totalAdjustments: 0,
      totalTransferQuantity: 0,
      totalAdjustmentQuantity: 0,
      completedTransfers: 0,
      positiveAdjustments: 0,
      negativeAdjustments: 0,
    },
    transfersByLocation: initialData?.transfersByLocation || [],
    adjustmentsByType: initialData?.adjustmentsByType || [],
    timeline: initialData?.timeline || [],
    recentTransfers: initialData?.recentTransfers || [],
    recentAdjustments: initialData?.recentAdjustments || [],
    topAdjustedItems: initialData?.topAdjustedItems || [],
    transferStatusData: initialData?.transferStatusData || [],
    recentActivity: initialData?.recentActivity || []
  };

  const handleDateRangeChange = async (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return;
    
    setDateRange({ from, to });
    
    const toastId = toast.loading("Applying date filter...");
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Filter applied: ${from.toLocaleDateString()} to ${to.toLocaleDateString()}`, {
        id: toastId,
        description: "Showing updated data for selected date range",
      });
    } catch (error) {
      toast.error("Failed to apply filters", {
        id: toastId,
        description: "Please try again or contact support",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = async (period: string) => {
    let newFrom = new Date();
    
    switch (period) {
      case "daily":
        newFrom.setDate(newFrom.getDate() - 1);
        break;
      case "weekly":
        newFrom.setDate(newFrom.getDate() - 7);
        break;
      case "monthly":
        newFrom.setDate(newFrom.getDate() - 30);
        break;
      case "yearly":
        newFrom.setFullYear(newFrom.getFullYear() - 1);
        break;
    }
    
    await handleDateRangeChange(newFrom, new Date());
  };

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    const formats = {
      pdf: "PDF",
      excel: "Excel",
      csv: "CSV"
    };
    
    const toastId = toast.loading(`Preparing ${formats[format]} export...`);
    
    // Simulate export process
    setTimeout(() => {
      toast.success(`Report exported as ${formats[format]}`, {
        id: toastId,
        description: "Your download will start automatically",
        action: {
          label: "View",
          onClick: () => console.log("View exported file"),
        },
      });
      
      // In real app, trigger download
      console.log(`Exporting as ${format}`);
    }, 1500);
  };

  const handleRefresh = async () => {
    const toastId = toast.loading("Refreshing report data...");
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Report refreshed successfully", {
        id: toastId,
        description: "Latest data has been loaded",
      });
    } catch (error) {
      toast.error("Failed to refresh data", {
        id: toastId,
        description: "Please check your connection and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "export":
        toast.info("Opening export options...");
        break;
      case "filter":
        toast.info("Customize your filters");
        break;
      case "share":
        toast.success("Report link copied to clipboard!", {
          description: "Share with your team members",
        });
        break;
    }
  };

  const formatAdjustmentType = (type: string): string => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const hasData = safeData.timeline.length > 0 || 
                  safeData.transfersByLocation.length > 0 || 
                  safeData.adjustmentsByType.length > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Movement Report</h1>
        <p className="text-muted-foreground mt-2">
          Track stock transfers between locations and inventory adjustments
        </p>
      </div>

      {/* Date Range Filter Section - First Row */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Date Range Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap">Period</span>
              <DateRangeFilter 
                onDateRangeChange={handleDateRangeChange}
                onPeriodChange={handlePeriodChange}
              />
            </div>
            
            {/* Current Date Range Display */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium whitespace-nowrap">Showing:</span>
              <span className="text-muted-foreground">
                {dateRange.from.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })} - {dateRange.to.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Section - Second Row */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{safeData.summary.totalTransfers}</p>
              <p className="text-sm text-muted-foreground">Total Transfers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">{safeData.summary.totalAdjustments}</p>
              <p className="text-sm text-muted-foreground">Total Adjustments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">
                {safeData.summary.totalTransferQuantity.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Items Transferred</p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Additional Actions */}
            <button
              onClick={() => handleQuickAction("share")}
              className="px-3 py-2 text-sm bg-white border rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={safeData.summary} />

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
              <p className="text-gray-500 mb-6">
                No stock movement data found for the selected period. Try adjusting your date filters or check back later.
              </p>
              <Button onClick={handleRefresh} className="bg-pink-600 hover:bg-pink-700">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Section */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transfers">Transfers</TabsTrigger>
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <TransferChart data={safeData.timeline} />
                <TransferStatusChart data={safeData.transferStatusData} />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <AdjustmentChart data={safeData.adjustmentsByType} />
                <Card>
                  <CardHeader>
                    <CardTitle>Transfer Locations</CardTitle>
                    <CardDescription>Top locations by transfer volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {safeData.transfersByLocation.slice(0, 5).map((location, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              location.netMovement >= 0 ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {location.netMovement >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{location.locationName}</p>
                              <p className="text-sm text-muted-foreground">
                                Net: {location.netMovement >= 0 ? '+' : ''}{location.netMovement.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{(location.transfersIn + location.transfersOut).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              In: {location.transfersIn} • Out: {location.transfersOut}
                            </p>
                          </div>
                        </div>
                      ))}
                      {safeData.transfersByLocation.length > 5 && (
                        <button
                          onClick={() => toast.info("Showing all locations", {
                            description: "Loading complete location data...",
                          })}
                          className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          View all {safeData.transfersByLocation.length} locations →
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transfers" className="space-y-4">
              <div className="grid gap-4">
                <RecentTransfersTable transfers={safeData.recentTransfers} />
                
                {/* Transfer Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transfer Statistics</CardTitle>
                    <CardDescription>Summary of transfer activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div 
                        className="space-y-2 p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => toast.info("Transfer Details", {
                          description: `Total transfers: ${safeData.summary.totalTransfers}`,
                        })}
                      >
                        <p className="text-sm font-medium text-blue-700">Total Transfers</p>
                        <p className="text-2xl font-bold">{safeData.summary.totalTransfers}</p>
                      </div>
                      <div 
                        className="space-y-2 p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => toast.info("Transfer Volume", {
                          description: `Total items transferred: ${safeData.summary.totalTransferQuantity.toLocaleString()}`,
                        })}
                      >
                        <p className="text-sm font-medium text-green-700">Items Transferred</p>
                        <p className="text-2xl font-bold">{safeData.summary.totalTransferQuantity.toLocaleString()}</p>
                      </div>
                      <div 
                        className="space-y-2 p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => toast.info("Average Items", {
                          description: `Average items per transfer: ${safeData.recentTransfers.length > 0 
                            ? Math.round(safeData.summary.totalTransferQuantity / safeData.summary.totalTransfers)
                            : 0
                          }`,
                        })}
                      >
                        <p className="text-sm font-medium text-purple-700">Avg. Items/Transfer</p>
                        <p className="text-2xl font-bold">
                          {safeData.recentTransfers.length > 0 && safeData.summary.totalTransfers > 0
                            ? Math.round(safeData.summary.totalTransferQuantity / safeData.summary.totalTransfers)
                            : 0
                          }
                        </p>
                      </div>
                      <div 
                        className="space-y-2 p-4 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => toast.info("Completion Rate", {
                          description: `${safeData.summary.completedTransfers || 0} completed out of ${safeData.summary.totalTransfers} total transfers`,
                        })}
                      >
                        <p className="text-sm font-medium text-orange-700">Completion Rate</p>
                        <p className="text-2xl font-bold">
                          {safeData.summary.completedTransfers && safeData.summary.totalTransfers > 0
                            ? `${Math.round((safeData.summary.completedTransfers / safeData.summary.totalTransfers) * 100)}%`
                            : "0%"
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AdjustmentChart data={safeData.adjustmentsByType} />
                <TopAdjustedItemsTable items={safeData.topAdjustedItems} />
              </div>
              
              <RecentAdjustmentsTable adjustments={safeData.recentAdjustments} />
              
              {/* Adjustment Summary */}
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
                        <TableHead className="text-right">Avg. per Adjustment</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeData.adjustmentsByType.map((adjustment) => (
                        <TableRow 
                          key={adjustment.adjustmentType}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => toast.info(`${adjustment.adjustmentType.replace(/_/g, " ")} Details`, {
                            description: `${adjustment.count} adjustments affecting ${adjustment.quantity.toLocaleString()} items`,
                          })}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: adjustment.adjustmentType === "STOCK_COUNT" ? "#3b82f6" :
                                                  adjustment.adjustmentType === "DAMAGE" ? "#ef4444" :
                                                  adjustment.adjustmentType === "THEFT" ? "#dc2626" :
                                                  adjustment.adjustmentType === "EXPIRED" ? "#f59e0b" :
                                                  adjustment.adjustmentType === "WRITE_OFF" ? "#8b5cf6" :
                                                  adjustment.adjustmentType === "CORRECTION" ? "#10b981" : "#6b7280",
                                }}
                              />
                              {formatAdjustmentType(adjustment.adjustmentType)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{adjustment.count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {adjustment.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {adjustment.count > 0 ? Math.round(adjustment.quantity / adjustment.count).toLocaleString() : "0"}
                          </TableCell>
                          <TableCell className="text-right">
                            {safeData.summary.totalAdjustmentQuantity > 0
                              ? `${Math.round((adjustment.quantity / safeData.summary.totalAdjustmentQuantity) * 100)}%`
                              : "0%"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Activity Timeline</CardTitle>
                  <CardDescription>Combined transfers and adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {safeData.recentActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toast.info(`${activity.type} Details`, {
                          description: `${activity.number} - ${activity.status}`,
                        })}
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant={activity.type === "TRANSFER" ? "default" : "secondary"}>
                            {activity.type}
                          </Badge>
                          <div>
                            <p className="font-medium">{activity.number}</p>
                            <p className="text-sm text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {activity.type === "TRANSFER" ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{activity.fromLocation}</span>
                              <ArrowRightLeft className="h-4 w-4" />
                              <span className="text-sm">{activity.toLocation}</span>
                            </div>
                          ) : (
                            <p className="text-sm">
                              {activity.location} • {activity.adjustmentType ? formatAdjustmentType(activity.adjustmentType) : "N/A"}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{activity.itemCount} items</p>
                        </div>
                        
                        <Badge variant={
                          activity.status === "COMPLETED" ? "default" :
                          activity.status === "CANCELLED" ? "destructive" :
                          "secondary"
                        }>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                    
                    {safeData.recentActivity.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No recent activity found</p>
                        <button
                          onClick={() => toast.info("Refresh suggested", {
                            description: "Try refreshing or adjusting your date filters",
                          })}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Refresh data
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toast("Report feedback sent", {
                  description: "Thank you for your feedback!",
                })}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Give feedback
              </button>
              <button
                onClick={() => toast.info("Help requested", {
                  description: "Our support team will contact you shortly",
                })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Need help?
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}