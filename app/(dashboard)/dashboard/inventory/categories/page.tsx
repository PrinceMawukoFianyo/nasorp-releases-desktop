import React from "react";
import { columns, type CategoryRow } from "./columns";
import DataTable from "@/components/DataTableComponents/DataTable";
import { getOrgCategories } from "@/actions/categories";
import { getCategoryInventoryStats } from "@/actions/caategory-inventory";
import ModalTableHeader from "@/components/dashboard/Tables/ModalTableHeader";
import { CategoryFormModel } from "@/components/Forms/Inventory/CategoryFormModel";
import { getAuthenticatedUser } from "@/config/useAuth";

const money = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default async function page() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  const [categories, stats] = await Promise.all([
    getOrgCategories(orgId).then((c) => c || []),
    getCategoryInventoryStats(),
  ]);

  const rows: CategoryRow[] = categories.map((c: any) => ({
    ...c,
    itemCount:  stats[c.id]?.itemCount  ?? 0,
    totalUnits: stats[c.id]?.totalUnits ?? 0,
    costValue:  stats[c.id]?.costValue  ?? 0,
  }));

  const totalValue = rows.reduce((s, r) => s + r.costValue, 0);

  return (
    <div className="p-8">
      <ModalTableHeader
        title="Categories"
        linkTitle="Add Category"
        href="#"
        data={rows}
        model="category"
        modalForm={<CategoryFormModel orgId={orgId} />}
      />
      <div className="mt-4 inline-flex items-baseline gap-2 rounded-md border bg-sky-50/70 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total inventory value (at cost):</span>
        <span className="font-semibold">{money(totalValue)}</span>
      </div>
      <div className="py-6">
        <DataTable data={rows} columns={columns} />
      </div>
    </div>
  );
}