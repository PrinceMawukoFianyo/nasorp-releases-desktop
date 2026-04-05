"use client"

// ============================================================
// SUPPLIER TABS PAGE
// File: app/dashboard/purchases/payables/components/supplier-tabs-page.tsx
//
// Client shell for AP — mirrors credit-tabs-page.tsx.
// Routes "Pay Now" from CreditorsView back to the tracker.
// ============================================================

import { useState }    from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CreditCard, Building2, BookOpen } from "lucide-react"
import SupplierPaymentTracker from "./supplier-payment-tracker"
import CreditorsView          from "./creditors-view"
import APLedgerView           from "./ap-ledger-view"
import type { SupplierPayable }                         from "@/actions/supplier-payables"
import type { APLedgerEntry, APLedgerSummary, APCsvRow, CreditorSummary } from "@/actions/supplier-payables"

interface SupplierTabsPageProps {
  payables:         SupplierPayable[]
  ledgerEntries:    APLedgerEntry[]
  ledgerSummary:    APLedgerSummary
  ledgerExportRows: APCsvRow[]
  creditors:        CreditorSummary[]
}

export default function SupplierTabsPage({
  payables,
  ledgerEntries,
  ledgerSummary,
  ledgerExportRows,
  creditors,
}: SupplierTabsPageProps) {
  const [activeTab,          setActiveTab]          = useState("tracker")
  const [pendingPayPayableId, setPendingPayPayableId] = useState<string | null>(null)

  // When "Pay Now" is clicked in Creditors tab, switch to Tracker and open dialog
  const handleCreditorPayNow = (payableId: string) => {
    setPendingPayPayableId(payableId)
    setActiveTab("tracker")
  }

  const overdueCount  = creditors.reduce((s, c) => s + c.overdueCount, 0)
  const creditorCount = creditors.length

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="h-10">
        <TabsTrigger value="tracker" className="gap-2 px-4">
          <CreditCard className="w-4 h-4" />
          Payables Tracker
          {overdueCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {overdueCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="creditors" className="gap-2 px-4">
          <Building2 className="w-4 h-4" />
          Creditors
          {creditorCount > 0 && (
            <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {creditorCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="ledger" className="gap-2 px-4">
          <BookOpen className="w-4 h-4" />
          Full AP Ledger
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tracker" className="mt-0">
        <SupplierPaymentTracker
          payables={payables}
          autoOpenPayableId={pendingPayPayableId}
          onAutoOpenHandled={() => setPendingPayPayableId(null)}
        />
      </TabsContent>

      <TabsContent value="creditors" className="mt-0">
        <CreditorsView creditors={creditors} onPayNow={handleCreditorPayNow} />
      </TabsContent>

      <TabsContent value="ledger" className="mt-0">
        <APLedgerView
          entries={ledgerEntries}
          summary={ledgerSummary}
          exportRows={ledgerExportRows}
        />
      </TabsContent>
    </Tabs>
  )
}