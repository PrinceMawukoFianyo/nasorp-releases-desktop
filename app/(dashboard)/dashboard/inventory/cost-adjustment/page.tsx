// Target path: app/dashboard/inventory/cost-adjustment/page.tsx

import { Suspense } from "react";
import { TableLoading } from "@/components/ui/data-table";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getItemsForCostAdjustment } from "@/actions/cost-adjustment";
import { CostAdjustmentTable } from "../items/cost-adjustment-table";


export default async function CostAdjustmentPage() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title="Cost Adjustment" />}>
        <CostAdjustmentLoader orgId={orgId} />
      </Suspense>
    </div>
  );
}

async function CostAdjustmentLoader({ orgId }: { orgId: string }) {
  const res = await getItemsForCostAdjustment(orgId);
  const items = res.success ? res.data : [];

  return (
    <CostAdjustmentTable initialItems={items} />
  );
}