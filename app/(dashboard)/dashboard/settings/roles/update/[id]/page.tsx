// app/dashboard/settings/roles/update/[id]/page.tsx
//
// Path matches the editEndpoint in columns.tsx:
//   editEndpoint={`settings/roles/update/${role.id}`}
// ActionColumn prepends /dashboard/ → /dashboard/settings/roles/update/<id>

import RoleForm                from "@/components/Forms/RoleForm";
import { getRoleById }         from "@/actions/roles";
import { getAuthenticatedUser } from "@/config/useAuth";
import NotFound                from "@/app/not-found";
import { redirect }            from "next/navigation";

export default async function UpdateRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthenticatedUser();
  if (!user?.orgId) redirect("/login");

  const { data, success } = await getRoleById(id);

  // Role not found or fetch failed
  if (!id || !data || !success) return NotFound();

  // Role belongs to a different org — deny access
  if (data.orgId !== user.orgId) {
    console.error("❌ Role does not belong to user's organisation");
    return NotFound();
  }

  return <RoleForm editingId={id} initialData={data} orgId={data.orgId} />;
}