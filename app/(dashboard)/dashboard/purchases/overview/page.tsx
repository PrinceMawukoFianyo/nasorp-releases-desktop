import { Suspense } from "react";
import { withOfflineFallback } from "@/lib/with-offline-fallback";
import { OfflineNotice } from "@/components/OfflineNotice";
import { getSupplierPayables, getCreditorsList } from "@/actions/supplier-payables";
import { getRecentPurchaseOrders } from "@/actions/purchase-order";
import { getPurchaseOverviewData } from "@/actions/purchase-overview";
import PurchaseOverview from "./purchase-overview";

async function fetchOverviewData() {
  const [payablesRes, creditorsRes, recentPOsRes, overviewRes] = await Promise.all([
    getSupplierPayables(),
    getCreditorsList(),
    getRecentPurchaseOrders(),
    getPurchaseOverviewData(),
  ]);

  return {
    payables: payablesRes.success ? payablesRes.data ?? [] : [],
    creditors: creditorsRes.success ? creditorsRes.data ?? [] : [],
    recentPOs: recentPOsRes.success ? recentPOsRes.data : [],
    overviewData: overviewRes,
  };
}

export default async function PurchaseOverviewPage() {
  const { data, offline } = await withOfflineFallback(fetchOverviewData, {
    payables: [], creditors: [], recentPOs: [], overviewData: null,
  });
  if (offline) return <OfflineNotice feature="Purchase Overview" />;

  return (
    <Suspense fallback={<div className="p-6 text-center">Loading overview...</div>}>
      <PurchaseOverview {...data} />
    </Suspense>
  );
}