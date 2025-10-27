import React from "react";
import { columns } from "./columns";
import DataTable from "@/components/DataTableComponents/DataTable";
import ModalTableHeader from "@/components/dashboard/Tables/ModalTableHeader";
import { getAuthenticatedUser } from "@/config/useAuth";
import { ItemFormModel } from "@/components/Forms/Inventory/ItemFormModel";
import { getOrgBriefItems} from "@/actions/items";

export default async function page() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  const items = (await getOrgBriefItems(orgId)) || [];
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
        <DataTable data={items} columns ={columns} />
      </div>
    </div>
  );
}
