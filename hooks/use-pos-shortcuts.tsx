// hooks/use-pos-shortcuts.ts
"use client"

import { useEffect } from 'react'

interface POSShortcutsProps {
  onNewSale?: () => void
  onOpenCustomer?: () => void
  onOpenPayment?: () => void
  onClearCart?: () => void
  onSearch?: () => void
  onFocusSearch?: () => void
  isEnabled?: boolean
}

/**
 * Custom hook for POS keyboard shortcuts
 * Provides quick access to common POS operations
 */
export function usePOSShortcuts({
  onNewSale,
  onOpenCustomer,
  onOpenPayment,
  onClearCart,
  onSearch,
  onFocusSearch,
  isEnabled = true,
}: POSShortcutsProps) {
  useEffect(() => {
    if (!isEnabled) return

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur input fields
        if (event.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Prevent default for all our shortcuts
      const isShortcut = 
        (event.ctrlKey || event.metaKey) && 
        ['n', 'c', 'p', 'k', '/'].includes(event.key.toLowerCase())

      if (isShortcut) {
        event.preventDefault()
      }

      // Handle shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            // Ctrl/Cmd + N: New sale
            onNewSale?.()
            break
          case 'c':
            // Ctrl/Cmd + C: Open customer selector
            onOpenCustomer?.()
            break
          case 'p':
            // Ctrl/Cmd + P: Open payment modal
            onOpenPayment?.()
            break
          case 'k':
            // Ctrl/Cmd + K: Clear cart
            if (confirm('Are you sure you want to clear the cart?')) {
              onClearCart?.()
            }
            break
          case '/':
            // Ctrl/Cmd + /: Focus search
            onFocusSearch?.()
            break
        }
      } else {
        // Non-modifier shortcuts
        switch (event.key) {
          case 'F2':
            // F2: Open customer selector
            event.preventDefault()
            onOpenCustomer?.()
            break
          case 'F4':
            // F4: Open payment
            event.preventDefault()
            onOpenPayment?.()
            break
          case '/':
            // /: Focus search
            onFocusSearch?.()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [
    onNewSale,
    onOpenCustomer,
    onOpenPayment,
    onClearCart,
    onSearch,
    onFocusSearch,
    isEnabled,
  ])

  return {
    shortcuts: [
      { key: 'Ctrl/Cmd + N', description: 'New Sale' },
      { key: 'Ctrl/Cmd + C or F2', description: 'Select Customer' },
      { key: 'Ctrl/Cmd + P or F4', description: 'Process Payment' },
      { key: 'Ctrl/Cmd + K', description: 'Clear Cart' },
      { key: 'Ctrl/Cmd + / or /', description: 'Focus Search' },
      { key: 'Escape', description: 'Close Modal / Blur Input' },
    ],
  }
}

// Keyboard shortcuts help component
export function POSShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl/Cmd + N', description: 'New Sale', icon: '🆕' },
    { key: 'Ctrl/Cmd + C', description: 'Select Customer', icon: '👤' },
    { key: 'F2', description: 'Select Customer', icon: '👤' },
    { key: 'Ctrl/Cmd + P', description: 'Process Payment', icon: '💳' },
    { key: 'F4', description: 'Process Payment', icon: '💳' },
    { key: 'Ctrl/Cmd + K', description: 'Clear Cart', icon: '🗑️' },
    { key: '/', description: 'Search Products', icon: '🔍' },
    { key: 'Esc', description: 'Close/Cancel', icon: '❌' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        ⌨️ Keyboard Shortcuts
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{shortcut.icon}</span>
              <span className="text-sm text-slate-600">{shortcut.description}</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-slate-500">
        <p>💡 Tip: Use these shortcuts for faster checkout</p>
      </div>
    </div>
  )
}