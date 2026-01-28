import { getUserById } from "@/actions/users";
import { getAuthenticatedUser } from "@/config/useAuth";
import { getOrgRoles } from "@/actions/roles";
import { getOrgLocations } from "@/actions/locations";
import { notFound } from "next/navigation";
import { UserUpdateForm } from "@/components/Forms/user/UserUpdateForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft, User } from "lucide-react";
import Link from "next/link";

export default async function UserUpdatePage({
  params,
}: {
  params: { id: string };
}) {
  const authenticatedUser = await getAuthenticatedUser();
  const orgId = authenticatedUser.orgId;

  // Fetch user data
  const user = await getUserById(params.id);

  if (!user || user.orgId !== orgId) {
    notFound();
  }

  // Fetch roles and locations for the form
  const res = await getOrgRoles(orgId);
  const rolesData = res.data || [];
  const roles = rolesData.map((role) => ({
    label: role.displayName,
    value: role.id,
  }));

  const orgLocations = await getOrgLocations();
  const locations = orgLocations.map((loc) => ({
    label: loc.name,
    value: loc.id,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb & Navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4 -ml-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          >
            <Link href="/dashboard/settings/users" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Users
            </Link>
          </Button>
          
          {/* Page Header */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-500/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Edit User
                </h1>
                <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
                  Update user information, roles, and permissions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 sm:p-8">
            <UserUpdateForm
              user={user}
              roles={roles}
              locations={locations}
              orgId={orgId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}