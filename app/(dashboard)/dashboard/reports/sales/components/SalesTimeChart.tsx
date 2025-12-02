"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Bar, BarChart, ComposedChart } from "recharts";
import type { SalesTimeline } from "@/actions/sales-reports";

interface SalesTimelineChartProps {
  data: SalesTimeline[];
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#10b981",
  },
  orders: {
    label: "Orders",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

export function SalesTimelineChart({ data }: SalesTimelineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trends</CardTitle>
        <CardDescription>Daily revenue and order volume</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis tickLine={false} axisLine={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
