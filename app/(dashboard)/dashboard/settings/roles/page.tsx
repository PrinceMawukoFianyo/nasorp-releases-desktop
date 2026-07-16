// app/dashboard/settings/roles/page.tsx
import DataTable   from "@/components/DataTableComponents/DataTable";
import TableHeader from "@/components/dashboard/Tables/TableHeader";
import { columns } from "./columns";
import { getOrgRoles, patchAccountingPermissions } from "@/actions/roles";
import { getAuthenticatedUser } from "@/config/useAuth";
import PatchPermissionsButton from "./PatchPermissionsButton";
import PatchPhoneScannerPermissionButton from "./PatchPhoneScannerPermissionButton";


export default async function RolesPage() {
  const user  = await getAuthenticatedUser();
  const res   = await getOrgRoles(user.orgId);
  const roles = res.data ?? [];

  return (
    <div className="p-8 space-y-6">
      <TableHeader
        title="Roles & Permissions"
        model="role"
        linkTitle="Add Role"
        href="/dashboard/settings/roles/new"
        data={roles}
        showImport={false}
      />

      {/* ── One-time patch banners ── */}
      <PatchPermissionsButton />
      <PatchPhoneScannerPermissionButton />

      <DataTable columns={columns} data={roles} />
    </div>
  );
}