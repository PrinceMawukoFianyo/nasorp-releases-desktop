import { getStockMovementReport } from "@/actions/reports";
import StockMovementReport from "./components/stock-movement/StockMovementReport";
import { ReportSkeleton } from "./components/ReportSkeleton";
import { Suspense } from "react";

export default async function StockMovementPage() {
  try {
    const data = await getStockMovementReport(30);
    
    if (!data) {
      return (
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No stock movement data available</p>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<ReportSkeleton />}>
        <StockMovementReport data={data} />
      </Suspense>
    );
  } catch (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 font-medium">Error loading report</p>
            <p className="text-sm text-red-500 mt-1">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }
}