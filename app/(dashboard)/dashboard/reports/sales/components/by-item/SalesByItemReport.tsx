"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

import type { SalesByItem, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";
import { PageHeader } from "../../../stock-movements/components/PageHeader";
import { DateRangeFilter } from "../../../stock-movements/components/DateRangeFilter";
import { SalesSummaryCards } from "../SalesSummaryCards";
import { TopPerformersChart } from "../TopPerformersChart";
import { SalesByItemTable } from "../SalesByItemTable";

interface SalesByItemReportProps {
  data: {
    items: SalesByItem[];
    summary: SalesSummary;
  };
}

export default function SalesByItemReport({ data }: SalesByItemReportProps) {
  const { items, summary } = data;

  const topItems = items.slice(0, 5).map((item) => ({
    name: item.itemName,
    value: item.totalRevenue,
    percentage: (item.totalRevenue / summary.totalRevenue) * 100,
  }));

  const handleExport = () => {
    toast.info("Exporting item report...");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sales by Item"
        description="Product performance analysis and sales metrics"
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

      <DateRangeFilter />

      <SalesSummaryCards summary={summary} />

      <TopPerformersChart
        data={topItems}
        title="Top Products by Revenue"
        description="Best performing products"
        color="#10b981"
      />

      <SalesByItemTable items={items} />
    </div>
  );
}