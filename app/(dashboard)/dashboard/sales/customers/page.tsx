// app/(dashboard)/dashboard/purchases/suppliers/page.tsx
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import CustomerListing from "./components/customerListing";

export default function CustomersPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner className="size-8" />
          </div>
        }
      >
        <CustomerListing title="Customers" />
      </Suspense>
    </div>
  );
}



/* import React from "react";
import { columns } from "./columns";
import DataTable from "@/components/DataTableComponents/DataTable";
import ModalTableHeader from "@/components/dashboard/Tables/ModalTableHeader";
import { getAuthenticatedUser } from "@/config/useAuth";
import { ItemFormModel } from "@/components/Forms/Inventory/ItemFormModel";
import { getOrgBriefItems } from "@/actions/items";

export default async function page() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  const res = (await getOrgBriefItems(orgId)) || [];
  const items = res.data;
  
  //console.log(items);
  return (
    <div className="p-8">
      <ModalTableHeader
        title="items"
        linkTitle="Add item"
        href="#"
        data={items}
        model="items"
        modalForm={< ItemFormModel orgId={orgId}/>}
      />
      <div className="py-8">
        <DataTable data ={items} columns ={columns} />
      </div>
    </div>
  );
}
 */