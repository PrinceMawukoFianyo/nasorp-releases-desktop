"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import type { TimelineData } from "@/actions/reports";

interface TransferChartProps {
  data: TimelineData[];
}

const chartConfig = {
  transfers: {
    label: "Transfers",
    color: "#3b82f6",
  },
  adjustments: {
    label: "Adjustments",
    color: "#ef4444",
  },
} satisfies ChartConfig;

export function TransferChart({ data }: TransferChartProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement Trends</CardTitle>
          <CardDescription>Daily transfers and adjustments over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No timeline data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement Trends</CardTitle>
        <CardDescription>Daily transfers and adjustments over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend />
              <Bar 
                dataKey="transfers" 
                fill="var(--color-transfers)"
                radius={[4, 4, 0, 0]}
                name="Transfers"
              />
              <Bar 
                dataKey="adjustments" 
                fill="var(--color-adjustments)"
                radius={[4, 4, 0, 0]}
                name="Adjustments"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-700">Total Transfers</p>
            <p className="text-xl font-bold">
              {data.reduce((sum, item) => sum + (item.transfers || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-red-700">Total Adjustments</p>
            <p className="text-xl font-bold">
              {data.reduce((sum, item) => sum + (item.adjustments || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}