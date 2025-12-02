import { Suspense } from "react";
import { getSalesReport } from "@/actions/sales-reports";
import SalesReportDashboard from "./SalesReportDashboard";
import { ReportSkeleton } from "../stock-movements/components/ReportSkeleton";


export const metadata = {
  title: "Sales Report",
  description: "Comprehensive sales analytics and performance metrics",
};

async function SalesReportData() {
  const data = await getSalesReport(30);
  return <SalesReportDashboard data={data} />;
}

export default function SalesReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <SalesReportData />
    </Suspense>
  );
}