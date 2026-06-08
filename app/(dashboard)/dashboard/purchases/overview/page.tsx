import { Suspense } from "react";
import { getSupplierPayables, getAPLedger, getCreditorsList } from "@/actions/supplier-payables";
import { getRecentPurchaseOrders } from "@/actions/purchase-order";
import PurchaseOverview from "./purchase-overview";

async function fetchOverviewData() {
  const [payablesRes, ledgerRes, creditorsRes, recentPOsRes] = await Promise.all([
    getSupplierPayables(),
    getAPLedger(),
    getCreditorsList(),
    getRecentPurchaseOrders(),
  ]);

  return {
    payables: payablesRes.success ? payablesRes.data ?? [] : [],
    ledger: ledgerRes.success ? ledgerRes.data : null,
    creditors: creditorsRes.success ? creditorsRes.data ?? [] : [],
    recentPOs: recentPOsRes.success ? recentPOsRes.data : [],
  };
}

export default async function PurchaseOverviewPage() {
  const data = await fetchOverviewData();

  return (
    <Suspense fallback={<div className="p-6 text-center">Loading overview...</div>}>
      <PurchaseOverview {...data} />
    </Suspense>
  );
}