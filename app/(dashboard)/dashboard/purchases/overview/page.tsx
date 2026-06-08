import { Suspense } from "react";
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
    overviewData: overviewRes, // the enhanced data
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