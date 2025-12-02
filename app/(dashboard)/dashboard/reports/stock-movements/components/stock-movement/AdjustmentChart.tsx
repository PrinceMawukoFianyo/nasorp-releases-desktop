"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { AdjustmentByType } from "@/actions/reports";

interface AdjustmentChartProps {
  data: AdjustmentByType[];
}

const ADJUSTMENT_COLORS: Record<string, string> = {
  STOCK_COUNT: "#3b82f6",
  DAMAGE: "#ef4444",
  THEFT: "#dc2626",
  EXPIRED: "#f59e0b",
  WRITE_OFF: "#8b5cf6",
  CORRECTION: "#10b981",
  OTHER: "#6b7280",
};

const chartConfig = {
  quantity: {
    label: "Quantity",
  },
} satisfies ChartConfig;

const formatAdjustmentType = (type: string): string => {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export function AdjustmentChart({ data }: AdjustmentChartProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Adjustments by Type</CardTitle>
          <CardDescription>Distribution of inventory adjustments</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No adjustment data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjustments by Type</CardTitle>
        <CardDescription>Distribution of inventory adjustments</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="quantity"
                nameKey="adjustmentType"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ adjustmentType, quantity }) =>
                  `${formatAdjustmentType(adjustmentType)}: ${quantity}`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ADJUSTMENT_COLORS[entry.adjustmentType] || "#6b7280"}
                  />
                ))}
              </Pie>
              <ChartTooltip 
                content={<ChartTooltipContent />}
                wrapperStyle={{ outline: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Color Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          {data.slice(0, 6).map((entry) => (
            <div key={entry.adjustmentType} className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: ADJUSTMENT_COLORS[entry.adjustmentType] || "#6b7280" }}
              />
              <span className="truncate">{formatAdjustmentType(entry.adjustmentType)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}