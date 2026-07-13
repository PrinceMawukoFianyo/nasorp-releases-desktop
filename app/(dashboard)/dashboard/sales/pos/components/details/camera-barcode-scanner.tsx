"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { X, ZapOff, Zap, CameraOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { playBeep } from "@/lib/beep"

interface CameraBarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (value: string) => void
  /** ms to ignore repeat reads of the same code — stops one physical
   *  barcode from being added to the cart 10x while it's in frame */
  rescanDelay?: number
}

const SCANNER_ELEMENT_ID = "camera-barcode-scanner-viewport"

export function CameraBarcodeScanner({
  open,
  onClose,
  onScan,
  rescanDelay = 1500,
}: CameraBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ value: string; time: number } | null>(null)
  const [status, setStatus] = useState<"starting" | "ready" | "error" | "no-camera">("starting")
  const [errorMsg, setErrorMsg] = useState("")
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus("starting")

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: "environment" }, // rear camera on phones; falls back fine on laptops
        { fps: 12, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          const now = Date.now()
          const last = lastScanRef.current
          if (last && last.value === decodedText && now - last.time < rescanDelay) {
            return // debounce — same code still sitting in frame
          }
          lastScanRef.current = { value: decodedText, time: now }
          playBeep() // fires the instant a code is decoded, same as real hardware scanners
          onScan(decodedText)
        },
        () => {
          // fires every frame nothing is decoded yet — expected noise, ignore
        }
      )
      .then(() => {
        if (cancelled) return
        setStatus("ready")
        const caps = (scanner as any).getRunningTrackCapabilities?.()
        setTorchSupported(!!caps?.torch)
      })
      .catch((err: any) => {
        if (cancelled) return
        console.error("Camera scanner failed to start:", err)
        const msg = String(err)
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setStatus("error")
          setErrorMsg("Camera access was blocked. Allow camera permission for this site and try again.")
        } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
          setStatus("no-camera")
          setErrorMsg("No camera was found on this device.")
        } else {
          setStatus("error")
          setErrorMsg("Couldn't start the camera. Please try again.")
        }
      })

    return () => {
      cancelled = true
      scanner.stop().then(() => scanner.clear()).catch(() => {})
      scannerRef.current = null
    }
  }, [open, rescanDelay, onScan])

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await (scanner as any).applyVideoConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn((t) => !t)
    } catch {
      // torch not supported on this device — ignore quietly
    }
  }, [torchOn])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <p className="text-sm font-medium">Scan Barcode</p>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button onClick={toggleTorch} className="p-2 rounded-full hover:bg-white/10" title="Toggle flashlight">
              {torchOn ? <Zap className="h-5 w-5 text-amber-400" /> : <ZapOff className="h-5 w-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div id={SCANNER_ELEMENT_ID} className="w-full h-full [&_video]:object-cover" />

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {(status === "error" || status === "no-camera") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/90 px-8 text-center">
            <CameraOff className="h-10 w-10 text-red-400" />
            <p className="text-sm text-slate-200">{errorMsg}</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Close
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[260px] h-[160px] border-2 border-emerald-400 rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black/80 text-center">
        <p className="text-xs text-slate-400">Hold the barcode steady inside the frame</p>
      </div>
    </div>
  )
}