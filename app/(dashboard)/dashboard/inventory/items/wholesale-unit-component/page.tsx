"use client"

import { Suspense } from "react"
import { TableLoading } from "@/components/ui/data-table"
import PackagingUnitListing from "./packaging-unit-listing"


export default function PackagingUnitsPage() {
  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title="Packaging Units" />}>
        <PackagingUnitListing />
      </Suspense>
    </div>
  )
}