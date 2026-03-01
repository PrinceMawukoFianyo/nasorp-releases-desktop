"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * useBarcodeScanner
 *
 * Listens globally for barcode scanner input.
 * Scanners type characters very fast (< 50ms apart) then send Enter.
 * Regular keyboard typing is slower — so we time the gaps to tell them apart.
 *
 * Usage:
 *   useBarcodeScanner({ onScan: (value) => addToCart(value) })
 *
 * Options:
 *   onScan        — called with the full scanned string when Enter is received
 *   minLength     — ignore scans shorter than this (default: 3)
 *   maxGap        — max ms between chars to count as scanner input (default: 50)
 *   enabled       — turn the hook on/off (default: true)
 *   ignoreInputs  — don't fire when user is typing in an <input> or <textarea>
 *                   set false if your POS has a dedicated hidden scan field
 */

interface UseBarcodeScannnerOptions {
  onScan: (value: string) => void
  minLength?: number
  maxGap?: number
  enabled?: boolean
  ignoreInputs?: boolean
}

export function useBarcodeScanner({
  onScan,
  minLength   = 3,
  maxGap      = 50,
  enabled     = true,
  ignoreInputs = true,
}: UseBarcodeScannnerOptions) {
  const buffer    = useRef<string>("")
  const lastTime  = useRef<number>(0)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const value = buffer.current.trim()
    buffer.current = ""
    lastTime.current = 0
    if (value.length >= minLength) {
      onScan(value)
    }
  }, [onScan, minLength])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input / textarea / select / contenteditable — skip
      if (ignoreInputs) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        const isEditable = (e.target as HTMLElement)?.isContentEditable
        if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) {
          return
        }
      }

      // Ignore modifier-key-only events
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return
      }

      const now = Date.now()

      // If the gap since last keystroke is too large — this is manual typing, reset
      if (lastTime.current && now - lastTime.current > maxGap) {
        buffer.current = ""
      }
      lastTime.current = now

      // Clear the auto-flush timer
      if (timerRef.current) clearTimeout(timerRef.current)

      if (e.key === "Enter") {
        e.preventDefault()
        flush()
        return
      }

      // Tab is also used as a scanner suffix on some devices
      if (e.key === "Tab") {
        e.preventDefault()
        flush()
        return
      }

      // Only collect printable single characters
      if (e.key.length === 1) {
        buffer.current += e.key
      }

      // Auto-flush after maxGap ms of silence (catches scanners without suffix)
      timerRef.current = setTimeout(() => {
        if (buffer.current.trim().length >= minLength) {
          flush()
        } else {
          buffer.current = ""
        }
      }, maxGap * 3)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, ignoreInputs, maxGap, minLength, flush])
}