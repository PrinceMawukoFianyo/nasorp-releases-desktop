"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

import type { SalesByCustomer, SalesSummary } from "@/actions/sales-reports";
import { toast } from "sonner";
import { PageHeader } from "../../../stock-movements/components/PageHeader";
import { DateRangeFilter } from "../../../stock-movements/components/DateRangeFilter";
import { SalesSummaryCards } from "../SalesSummaryCards";
import { TopPerformersChart } from "../TopPerformersChart";
import { SalesByCustomerTable } from "../SalesByCustomerTable";

interface SalesByCustomerReportProps {
  data: {
    customers: SalesByCustomer[];
    summary: SalesSummary;
  };
}

export default function SalesByCustomerReport({ data }: SalesByCustomerReportProps) {
  const { customers, summary } = data;

  const topCustomers = customers.slice(0, 5).map((customer) => ({
    name: customer.customerName,
    value: customer.totalRevenue,
    percentage: (customer.totalRevenue / summary.totalRevenue) * 100,
  }));

  const handleExport = () => {
    toast.info("Exporting customer report...");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sales by Customer"
        description="Detailed customer sales analysis and performance"
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
        data={topCustomers}
        title="Top Customers by Revenue"
        description="Top 5 performing customers"
        color="#3b82f6"
      />

      <SalesByCustomerTable customers={customers} />
    </div>
  );
}