// app/(dashboard)/dashboard/reports/sales/SalesReportClient.tsx
"use client";

import { useState, useCallback } from "react";
import { getSalesReportWithDateRange } from "@/actions/sales-reports";

import type { SalesReportData } from "@/actions/sales-reports";
import SalesReportDashboard from "../SalesReportDashboard";

interface SalesReportClientProps {
  initialData: SalesReportData;
}

export default function SalesReportClient({ initialData }: SalesReportClientProps) {
  const [data, setData] = useState<SalesReportData>(initialData);

  const handleDateRangeChange = useCallback(async (from?: Date, to?: Date) => {
    // If no dates are provided, fallback to last 30 days (same as initial)
    const start = from ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    })();
    const end = to ?? new Date();

    const newData = await getSalesReportWithDateRange(start, end);
    setData(newData);
  }, []);

  return (
    <SalesReportDashboard data={data} onDateRangeChange={handleDateRangeChange} />
  );
}