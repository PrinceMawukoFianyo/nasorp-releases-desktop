// app/dashboard/sales/returns/page.tsx
import { Suspense } from "react"
import ReturnsClient from "./components/ReturnsClient"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getReturnsSummaryStats, getSalesReturns } from "@/actions/retuns"
import { ReportSkeleton } from "../../reports/stock-movements/components/ReportSkeleton"
import { PageHeader } from "../../reports/stock-movements/components/PageHeader"

export default async function ReturnsPage() {
  const [returnsResult, statsResult] = await Promise.all([
    getSalesReturns(1, 20),
    getReturnsSummaryStats("30d"),
  ])

  const returns = returnsResult.success ? returnsResult.data : []
  const total = returnsResult.success ? returnsResult.total : 0
  const stats = statsResult.success ? statsResult.data : null

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Sales Returns"
        description="Manage customer returns, RMAs, and restock returned inventory"
      >
        <Link href="/dashboard/sales/returns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </Link>
      </PageHeader>

      <Suspense fallback={<ReportSkeleton />}>
        <ReturnsClient
          initialReturns={returns as any}
          initialTotal={total ?? 0}
          stats={stats}
        />
      </Suspense>
    </div>
  )
}