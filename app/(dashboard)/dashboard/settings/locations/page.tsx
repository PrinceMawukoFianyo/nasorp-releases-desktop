// app/products/page.tsx
import { Suspense } from "react";

import { TableLoading } from "@/components/ui/data-table";
import ItemListing from "@/components/dashboard/items/item-listing";
import { getAuthenticatedUser } from "@/config/useAuth";
import LocationListing from "@/components/dashboard/items/location-listing";

export default async function ProductsPage() {
  const user = await getAuthenticatedUser();
  //const orgId = user.orgId;
  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title="Locations " />}>
        <LocationListing title="Org Locations" />
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