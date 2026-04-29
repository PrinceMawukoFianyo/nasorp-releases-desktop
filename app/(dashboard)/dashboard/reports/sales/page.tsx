// app/(dashboard)/dashboard/reports/sales/page.tsx
import { Suspense } from "react";
import { getSalesReport } from "@/actions/sales-reports";
import { ReportSkeleton } from "../stock-movements/components/ReportSkeleton";
import SalesReportClient from "./components/SalesReportClient";

export const metadata = {
  title: "Sales Report",
  description: "Comprehensive sales analytics and performance metrics",
};

async function SalesReportData() {
  const data = await getSalesReport(30); // initial 30‑day report
  return <SalesReportClient initialData={data} />;
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <SalesReportData />
    </Suspense>
  );
}