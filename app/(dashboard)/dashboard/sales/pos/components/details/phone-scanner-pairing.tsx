"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Smartphone, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { closeScanSession, createScanSession, pollScanEvents } from "@/actions/scan-session-actions"



interface PhoneScannerPairingProps {
  open: boolean
  onClose: () => void
  onScan: (value: string) => void
  pollIntervalMs?: number
  /** e.g. "Checkout 3" — lets a staff member confirm they're pairing to the right register on a busy floor. */
  stationLabel?: string
}

type Status = "creating" | "waiting" | "connected" | "expired" | "error"

export function PhoneScannerPairing({
  open,
  onClose,
  onScan,
  pollIntervalMs = 1000,
  stationLabel,
}: PhoneScannerPairingProps) {
  const [code, setCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("creating")
  const [joinedByName, setJoinedByName] = useState<string | null>(null)
  const lastSeqRef = useRef(0)

  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Create a fresh session every time this is opened.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus("creating")
    setCode(null)
    setSessionId(null)
    setJoinedByName(null)
    lastSeqRef.current = 0

    createScanSession(stationLabel).then((res) => {
      if (cancelled) return
      if (!res.success || !res.sessionId || !res.code) {
        setStatus("error")
        return
      }
      setCode(res.code)
      setSessionId(res.sessionId)
      setStatus("waiting")
    })

    return () => {
      cancelled = true
    }
  }, [open])

  // Poll for scans coming in from the phone.
  useEffect(() => {
    if (!open || !sessionId) return
    let cancelled = false

    const interval = setInterval(async () => {
      const res = await pollScanEvents(sessionId, lastSeqRef.current)
      if (cancelled) return
      if (!res.success) return

      if (!res.sessionActive) {
        setStatus((s) => (s === "connected" ? "expired" : s))
        return
      }

      if (res.joinedByName) setJoinedByName(res.joinedByName)

      if (res.events.length > 0) {
        setStatus("connected")
        for (const event of res.events as any[]) {
          onScanRef.current(event.value)
          lastSeqRef.current = event.seq
        }
      } else if (res.joinedByName) {
        setStatus((s) => (s === "waiting" ? "connected" : s))
      }
    }, pollIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [open, sessionId, pollIntervalMs])

  const handleClose = useCallback(() => {
    if (sessionId) closeScanSession(sessionId).catch(() => {})
    onClose()
  }, [sessionId, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
        <div className="flex justify-between items-center">
          <p className="font-medium flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {stationLabel || "Phone Scanner"}
          </p>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "creating" && <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />}

        {(status === "waiting" || status === "connected") && code && (
          <>
            <p className="text-sm text-slate-500">
              On the staff phone, open the scan link below, choose <b>"Send scans to my PC"</b>, then enter this
              code:
            </p>
            <p className="text-4xl font-bold tracking-widest">{code}</p>
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
                status === "connected" ? "text-emerald-600" : "text-slate-400"
              )}
            >
              {status === "connected" ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Connected{joinedByName ? ` — ${joinedByName}'s phone` : ""}
                </>
              ) : (
                "Waiting for your phone to connect…"
              )}
            </p>
          </>
        )}

        {status === "expired" && (
          <p className="text-sm text-red-500">This session expired. Close and start again.</p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-500">Couldn't start a session. Please try again.</p>
        )}
      </div>
    </div>
  )
}