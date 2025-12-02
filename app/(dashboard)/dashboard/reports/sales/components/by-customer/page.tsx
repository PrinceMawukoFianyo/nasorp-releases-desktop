import { Suspense } from "react";
import { getSalesByCustomerReport } from "@/actions/sales-reports";
import SalesByCustomerReport from "./SalesByCustomerReport";
import { ReportSkeleton } from "../../../stock-movements/components/ReportSkeleton";


export const metadata = {
  title: "Sales by Customer Report",
  description: "Detailed customer sales analysis",
};

async function SalesByCustomerData() {
  const data = await getSalesByCustomerReport(30);
  return <SalesByCustomerReport data={data} />;
}

export default function SalesByCustomerPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <SalesByCustomerData />
    </Suspense>
  );
}