"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  TrendingDown,
} from "lucide-react";
import type { StockMovementSummary } from "@/actions/reports";
import { Progress } from "@/components/ui/progress";

interface SummaryCardsProps {
  summary: StockMovementSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const completionRate = summary.completedTransfers && summary.totalTransfers > 0 
    ? (summary.completedTransfers / summary.totalTransfers) * 100 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">
            Total Stock Transfers
          </CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{summary.totalTransfers}</div>
          <div className="space-y-2 mt-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.completedTransfers || 0} completed
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">
            Items Transferred
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {summary.totalTransferQuantity.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {summary.totalTransfers > 0 && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">
                  Avg. {Math.round(summary.totalTransferQuantity / summary.totalTransfers)} items per transfer
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">
            Stock Adjustments
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{summary.totalAdjustments}</div>
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Positive vs Negative</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-green-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ 
                        width: `${(summary.positiveAdjustments || 0) / summary.totalAdjustments * 100}%` 
                      }} 
                    />
                  </div>
                  <div className="flex-1 bg-red-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ 
                        width: `${Math.abs(summary.negativeAdjustments || 0) / summary.totalAdjustments * 100}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">Net Adjustment</CardTitle>
          <Activity className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {summary.totalAdjustmentQuantity.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">
                  +{summary.positiveAdjustments || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-red-600 font-medium">
                  {summary.negativeAdjustments || 0}
                </span>
              </div>
            </div>
            {summary.totalAdjustmentQuantity < 0 && (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}