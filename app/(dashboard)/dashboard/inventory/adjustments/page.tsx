import { Suspense } from "react"
import { TableLoading } from "@/components/ui/data-table"
import { getAuthenticatedUser } from "@/config/useAuth"
import AdjustmentListing from "./components/StockAdjustments"


export default async function AdjustmentsPage() {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId

  return (
    <Suspense fallback={<TableLoading />}>
      <AdjustmentListing title="Stock Adjustments" orgId={orgId} />
    </Suspense>
  )
}