"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface TransferStatusChartProps {
  data: Array<{ status: string; count: number; percentage: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#3b82f6",
  DRAFT: "#94a3b8",
  IN_TRANSIT: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const chartConfig = {
  count: {
    label: "Count",
  },
} satisfies ChartConfig;

export function TransferStatusChart({ data }: TransferStatusChartProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>Transfer Status</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No status data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <CardDescription>Transfer Status</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ status, percentage }) =>
                  `${status} (${percentage?.toFixed(1) || 0}%)`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || "#6b7280"}
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
        
        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {data.map((status) => (
            <div key={status.status} className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[status.status] || "#6b7280" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{status.status}</p>
                <p className="text-xs text-muted-foreground">{status.count} transfers</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}