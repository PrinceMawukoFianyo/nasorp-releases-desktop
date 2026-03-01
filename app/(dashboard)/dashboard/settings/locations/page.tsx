// app/(dashboard)/dashboard/settings/locations/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { TableLoading } from "@/components/ui/data-table";
import { getAuthenticatedUser } from "@/config/useAuth";
import LocationListing from "@/components/dashboard/items/location-listing";

export default async function ProductsPage() {
  const user = await getAuthenticatedUser();

  return (
    <div className="container py-8 space-y-4">

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Org Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your warehouse, shop, and virtual locations</p>
        </div>

        {/* Sales Report shortcut */}
        <Link
          href="/dashboard/settings/locations/sales"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {/* bar-chart icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          View Sales Report
        </Link>
      </div>

      {/* ── Locations table ── */}
      <Suspense fallback={<TableLoading title="Locations" />}>
        <LocationListing title="Org Locations" />
      </Suspense>
    </div>
  );
}