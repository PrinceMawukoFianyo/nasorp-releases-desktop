import RoleForm from "@/components/Forms/RoleForm";
import { getAuthenticatedUser } from "@/config/useAuth";
import { redirect } from "next/navigation";

export default async function page() {
  // ✅ Get orgId from authenticated user instead of searchParams
  const user = await getAuthenticatedUser();
  
  if (!user || !user.orgId) {
    redirect("/login");
  }

  const orgId = user.orgId;
  
  console.log("✅ Creating role for orgId:", orgId);

  return <RoleForm orgId={orgId} />;
}