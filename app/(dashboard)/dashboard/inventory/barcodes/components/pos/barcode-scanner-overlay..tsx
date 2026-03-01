"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, XCircle, ScanLine, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ScanFeedbackState = {
  status:   "scanning" | "found" | "not_found" | "error" | "low_stock" | null
  itemName?: string
  sku?:      string
  quantity?: number
  message?:  string
}

interface BarcodeScannerOverlayProps {
  feedback: ScanFeedbackState
}

/**
 * Full-screen flash overlay shown briefly when a scan happens.
 * Green flash = found, Red = not found, Amber = low stock.
 */
export function BarcodeScannerOverlay({ feedback }: BarcodeScannerOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!feedback.status) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 900)
    return () => clearTimeout(t)
  }, [feedback])

  if (!visible || !feedback.status) return null

  const config = {
    found:     { bg: "bg-green-500/10 border-green-400",   icon: CheckCircle2,  iconColor: "text-green-500",  label: "Added to Cart" },
    not_found: { bg: "bg-red-500/10 border-red-400",       icon: XCircle,       iconColor: "text-red-500",    label: "Not Found"    },
    scanning:  { bg: "bg-blue-500/10 border-blue-400",     icon: ScanLine,      iconColor: "text-blue-500",   label: "Scanning…"    },
    error:     { bg: "bg-red-500/10 border-red-400",       icon: XCircle,       iconColor: "text-red-500",    label: "Error"        },
    low_stock: { bg: "bg-amber-500/10 border-amber-400",   icon: AlertTriangle, iconColor: "text-amber-500",  label: "Low Stock"    },
  }[feedback.status]

  const Icon = config.icon

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 pointer-events-none flex items-center justify-center",
        "animate-in fade-in duration-100"
      )}
    >
      {/* Corner flash indicator */}
      <div
        className={cn(
          "absolute top-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl",
          "border backdrop-blur-xl shadow-2xl",
          "animate-in slide-in-from-top-2 duration-200",
          "bg-slate-950/60 border-slate-700/40",
          config.bg
        )}
      >
        <Icon className={cn("h-7 w-7 shrink-0 drop-shadow-lg", config.iconColor)} />
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-none text-white">{config.label}</p>
          {feedback.itemName && (
            <p className="text-xs text-slate-300 mt-1 max-w-[220px] truncate">
              {feedback.itemName}
            </p>
          )}
          {feedback.message && !feedback.itemName && (
            <p className="text-xs text-slate-300 mt-1 max-w-[220px] truncate">
              {feedback.message}
            </p>
          )}
        </div>
        {feedback.quantity !== undefined && feedback.quantity > 0 && (
          <div className={cn(
            "ml-3 px-3 py-1.5 rounded-lg text-xs font-bold",
            "bg-slate-900/80 text-slate-100 border border-slate-700/50"
          )}>
            {feedback.quantity}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small persistent scan indicator shown in POS header.
 * Pulses when scanner is ready.
 */
export function ScannerStatusBadge({
  active,
  lastScan,
}: {
  active:    boolean
  lastScan?: string | null
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium",
      "backdrop-blur-md transition-smooth",
      active
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        : "bg-slate-700/20 border-slate-600/30 text-slate-400"
    )}>
      <div className={cn(
        "h-2 w-2 rounded-full transition-smooth",
        active ? "bg-emerald-500 animate-pulse-subtle shadow-lg shadow-emerald-500/50" : "bg-slate-500"
      )} />
      <ScanLine className="h-4 w-4" />
      <span>
        {active
          ? lastScan
            ? `Last: ${lastScan}`
            : "Scanner ready"
          : "Scanner off"
        }
      </span>
    </div>
  )
}

/**
 * Hook to manage scan feedback state with auto-clear
 */
export function useScanFeedback() {
  const [feedback, setFeedback] = useState<ScanFeedbackState>({ status: null })
  const timerRef = useState<ReturnType<typeof setTimeout> | null>(null)

  const showFeedback = useCallback((fb: ScanFeedbackState, durationMs = 1200) => {
    setFeedback(fb)
    setTimeout(() => setFeedback({ status: null }), durationMs)
  }, [])

  return { feedback, showFeedback }
}
