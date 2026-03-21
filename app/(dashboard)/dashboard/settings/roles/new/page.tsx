// app/dashboard/settings/roles/new/page.tsx
import RoleForm                from "@/components/Forms/RoleForm";
import { getAuthenticatedUser } from "@/config/useAuth";
import { redirect }            from "next/navigation";

export default async function NewRolePage() {
  const user = await getAuthenticatedUser();
  if (!user?.orgId) redirect("/login");

  return <RoleForm orgId={user.orgId} />;
}