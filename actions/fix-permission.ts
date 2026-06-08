// actions/fix-permissions.ts
"use server";

import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { sidebarLinks } from "@/config/sidebar";

export async function grantFullAdminPermissions() {
  const user = await getAuthenticatedUser();
  if (!user?.orgId) return { error: "Not authenticated" };
  if (!user?.id) return { error: "User not found" };

  // Get the current user with their roles
  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    include: { roles: true }
  });

  if (!currentUser || currentUser.roles.length === 0) {
    return { error: "User has no roles assigned" };
  }

  // Use the first role of the current user (your admin role)
  const adminRole = currentUser.roles[0];
  console.log(`Found role: ${adminRole.displayName} (${adminRole.roleName})`);

  // Collect all permissions from sidebarLinks
  const allPerms = new Set<string>();
  for (const link of sidebarLinks) {
    allPerms.add(link.permission);
    link.dropdownMenu?.forEach(item => allPerms.add(item.permission));
  }

  // Merge existing permissions with new ones
  const currentPerms = (adminRole.permissions as string[]) || [];
  const merged = Array.from(new Set([...currentPerms, ...allPerms]));

  // Update the role
  await db.role.update({
    where: { id: adminRole.id },
    data: { permissions: merged }
  });

  return { 
    success: true, 
    added: merged.length - currentPerms.length,
    roleName: adminRole.displayName
  };
}