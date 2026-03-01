// app/(dashboard)/dashboard/settings/locations/sales/page.tsx
// This file creates the route: /dashboard/settings/locations/sales
import { Suspense } from "react";
import LocationsSalesSummaryPage from "../[id]/locations-sales-page";


export default function LocationsSalesRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading location sales data…</p>
          </div>
        </div>
      }
    >
      <LocationsSalesSummaryPage />
    </Suspense>
  );
}