"use client"

// ============================================================
// CREDIT TABS PAGE
// File: app/dashboard/sales/orders/components/credit-tabs-page.tsx
//
// Client shell that owns the tab state and routes the "Pay Now"
// action from DebtorsView back to the Tracker's payment dialog.
// ============================================================

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CreditCard, Users, BookOpen } from "lucide-react"
import CreditPaymentTracker from "./credit-payment-tracker"
import DebtorsView from "./debtors-view"
import LedgerView from "./ledger-view"
import type { CreditOrder, PaymentRecord } from "./credit-payment-tracker"
import type { LedgerEntry, CreditLedgerSummary, CsvRow, DebtorSummary } from "@/actions/credit-ledger"

interface CreditTabsPageProps {
  orders: CreditOrder[]
  ledgerEntries: LedgerEntry[]
  ledgerSummary: CreditLedgerSummary
  ledgerExportRows: CsvRow[]
  debtors: DebtorSummary[]
}

export default function CreditTabsPage({
  orders,
  ledgerEntries,
  ledgerSummary,
  ledgerExportRows,
  debtors,
}: CreditTabsPageProps) {
  const [activeTab, setActiveTab] = useState("tracker")

  // When "Pay Now" is clicked from the Debtors tab, switch to Tracker
  // tab and open the payment dialog for that order. We surface this via
  // a shared selectedOrderId — CreditPaymentTracker will auto-open it.
  const [pendingPayOrderId, setPendingPayOrderId] = useState<string | null>(null)

  const handleDebtorPayNow = (orderId: string) => {
    setPendingPayOrderId(orderId)
    setActiveTab("tracker")
  }

  const overdueCount  = debtors.reduce((s, d) => s + d.overdueCount, 0)
  const debtorCount   = debtors.length

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="h-10">
        <TabsTrigger value="tracker" className="gap-2 px-4">
          <CreditCard className="w-4 h-4" />
          Order Tracker
          {overdueCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {overdueCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="debtors" className="gap-2 px-4">
          <Users className="w-4 h-4" />
          Debtors
          {debtorCount > 0 && (
            <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {debtorCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="ledger" className="gap-2 px-4">
          <BookOpen className="w-4 h-4" />
          Full Ledger
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tracker" className="mt-0">
        <CreditPaymentTracker
          orders={orders}
          autoOpenOrderId={pendingPayOrderId}
          onAutoOpenHandled={() => setPendingPayOrderId(null)}
        />
      </TabsContent>

      <TabsContent value="debtors" className="mt-0">
        <DebtorsView debtors={debtors} onPayNow={handleDebtorPayNow} />
      </TabsContent>

      <TabsContent value="ledger" className="mt-0">
        <LedgerView
          entries={ledgerEntries}
          summary={ledgerSummary}
          exportRows={ledgerExportRows}
        />
      </TabsContent>
    </Tabs>
  )
}