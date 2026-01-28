import React from "react";
import RoleForm from "@/components/Forms/RoleForm";
import { getRoleById } from "@/actions/roles";
import { getAuthenticatedUser } from "@/config/useAuth";
import NotFound from "@/app/not-found";
import { redirect } from "next/navigation";

export default async function page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  
  // ✅ Get authenticated user
  const user = await getAuthenticatedUser();
  
  if (!user || !user.orgId) {
    redirect("/login");
  }

  const { data, success } = await getRoleById(id);
  
  if (!id || !data || !success) {
    return NotFound();
  }

  // ✅ Verify the role belongs to the user's organization
  if (data.orgId !== user.orgId) {
    console.error("❌ Role does not belong to user's organization");
    return NotFound();
  }

  return <RoleForm editingId={id} initialData={data} orgId={data.orgId} />;
}