"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { X, ZapOff, Zap, CameraOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { playBeep } from "@/lib/beep"

interface CameraBarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (value: string) => void
  rescanDelay?: number
}

const SCANNER_ELEMENT_ID = "camera-barcode-scanner-viewport"

// FIX: React 18 dev/strict-mode mounts effects twice (mount → cleanup →
// mount). Because the cleanup below stops the camera asynchronously, a
// second Html5Qrcode instance could previously get created against the same
// DOM id before the first one finished tearing down — leaving a stale
// instance holding the decode loop while the visible <video> belonged to a
// different one, so scans silently never fired. This module-level chain
// makes every start() wait for the previous instance's teardown to finish
// first, so there's only ever one instance actually driving the scan loop.
let teardownChain: Promise<void> = Promise.resolve()

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

  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onScanRef.current = onScan }, [onScan])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus("starting")

    let scanner: Html5Qrcode | null = null

    const onDecoded = (decodedText: string) => {
      const now = Date.now()
      const last = lastScanRef.current
      if (last && last.value === decodedText && now - last.time < rescanDelay) {
        return
      }
      lastScanRef.current = { value: decodedText, time: now }
      playBeep()
      onScanRef.current(decodedText)
    }

    function afterStarted() {
      if (cancelled || !scanner) return
      setStatus("ready")
      // FIX: no more applyVideoConstraints() call here at all. That was an
      // un-awaited promise whose rejection couldn't be caught by the
      // surrounding try/catch (that only works on synchronous throws) —
      // it was silently interfering with html5-qrcode's internal state
      // right after a successful start, which is what was blocking "ready"
      // from ever showing. Getting the camera open reliably matters far
      // more than the resolution bump this was trying to add.
      const caps = (scanner as any).getRunningTrackCapabilities?.()
      setTorchSupported(!!caps?.torch)
    }

    // FIX: wait for any in-flight teardown of a previous instance (e.g. from
    // a React strict-mode double-invoke) before creating a new one against
    // the same DOM id — otherwise the old instance's async stop()/clear()
    // could land after this new instance starts, tearing down the wrong one.
    const startPromise = teardownChain.then(() => {
      if (cancelled) return

      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
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
        // FIX: html5-qrcode's default decoder is a pure-JS/WASM ZXing port
        // that is built primarily for QR codes and is notoriously unreliable
        // at 1D formats (EAN/UPC/CODE128) — it will often just never fire
        // onDecoded for a real product barcode even in good lighting. This
        // opts into the browser's native BarcodeDetector API when available
        // (all Chromium based browsers, i.e. effectively every Android
        // phone), which is far more accurate for 1D codes. Falls back to the
        // JS decoder automatically where BarcodeDetector isn't supported
        // (e.g. iOS Safari).
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      } as any)
      scannerRef.current = scanner

      // FIX: back to a SINGLE key in the constraints object — html5-qrcode's
      // start() requires exactly one key ({ facingMode } or { deviceId }),
      // never both facingMode + width/height together. This was the original
      // "3 keys" error. No retry logic needed now since this is already the
      // simplest valid form.
      return scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          disableFlip: false,
          // FIX: confine decoding to the region the user actually sees
          // highlighted (matches the 280x140 overlay below) instead of the
          // full raw frame. This cuts wasted decode cycles on background
          // clutter and, for 1D codes specifically, gives the decoder a
          // tighter/more consistent crop to work with.
          qrbox: { width: 280, height: 140 },
        },
        onDecoded,
        () => {}
      )
    })
      .then(afterStarted)
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
      // FIX: this teardown is now chained onto the module-level
      // teardownChain, so the *next* mount's Html5Qrcode creation (see
      // above) will wait for this stop()/clear() to fully finish first.
      teardownChain = startPromise
        .catch(() => {})
        .finally(() => {
          if (!scanner) return
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            return scanner.stop().then(() => scanner!.clear()).catch(() => {})
          } else {
            try {
              scanner.clear()
            } catch {
              // nothing to clear — fine
            }
          }
        })
      scannerRef.current = null
    }
  }, [open, rescanDelay])

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
          <button onClick={() => onCloseRef.current()} className="p-2 rounded-full hover:bg-white/10">
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
            <button onClick={() => onCloseRef.current()} className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Close
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[280px] h-[140px] border-2 border-emerald-400 rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.45)]" />
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black/80 text-center">
        <p className="text-xs text-slate-400">Hold the barcode steady, 4–8 inches from the camera</p>
      </div>
    </div>
  )
}