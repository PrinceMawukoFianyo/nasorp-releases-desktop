"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Smartphone, RadioTower, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { closeScanSession, listActiveScanSessions } from "@/actions/scan-session-action"



type SessionRow = {
  id: string
  code: string
  stationLabel: string | null
  joinedByName: string | null
  lastActivityAt: string | Date
  createdAt: string | Date
}

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

// Manager-facing overview: every register currently paired with a phone
// across the whole floor, who's connected to each one, and how fresh their
// last scan is. Built for stores running many checkouts at once — each
// register's session is independent, so this is purely a read/monitor view.
export function ScanSessionsDashboard({ pollIntervalMs = 3000 }: { pollIntervalMs?: number }) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const load = async () => {
      const res = await listActiveScanSessions()
      if (!mountedRef.current) return
      if (res.success) setSessions(res.data as SessionRow[])
      setLoading(false)
    }
    load()
    const interval = setInterval(load, pollIntervalMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [pollIntervalMs])

  const handleDisconnect = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    closeScanSession(sessionId).catch(() => {})
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <RadioTower className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-medium text-slate-700">Active Phone Scanners</p>
        <span className="ml-auto text-xs text-slate-400">{sessions.length} connected</span>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400 text-center">
          No registers are currently paired with a phone.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => {
            const isStale = Date.now() - new Date(s.lastActivityAt).getTime() > 60_000
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className={cn("h-2 w-2 rounded-full shrink-0", isStale ? "bg-amber-400" : "bg-emerald-500")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {s.stationLabel || `Register (code ${s.code})`}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    {s.joinedByName ? (
                      <>
                        <Smartphone className="h-3 w-3" />
                        {s.joinedByName} · last scan {timeAgo(s.lastActivityAt)}
                      </>
                    ) : (
                      "Waiting for a phone to connect…"
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(s.id)}
                  title="Disconnect this register"
                  className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}