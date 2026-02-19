"use client"

// components/dashboard/pos/pos-stats-header.tsx
import { useState, useEffect, useCallback } from "react"
import { DollarSign, Package, ShoppingCart, TruckIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getPOSSummaryStats } from "@/actions/pos"
import DateRangePicker from "@/components/ui/date-range-picker"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface Stats {
  inventoryValue: number
  totalItems: number
  salesOrdersCount: number
  salesOrdersValue: number
  purchaseOrdersCount: number
  purchaseOrdersValue: number
  startDate: string
  endDate: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateRangeLabel(stats: Stats | null, range: string): string {
  if (!stats) return ""
  const from = new Date(stats.startDate)
  const to   = new Date(stats.endDate)
  const fmt  = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  if (from.toDateString() === to.toDateString()) return fmt(from)
  return `${fmt(from)} – ${fmt(to)}`
}

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  loading: boolean
}

function StatCard({ title, value, sub, icon, color, loading }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {title}
            </p>
            {loading ? (
              <>
                <Skeleton className="h-7 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground truncate">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${color} shrink-0 ml-3`}>
            {icon}
          </div>
        </div>
        {/* Decorative corner */}
        <div className={`absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-5 ${color}`} />
      </CardContent>
    </Card>
  )
}

interface POSStatsHeaderProps {
  /** Initial date range — pass from page search params */
  initialRange?: string
}

export default function POSStatsHeader({ initialRange = "7d" }: POSStatsHeaderProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const [range, setRange]   = useState(initialRange)
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async (r: string) => {
    setLoading(true)
    try {
      const result = await getPOSSummaryStats(r)
      if (result.success && result.data) {
        setStats(result.data as Stats)
      }
    } catch (err) {
      console.error("Failed to fetch POS stats:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and on range change
  useEffect(() => {
    fetchStats(range)
  }, [range, fetchStats])

  function handleRangeChange(newRange: string) {
    setRange(newRange)
    // Sync to URL so the page can use it too
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", newRange)
    router.push(`${pathname}?${params.toString()}`)
  }

  const periodLabel = formatDateRangeLabel(stats, range)

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          {periodLabel && !loading && (
            <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
          )}
        </div>
        <DateRangePicker
          value={range}
          onChange={handleRangeChange}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Inventory Value"
          value={stats ? formatCurrency(stats.inventoryValue) : "—"}
          sub="Current stock value"
          icon={<DollarSign className="h-4 w-4 text-white" />}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          title="Total Items"
          value={stats ? stats.totalItems.toLocaleString() : "—"}
          sub="Active items"
          icon={<Package className="h-4 w-4 text-white" />}
          color="bg-violet-500"
          loading={loading}
        />
        <StatCard
          title="Total Sales Orders"
          value={stats ? formatCurrency(stats.salesOrdersValue) : "—"}
          sub={stats ? `${stats.salesOrdersCount} order(s)` : undefined}
          icon={<ShoppingCart className="h-4 w-4 text-white" />}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          title="Total Purchase Orders"
          value={stats ? formatCurrency(stats.purchaseOrdersValue) : "—"}
          sub={stats ? `${stats.purchaseOrdersCount} order(s)` : undefined}
          icon={<TruckIcon className="h-4 w-4 text-white" />}
          color="bg-orange-500"
          loading={loading}
        />
      </div>
    </div>
  )
}