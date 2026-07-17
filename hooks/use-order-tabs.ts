"use client"
// hooks/use-order-tabs.ts
//
// Replaces a single `cart` state with one tab per active order: the
// register's own "Walk-in Customer" tab, plus one auto-created tab per
// connected staff phone. Scans from a given phone always go to ITS tab,
// regardless of which tab is currently on screen.
//
// Generic over your actual cart-line type — plug in whatever shape your
// existing cart already uses.

import { useState, useCallback, useMemo, useRef } from "react"

export type OrderTab<TCartLine> = {
  id: string
  label: string
  sessionId: string | null // null = the register's own walk-in tab
  cart: TCartLine[]
  customerId: string | null
  createdAt: number
}

export const WALKIN_TAB_ID = "walkin"

export function useOrderTabs<TCartLine>() {
  const [tabs, setTabs] = useState<OrderTab<TCartLine>[]>([
    { id: WALKIN_TAB_ID, label: "Walk-in Customer", sessionId: null, cart: [], customerId: null, createdAt: Date.now() },
  ])
  const [activeTabId, setActiveTabId] = useState(WALKIN_TAB_ID)

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  )

  // Drop-in replacement for your old `setCart` — operates on whichever tab
  // is currently active on screen.
  const setActiveCart = useCallback(
    (updater: TCartLine[] | ((prev: TCartLine[]) => TCartLine[])) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t
          const nextCart = typeof updater === "function" ? (updater as (p: TCartLine[]) => TCartLine[])(t.cart) : updater
          return { ...t, cart: nextCart }
        })
      )
    },
    [activeTabId]
  )

  const setActiveCustomer = useCallback(
    (customerId: string | null) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, customerId } : t)))
    },
    [activeTabId]
  )

  // Called once, the moment a staff phone actually connects (not when the
  // pairing code is merely generated) — creates its dedicated tab.
  const createSessionTab = useCallback((sessionId: string, label: string) => {
    setTabs((prev) => {
      if (prev.some((t) => t.sessionId === sessionId)) return prev
      return [
        ...prev,
        { id: sessionId, label: `${label}'s order`, sessionId, cart: [], customerId: null, createdAt: Date.now() },
      ]
    })
  }, [])

  // Route an incoming scan to the tab owned by that session — independent
  // of whatever tab happens to be visible right now. `updater` is your
  // existing "add scanned item to cart" logic (dedupe/increment quantity
  // etc.), same shape as setActiveCart's functional updates.
  const addToSessionCart = useCallback(
    (sessionId: string, updater: (cart: TCartLine[]) => TCartLine[]) => {
      setTabs((prev) =>
        prev.map((t) => (t.sessionId === sessionId ? { ...t, cart: updater(t.cart) } : t))
      )
    },
    []
  )

  const closeTab = useCallback((tabId: string) => {
    if (tabId === WALKIN_TAB_ID) return // the register's own tab is permanent
    setTabs((prev) => prev.filter((t) => t.id !== tabId))
    setActiveTabId((prev) => (prev === tabId ? WALKIN_TAB_ID : prev))
  }, [])

  // mode "merge": produces one new combined tab, removes the originals.
  // mode "batch": doesn't touch state at all — the caller just prints each
  // selected tab's receipt in turn, keeping them as separate orders.
  const combineTabs = useCallback((tabIds: string[], mode: "merge" | "batch") => {
    if (mode === "batch") return
    const newId = `combined-${Date.now()}`
    setTabs((prev) => {
      const toCombine = prev.filter((t) => tabIds.includes(t.id));
      if (toCombine.length < 2) return prev;
      const rest = prev.filter((t) => !tabIds.includes(t.id));
      const combined: OrderTab<TCartLine> = {
        id: newId,
        label: toCombine.map((t) => t.label).join(" + "),
        sessionId: null,
        cart: toCombine.flatMap((t) => t.cart),
        customerId: toCombine.find((t) => t.customerId)?.customerId ?? null,
        createdAt: Date.now(),
      };
      return [...rest, combined];
    })
    setActiveTabId(newId)
  }, [])

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    setActiveCart,
    setActiveCustomer,
    createSessionTab,
    addToSessionCart,
    closeTab,
    combineTabs,
  }
}