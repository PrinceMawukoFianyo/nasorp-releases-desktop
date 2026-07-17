"use client"
// components/details/phone-scanner-manager.tsx
//
// Replaces the single PhoneScannerPairing usage on the POS page. Supports
// several staff phones connected at once. Each pairing card can be
// MINIMIZED (hidden, but its session keeps polling in the background — a
// small pill shows it's still connected) or DISCONNECTED (ends the session
// for real). Those used to be the same button; now they're not.

import { useState, useCallback, useRef, useEffect } from "react"
import { Smartphone, X, Loader2, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createScanSession, pollScanEvents, closeScanSession } from "@/actions/scan-session-actions"

type SessionState = {
  sessionId: string
  code: string
  status: "creating" | "waiting" | "connected" | "expired" | "error"
  joinedByName: string | null
  minimized: boolean
  lastSeq: number
}

interface PhoneScannerManagerProps {
  open: boolean
  onScan: (sessionId: string, value: string) => void
  onConnected: (sessionId: string, staffName: string) => void
  pollIntervalMs?: number
}

export function PhoneScannerManager({ open, onScan, onConnected, pollIntervalMs = 1000 }: PhoneScannerManagerProps) {
  const [sessions, setSessions] = useState<SessionState[]>([])
  const notifiedConnected = useRef<Set<string>>(new Set())
  const sessionsRef = useRef<SessionState[]>([])
  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  const onScanRef = useRef(onScan)
  const onConnectedRef = useRef(onConnected)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  useEffect(() => {
    onConnectedRef.current = onConnected
  }, [onConnected])

  const startNewSession = useCallback(async () => {
    const tempId = `pending-${Date.now()}-${Math.random()}`
    setSessions((prev) => [
      ...prev,
      { sessionId: tempId, code: "", status: "creating", joinedByName: null, minimized: false, lastSeq: 0 },
    ])
    const res = await createScanSession()
    if (!res.success || !res.sessionId || !res.code) {
      setSessions((prev) => prev.map((s) => (s.sessionId === tempId ? { ...s, status: "error" } : s)))
      return
    }
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === tempId ? { ...s, sessionId: res.sessionId!, code: res.code!, status: "waiting" } : s))
    )
  }, [])

  // Auto-start the first pairing the moment this is opened with nothing
  // running yet.
  useEffect(() => {
    if (open && sessionsRef.current.length === 0) startNewSession()
  }, [open, startNewSession])

  // One interval drives every session's polling — sessionsRef avoids
  // restarting it every time session state changes.
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = sessionsRef.current.filter((s) => s.status === "waiting" || s.status === "connected")
      for (const s of current) {
        const res = await pollScanEvents(s.sessionId, s.lastSeq)
        if (!res.success) continue

        if (!res.sessionActive) {
          setSessions((prev) => prev.map((x) => (x.sessionId === s.sessionId ? { ...x, status: "expired" } : x)))
          continue
        }

        if (res.joinedByName && !notifiedConnected.current.has(s.sessionId)) {
          notifiedConnected.current.add(s.sessionId)
          onConnectedRef.current(s.sessionId, res.joinedByName)
          setSessions((prev) =>
            prev.map((x) => (x.sessionId === s.sessionId ? { ...x, status: "connected", joinedByName: res.joinedByName ?? null } : x))
          )
        }

        if (res.events.length > 0) {
          for (const event of res.events as any[]) {
            onScanRef.current(s.sessionId, event.value)
          }
          const lastSeq = (res.events as any[])[res.events.length - 1].seq
          setSessions((prev) => prev.map((x) => (x.sessionId === s.sessionId ? { ...x, lastSeq } : x)))
        }
      }
    }, pollIntervalMs)
    return () => clearInterval(interval)
  }, [pollIntervalMs])

  const disconnectSession = useCallback((sessionId: string) => {
    closeScanSession(sessionId).catch(() => {})
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
  }, [])

  const setMinimized = useCallback((sessionId: string, minimized: boolean) => {
    setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, minimized } : s)))
  }, [])

  if (!open) return null

  const expanded = sessions.filter((s) => !s.minimized)
  const minimizedOnes = sessions.filter((s) => s.minimized)

  return (
    <>
      {expanded.map((s) => (
        <div key={s.sessionId} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-medium flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {s.joinedByName ? `${s.joinedByName}'s phone` : "Phone Scanner"}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(s.sessionId, true)}
                  className="p-1 rounded-full hover:bg-black/5"
                  title="Minimize — keeps scanning in the background"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => disconnectSession(s.sessionId)}
                  className="p-1 rounded-full hover:bg-black/5"
                  title="Disconnect — ends this phone's session"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {s.status === "creating" && <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />}

            {(s.status === "waiting" || s.status === "connected") && s.code && (
              <>
                <p className="text-sm text-slate-500">
                  On the staff phone, open the scan link, choose <b>"Send scans to my PC"</b>, then enter this code:
                </p>
                <p className="text-4xl font-bold tracking-widest">{s.code}</p>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/dashboard/sales/pos/scan`
                    navigator.clipboard.writeText(url).then(
                      () => toast.success("Scan link copied — send it to the staff phone"),
                      () => toast.error("Couldn't copy the link")
                    )
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Copy staff scan link
                </button>
                <p
                  className={cn(
                    "text-xs flex items-center justify-center gap-1.5",
                    s.status === "connected" ? "text-emerald-600" : "text-slate-400"
                  )}
                >
                  {s.status === "connected" ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Connected{s.joinedByName ? ` — ${s.joinedByName}` : ""}
                    </>
                  ) : (
                    "Waiting for the phone to connect…"
                  )}
                </p>
              </>
            )}

            {s.status === "expired" && <p className="text-sm text-red-500">This session expired.</p>}
            {s.status === "error" && <p className="text-sm text-red-500">Couldn't start a session. Try again.</p>}

            <button onClick={startNewSession} className="text-xs text-blue-600 hover:text-blue-700">
              + Connect another phone
            </button>
          </div>
        </div>
      ))}

      {/* Minimized sessions keep running — tap to bring the card back,
          nothing here disconnects anything. */}
      {minimizedOnes.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2">
          {minimizedOnes.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => setMinimized(s.sessionId, false)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-lg border border-slate-200 text-xs font-medium hover:bg-slate-50"
            >
              <span className={cn("h-2 w-2 rounded-full", s.status === "connected" ? "bg-emerald-500" : "bg-amber-400")} />
              <Smartphone className="h-3.5 w-3.5" />
              {s.joinedByName ?? "Waiting…"}
            </button>
          ))}
        </div>
      )}
    </>
  )
}