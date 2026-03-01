'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ScanLine, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PosBarcodeScanResult {
  barcode: string
  timestamp: number
  quantity?: number
}

export interface PosBarcodeScannerProps {
  onScan: (result: PosBarcodeScanResult) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

/**
 * POS Barcode Scanner Component
 * Handles barcode input with real-time feedback
 * Supports both hardware scanners and manual input
 */
export function PosBarcodeScannerInput({
  onScan,
  disabled = false,
  className,
  placeholder = 'Scan barcode or enter manually...',
}: PosBarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = useCallback((barcode: string) => {
    if (!barcode.trim()) return

    setIsScanning(true)
    setLastScan(barcode)

    // Simulate processing time
    setTimeout(() => {
      onScan({
        barcode: barcode.trim(),
        timestamp: Date.now(),
      })
      setIsScanning(false)
      if (inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.focus()
      }
    }, 300)
  }, [onScan])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan(e.currentTarget.value)
    }
  }

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <div
          className={cn(
            'relative flex items-center px-4 py-3 rounded-xl',
            'border-2 transition-smooth',
            'bg-slate-900/40 backdrop-blur-md',
            isFocused
              ? 'border-blue-500/50 ring-2 ring-blue-500/20 shadow-glow'
              : 'border-slate-700/40',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <ScanLine className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || isScanning}
            className={cn(
              'flex-1 bg-transparent outline-none text-white placeholder-slate-500',
              'pl-8 text-sm font-medium',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
          {isScanning && <Loader className="absolute right-4 h-5 w-5 text-blue-400 animate-spin" />}
        </div>
      </div>

      {/* Status indicator */}
      {lastScan && !isScanning && (
        <div className="animate-fade-in px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-300">
            Last scan: <span className="font-mono">{lastScan}</span>
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Hook to manage POS barcode scanner state
 */
export function usePosScanner() {
  const [scans, setScans] = useState<PosBarcodeScanResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const addScan = useCallback((result: PosBarcodeScanResult) => {
    setScans((prev) => [result, ...prev])
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearScans = useCallback(() => {
    setScans([])
  }, [])

  return {
    scans,
    error,
    addScan,
    clearError,
    clearScans,
    lastScan: scans[0] || null,
  }
}

/**
 * Scan history display component
 */
export function ScanHistoryPanel({
  scans,
  className,
}: {
  scans: PosBarcodeScanResult[]
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between px-1 py-2">
        <h3 className="text-sm font-semibold text-slate-300">Scan History</h3>
        {scans.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium">
            {scans.length} items
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">No scans yet</p>
          </div>
        ) : (
          scans.map((scan, idx) => (
            <div
              key={`${scan.barcode}-${scan.timestamp}`}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg',
                'bg-slate-900/30 border border-slate-700/30',
                'hover:bg-slate-900/50 transition-smooth',
                idx % 2 === 0 && 'bg-slate-800/20'
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-300 truncate">{scan.barcode}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(scan.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {scan.quantity && (
                <span className="text-xs font-semibold text-blue-300 ml-2 flex-shrink-0">
                  ×{scan.quantity}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
