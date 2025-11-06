import DataTable from "@/components/DataTableComponents/DataTable";
import TableHeader from "@/components/dashboard/Tables/TableHeader";
import React from "react";
import { columns } from "./columns";
import { getOrgRoles } from "@/actions/roles";
import { getAuthenticatedUser } from "@/config/useAuth";

export default async function page() {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;
  
  const res = await getOrgRoles(orgId);
  const roles = res.data || [];
  
  return (
    <div className="p-8">
      <TableHeader
        title="Roles"
        model="role"
        linkTitle="Add Role"
        href="/dashboard/settings/roles/new"
        data={roles}
        showImport={false}
      />
      <DataTable columns={columns} data={roles} />
    </div>
  );
}