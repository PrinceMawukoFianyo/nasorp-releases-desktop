"use client"

// components/dashboard/dashboard-date-header.tsx
// Replace your existing period dropdown in DashboardMain with this component.
// It syncs the selected range to ?range= URL param, triggering a server re-render.

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import DateRangePicker from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DashboardDateHeaderProps {
  currentRange: string
  title?: string
  subtitle?: string
  onExport?: () => void
}

export default function DashboardDateHeader({
  currentRange,
  title = "Dashboard",
  subtitle = "Here's your statistics overview.",
  onExport,
}: DashboardDateHeaderProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function handleRangeChange(newRange: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", newRange)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <DateRangePicker
          value={currentRange}
          onChange={handleRangeChange}
        />
        {onExport && (
          <Button variant="outline" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        )}
      </div>
    </div>
  )
}