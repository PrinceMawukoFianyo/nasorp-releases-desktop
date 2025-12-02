"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";


import type { SalesReportData } from "@/actions/sales-reports";
import { toast } from "sonner";
import { PageHeader } from "../stock-movements/components/PageHeader";
import { DateRangeFilter } from "../stock-movements/components/DateRangeFilter";
import { SalesSummaryCards } from "./components/SalesSummaryCards";
import { SalesTimelineChart } from "./components/SalesTimeChart";
import { TopPerformersChart } from "./components/TopPerformersChart";
import { RecentOrdersTable } from "./components/RecentOrdersTable";
import { SalesByCustomerTable } from "./components/SalesByCustomerTable";
import { SalesByItemTable } from "./components/SalesByItemTable";

interface SalesReportDashboardProps {
  data: SalesReportData;
}

export default function SalesReportDashboard({ data }: SalesReportDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const {
    summary,
    salesByCustomer,
    salesByItem,
    timeline,
    topCustomers,
    topItems,
    recentOrders,
  } = data;

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setDateRange({ from, to });
    toast.info("Date range filter applied");
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleExport = () => {
    toast.info("Exporting sales report...");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Sales Report"
        description="Comprehensive sales analytics and performance metrics"
      >
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </PageHeader>

      {/* Date Filter */}
      <DateRangeFilter
        onDateRangeChange={handleDateRangeChange}
        onPeriodChange={handlePeriodChange}
      />

      {/* Summary Cards */}
      <SalesSummaryCards summary={summary} />

      {/* Tabbed Content */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Sales Summary</TabsTrigger>
          <TabsTrigger value="customers">Sales by Customer</TabsTrigger>
          <TabsTrigger value="items">Sales by Item</TabsTrigger>
        </TabsList>

        {/* Sales Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <SalesTimelineChart data={timeline} />

          <div className="grid gap-6 md:grid-cols-2">
            <TopPerformersChart
              data={topCustomers}
              title="Top Customers"
              description="Top 5 customers by revenue"
              color="#3b82f6"
            />
            <TopPerformersChart
              data={topItems}
              title="Top Products"
              description="Top 5 products by revenue"
              color="#10b981"
            />
          </div>

          <RecentOrdersTable orders={recentOrders} />
        </TabsContent>

        {/* Sales by Customer Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesSummaryCards summary={summary} />
          </div>
          
          <TopPerformersChart
            data={topCustomers}
            title="Top Customers by Revenue"
            description="Top 5 performing customers"
            color="#3b82f6"
          />

          <SalesByCustomerTable customers={salesByCustomer} />
        </TabsContent>

        {/* Sales by Item Tab */}
        <TabsContent value="items" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesSummaryCards summary={summary} />
          </div>

          <TopPerformersChart
            data={topItems}
            title="Top Products by Revenue"
            description="Best performing products"
            color="#10b981"
          />

          <SalesByItemTable items={salesByItem} />
        </TabsContent>
      </Tabs>
    </div>
  );
}