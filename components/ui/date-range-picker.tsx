"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  /** Current range value passed in from the page (URL param or state) */
  value?: string
  /** Called with the new range string on change */
  onChange?: (value: string) => void
  /** If true, updates URL search param `?range=…` instead of calling onChange */
  syncToUrl?: boolean
  /** The URL param name to sync (default: "range") */
  paramName?: string
  className?: string
}

interface CalendarState {
  year: number
  month: number // 0-based
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Today",      value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "12m" },
]

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"]

function toISO(d: Date) {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function formatLabel(value: string): string {
  if (!value) return "Select date range"
  const preset = PRESETS.find(p => p.value === value)
  if (preset) return preset.label
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
  }
  if (value.includes("_")) {
    const [from, to] = value.split("_")
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
    return `${fmt(from)} – ${fmt(to)}`
  }
  return value
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DateRangePicker({
  value = "7d",
  onChange,
  syncToUrl = false,
  paramName = "range",
  className,
}: DateRangePickerProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen]           = useState(false)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  // Two-step range selection: first click = start, second = end
  const [selectingStart, setSelectingStart] = useState(true)
  const [rangeStart, setRangeStart]         = useState<string | null>(null)

  const [cal, setCal] = useState<CalendarState>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Reset range-selection state when picker opens
  useEffect(() => {
    if (open) { setSelectingStart(true); setRangeStart(null) }
  }, [open])

  // ── Emit ─────────────────────────────────────────────────────────────────

  function emit(newValue: string) {
    if (syncToUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramName, newValue)
      router.push(`${pathname}?${params.toString()}`)
    }
    onChange?.(newValue)
    setOpen(false)
  }

  // ── Calendar navigation ──────────────────────────────────────────────────

  function prevMonth() {
    setCal(c => {
      const month = c.month === 0 ? 11 : c.month - 1
      const year  = c.month === 0 ? c.year - 1 : c.year
      return { year, month }
    })
  }

  function nextMonth() {
    setCal(c => {
      const month = c.month === 11 ? 0 : c.month + 1
      const year  = c.month === 11 ? c.year + 1 : c.year
      return { year, month }
    })
  }

  // ── Day click ────────────────────────────────────────────────────────────

  function handleDayClick(iso: string) {
    if (selectingStart) {
      setRangeStart(iso)
      setSelectingStart(false)
    } else {
      if (!rangeStart) { setRangeStart(iso); return }
      const [from, to] = rangeStart <= iso
        ? [rangeStart, iso]
        : [iso, rangeStart]
      if (from === to) {
        emit(from) // single day
      } else {
        emit(`${from}_${to}`)
      }
      setSelectingStart(true)
      setRangeStart(null)
    }
  }

  // ── Determine in-range highlight ─────────────────────────────────────────

  function isInRange(iso: string) {
    if (selectingStart || !rangeStart) return false
    const pivot  = hoveredDay ?? iso
    const [a, b] = rangeStart <= pivot ? [rangeStart, pivot] : [pivot, rangeStart]
    return iso >= a && iso <= b
  }

  // ── Build calendar grid ──────────────────────────────────────────────────

  function buildGrid() {
    const { year, month } = cal
    const days  = getDaysInMonth(year, month)
    const first = getFirstDayOfMonth(year, month)
    const cells: (string | null)[] = Array(first).fill(null)
    for (let d = 1; d <= days; d++) {
      cells.push(toISO(new Date(year, month, d)))
    }
    // Pad to complete the last week
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const grid = buildGrid()

  // Current selected value display
  const activePreset = PRESETS.find(p => p.value === value)

  // Determine start/end of current value for highlight
  let selectedStart: string | null = null
  let selectedEnd:   string | null = null
  if (value && !activePreset) {
    if (value.includes("_")) {
      [selectedStart, selectedEnd] = value.split("_")
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      selectedStart = selectedEnd = value
    }
  }

  function dayClasses(iso: string | null) {
    if (!iso) return ""
    const today   = toISO(new Date())
    const isToday = iso === today

    const isSelStart = iso === rangeStart
    const inRange    = isInRange(iso)
    const isSel      = iso === selectedStart || iso === selectedEnd
    const inSaved    = selectedStart && selectedEnd && iso >= selectedStart && iso <= selectedEnd

    return cn(
      "w-8 h-8 flex items-center justify-center text-xs rounded-full cursor-pointer select-none transition-colors",
      isToday && !isSelStart && !isSel && "font-bold text-primary",
      isSelStart && "bg-primary text-primary-foreground",
      isSel && "bg-primary text-primary-foreground",
      inRange && !isSelStart && "bg-primary/20 rounded-none",
      inSaved && !isSel && "bg-primary/15 rounded-none",
      !isSelStart && !isSel && !inRange && !inSaved && "hover:bg-muted"
    )
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <Button
        variant="outline"
        onClick={() => setOpen(o => !o)}
        className="gap-2 min-w-[180px] justify-between font-normal"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate">{formatLabel(value)}</span>
      </Button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[340px] rounded-xl border bg-popover shadow-xl">
          {/* Presets */}
          <div className="border-b p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Quick select
            </p>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => emit(p.value)}
                  className={cn(
                    "text-left text-sm px-3 py-1.5 rounded-lg transition-colors",
                    value === p.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {selectingStart ? "Select start date" : "Select end date (or same day)"}
            </p>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">
                {MONTH_NAMES[cal.month]} {cal.year}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day-name header */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {grid.map((iso, i) => (
                <div key={i} className="flex items-center justify-center">
                  {iso ? (
                    <div
                      className={dayClasses(iso)}
                      onClick={() => handleDayClick(iso)}
                      onMouseEnter={() => setHoveredDay(iso)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {parseInt(iso.slice(8))}
                    </div>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          {!selectingStart && rangeStart && (
            <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Start: <strong>{rangeStart}</strong></span>
              <button
                onClick={() => { setSelectingStart(true); setRangeStart(null) }}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <X className="h-3 w-3" /> Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}