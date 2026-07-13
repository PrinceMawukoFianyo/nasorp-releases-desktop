// lib/beep.ts
"use client"

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function tone(freq: number, durationMs: number, type: OscillatorType = "square", volume = 0.15) {
  const ctx = getContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.value = volume
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
}

/** Classic barcode-scanner "beep" — short, high-pitched, fires the instant a code decodes */
export function playBeep() {
  tone(2000, 90)
}

/** Lower double-buzz — use when lookupByBarcode() comes back "not found" */
export function playErrorBeep() {
  tone(300, 120, "sawtooth", 0.12)
  setTimeout(() => tone(220, 160, "sawtooth", 0.12), 140)
}