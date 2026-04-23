"use client";

import { useState, useEffect } from "react";
import { getSalesReport } from "@/actions/sales-reports";
import { ReportSkeleton } from "../stock-movements/components/ReportSkeleton";
import SalesReportDashboard from "./SalesReportDashboard";   // 👈 add this line

export default function SalesReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const fetchData = async (from?: Date, to?: Date) => {
    setLoading(true);
    try {
      const result = await getSalesReport(30, from, to);
      setData(result);
    } catch (error) {
      console.error("Error fetching sales report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(dateRange.from, dateRange.to);
  }, [dateRange.from, dateRange.to]);

  if (loading) return <ReportSkeleton />;
  if (!data) return <div>No data available</div>;

  return <SalesReportDashboard data={data} onDateRangeChange={fetchData} />;
}