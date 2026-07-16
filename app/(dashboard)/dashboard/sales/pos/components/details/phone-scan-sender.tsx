"use client"

import { useState, useCallback } from "react"
import { Smartphone, Camera as CameraIcon } from "lucide-react"
import { toast } from "sonner"
import { CameraBarcodeScanner } from "./camera-barcode-scanner"
import { joinScanSession, pushScanEvent } from "@/actions/scan-session-action"


interface PhoneScanSenderProps {
  open: boolean
  onClose: () => void
  /** Called when scanning locally on this phone (existing lookup behavior). */
  onLocalScan: (value: string) => void
}

type Mode = "choose" | "local" | "remote-code" | "remote-scanning"

// Phone-side entry point. Reuses CameraBarcodeScanner unchanged in both
// modes — only *where the scanned value goes* differs: straight to
// onLocalScan (today's behavior) or up to the paired PC's session via
// pushScanEvent (new remote-scanner mode).
export function PhoneScanSender({ open, onClose, onLocalScan }: PhoneScanSenderProps) {
  const [mode, setMode] = useState<Mode>("choose")
  const [codeInput, setCodeInput] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const handleJoin = useCallback(async () => {
    const trimmed = codeInput.trim()
    if (trimmed.length < 4) return
    setJoining(true)
    const res = await joinScanSession(trimmed)
    setJoining(false)
    if (!res.success || !res.sessionId) {
      toast.error(res.error ?? "Couldn't join that session")
      return
    }
    setSessionId(res.sessionId)
    setMode("remote-scanning")
    toast.success("Connected to PC — start scanning")
  }, [codeInput])

  const handleRemoteScan = useCallback(
    (value: string) => {
      if (!sessionId) return
      pushScanEvent(sessionId, value).then((res) => {
        if (!res.success) toast.error(res.error ?? "Couldn't send scan to PC")
      })
    },
    [sessionId]
  )

  const reset = useCallback(() => {
    setMode("choose")
    setCodeInput("")
    setSessionId(null)
  }, [])

  if (!open) return null

  if (mode === "choose") {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4 px-6 text-white">
        <p className="text-lg font-medium mb-2">How do you want to scan?</p>

        <button
          onClick={() => setMode("local")}
          className="w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-left"
        >
          <CameraIcon className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Use this phone's camera</p>
            <p className="text-xs text-slate-400">Look items up right here</p>
          </div>
        </button>

        <button
          onClick={() => setMode("remote-code")}
          className="w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-left"
        >
          <Smartphone className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Send scans to my PC</p>
            <p className="text-xs text-slate-400">Enter the code shown on your computer</p>
          </div>
        </button>

        <button onClick={onClose} className="text-xs text-slate-400 mt-4">
          Cancel
        </button>
      </div>
    )
  }

  if (mode === "remote-code") {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4 px-6 text-white">
        <p className="text-sm text-slate-300">Enter the code shown on your PC</p>
        <input
          autoFocus
          inputMode="numeric"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJoin()
          }}
          placeholder="482913"
          className="text-3xl tracking-widest text-center bg-white/10 rounded-xl px-4 py-3 w-48 outline-none border border-white/20 focus:border-emerald-400"
        />
        <button
          onClick={handleJoin}
          disabled={joining || codeInput.trim().length < 4}
          className="px-6 py-2 rounded-lg bg-emerald-500 text-black font-medium disabled:opacity-50"
        >
          {joining ? "Connecting…" : "Connect"}
        </button>
        <button onClick={reset} className="text-xs text-slate-400">
          Back
        </button>
      </div>
    )
  }

  // "local" and "remote-scanning" both open the exact same camera UI —
  // only the destination of each scanned value differs.
  return (
    <CameraBarcodeScanner
      open={true}
      onClose={mode === "remote-scanning" ? reset : onClose}
      onScan={mode === "local" ? onLocalScan : handleRemoteScan}
    />
  )
}