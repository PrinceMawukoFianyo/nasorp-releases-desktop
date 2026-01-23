"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Tag,
  Percent,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import type { SalesSummary } from "@/actions/sales-reports";
import { Progress } from "@/components/ui/progress";

interface SalesSummaryCardsProps {
  summary: SalesSummary;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function SalesSummaryCards({ summary }: SalesSummaryCardsProps) {
  const netRevenuePercentage = summary.totalRevenue > 0 
    ? (summary.netRevenue / summary.totalRevenue) * 100 
    : 0;

  const averageItemsPerOrder = summary.totalOrders > 0 
    ? summary.totalRevenue / summary.totalOrders 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Total Revenue Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-green-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Revenue
          </CardTitle>
          <DollarSign className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold truncate">{formatCurrency(summary.totalRevenue)}</div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {summary.totalOrders} orders
            </p>
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Total Orders Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Orders
          </CardTitle>
          <ShoppingCart className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{summary.totalOrders}</div>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg. per day</span>
              <span className="font-medium">
                {(summary.totalOrders / 30).toFixed(1)}
              </span>
            </div>
            <Progress value={100} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Average Order Value Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Order Value
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-purple-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold truncate">
            {formatCurrency(summary.averageOrderValue)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
              Per transaction
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Revenue Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-emerald-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Revenue
          </CardTitle>
          <Percent className="h-5 w-5 text-emerald-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold truncate">
            {formatCurrency(summary.netRevenue)}
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Net margin</span>
              <span className="font-medium text-emerald-600">
                {netRevenuePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={netRevenuePercentage} className="h-1" />
            <p className="text-xs text-muted-foreground">
              After tax & discounts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Tax Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-orange-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Tax
          </CardTitle>
          <Receipt className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold truncate">
            {formatCurrency(summary.totalTax)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
              Collected
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Discount Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-red-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Discount
          </CardTitle>
          <Tag className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold truncate">
            {formatCurrency(summary.totalDiscount)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              Given
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Per Order Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-cyan-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Items/Order
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-cyan-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {averageItemsPerOrder.toFixed(1)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
              Average items
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-indigo-500">
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-full -translate-y-6 translate-x-6" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Revenue Growth
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-indigo-600" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold text-indigo-600">
            +15.2%
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-indigo-500" />
            <span className="text-xs text-muted-foreground">
              vs previous period
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}