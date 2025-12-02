import { Suspense } from "react";
import { getSalesByItemReport } from "@/actions/sales-reports";
import SalesByItemReport from "./SalesByItemReport";
import { ReportSkeleton } from "../../../stock-movements/components/ReportSkeleton";


export const metadata = {
  title: "Sales by Item Report",
  description: "Product performance and sales analysis",
};

async function SalesByItemData() {
  const data = await getSalesByItemReport(30);
  return <SalesByItemReport data={data} />;
}

export default function SalesByItemPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <SalesByItemData />
    </Suspense>
  );
}
