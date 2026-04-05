// app/dashboard/purchases/payables/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server page for Accounts Payable — mirrors the credit orders page.
// Fetches payables, ledger, and creditors in parallel then hydrates
// the client SupplierTabsPage component.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }            from "react"
import { getSupplierPayables, getAPLedger, getCreditorsList } from "@/actions/supplier-payables"
import SupplierTabsPage        from "./components/supplier-tabs-page"

function APLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold text-lg mx-auto">
          AP
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading accounts payable…</p>
      </div>
    </div>
  )
}

export default async function SupplierPayablesPage() {
  const [payablesRes, ledgerRes, creditorsRes] = await Promise.allSettled([
    getSupplierPayables(),
    getAPLedger(),
    getCreditorsList(),
  ])

  const payables  = payablesRes.status  === "fulfilled" && payablesRes.value.success  ? payablesRes.value.data  ?? [] : []
  const ledger    = ledgerRes.status    === "fulfilled" && ledgerRes.value.success    ? ledgerRes.value.data        : null
  const creditors = creditorsRes.status === "fulfilled" && creditorsRes.value.success ? creditorsRes.value.data ?? [] : []

  const emptyLedgerSummary = {
    totalPayables: 0, totalPaid: 0, totalOutstanding: 0, totalCancelled: 0,
    activeCreditors: 0, overdueCount: 0, paidCount: 0, partialCount: 0, unpaidCount: 0,
  }

  return (
    <Suspense fallback={<APLoading />}>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payables</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track what you owe suppliers, record payments, and view full AP history.
          </p>
        </div>

        <SupplierTabsPage
          payables={payables}
          ledgerEntries={ledger?.entries ?? []}
          ledgerSummary={ledger?.summary ?? emptyLedgerSummary}
          ledgerExportRows={ledger?.exportRows ?? []}
          creditors={creditors}
        />
      </div>
    </Suspense>
  )
}