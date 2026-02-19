// app/(dashboard)/dashboard/page.tsx
import { Suspense } from "react"
import { getDashboardData } from "@/actions/dashboard"
import DashboardMain from "@/components/dashboard/DashboardMain"
import { getAuthenticatedUser } from "@/config/useAuth"

type Props = {
  searchParams: Promise<{
    range?: string    // preset: '7d' | '30d' | 'today' | '90d' | '12m'
                      // single: 'YYYY-MM-DD'
                      // range:  'YYYY-MM-DD_YYYY-MM-DD'
    // legacy support
    period?: string
  }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams
  // Support both ?range= (new) and ?period= (legacy)
  const dateRange = params.range || params.period || "7d"

  try {
    const user = await getAuthenticatedUser()
    const data = await getDashboardData(dateRange)

    return (
      <DashboardMain
        data={data}
        initialPeriod={dateRange}
      />
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    )
  }
}