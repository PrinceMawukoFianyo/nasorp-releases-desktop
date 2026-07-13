"use server";
// actions/roles.ts
// ─────────────────────────────────────────────────────────────────────────────
// All role + permission management server actions in one file.
// Includes: CRUD for roles, user-role assignment, invite helpers,
// and the one-time accounting permission patch — no separate files needed.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { RoleFormData } from "@/types/types";
import { getAllPermissions } from "@/config/permissions";
import { db } from "@/prisma/db";
import { createRoleName } from "@/lib/createRoleName";
import { UpdateUserRoleResponse } from "@/types/types";
import { getAuthenticatedUser } from "@/config/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrgRoles(orgId: string) {
  try {
    const roles = await db.role.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true } },
      },
    });
    return { success: true, data: roles };
  } catch (error) {
    console.error("getOrgRoles error:", error);
    return { success: false, error: "Failed to fetch roles", data: [] };
  }
}

export async function getRoleById(id: string) {
  try {
    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new Error("Role not found");
    return { success: true, data: role };
  } catch (error) {
    console.error("getRoleById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch role",
      data: null,
    };
  }
}

export async function createRole(data: RoleFormData) {
  try {
    const validPermissions = getAllPermissions();
    const invalid = data.permissions.filter((p) => !validPermissions.includes(p));
    if (invalid.length > 0) {
      throw new Error(`Invalid permissions: ${invalid.join(", ")}`);
    }

    const existing = await db.role.findFirst({
      where: { displayName: data.displayName, orgId: data.orgId },
    });
    if (existing) {
      throw new Error("A role with this name already exists in your organisation");
    }

    const role = await db.role.create({
      data: {
        displayName:  data.displayName,
        roleName:     createRoleName(data.displayName),
        description:  data.description,
        permissions:  data.permissions,
        orgId:        data.orgId,
      },
    });

    revalidatePath("/dashboard/settings/roles");
    return { success: true, data: role };
  } catch (error) {
    console.error("createRole error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role",
    };
  }
}

export async function updateRole(id: string, data: Partial<RoleFormData>) {
  try {
    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) throw new Error("Role not found");

    // ── Validate permissions if provided ──
    if (data.permissions !== undefined) {
      const validPermissions = getAllPermissions();
      const invalid = data.permissions.filter((p) => !validPermissions.includes(p));
      
      // Log invalid permissions for debugging
      if (invalid.length > 0) {
        console.warn("⚠️ Invalid permissions filtered out:", invalid);
        // Remove invalid permissions instead of throwing
        data.permissions = data.permissions.filter((p) => validPermissions.includes(p));
      }
    }

    if (data.displayName) {
      const conflict = await db.role.findFirst({
        where: {
          displayName: data.displayName,
          orgId: existing.orgId,
          NOT: { id },
        },
      });
      if (conflict) {
        throw new Error("A role with this name already exists in your organisation");
      }
    }

    // ── Prepare update data ──
    const updateData: any = {};

    if (data.displayName) {
      updateData.displayName = data.displayName;
      updateData.roleName = createRoleName(data.displayName);
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions;
    }

    console.log("📝 Updating role with:", updateData);

    const role = await db.role.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/settings/roles");
    revalidatePath(`/dashboard/settings/roles/update/${id}`);
    return { success: true, data: role };
  } catch (error) {
    console.error("updateRole error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function deleteRole(id: string) {
  try {
    const role = await db.role.findUnique({ where: { id } });
    if (!role) throw new Error("Role not found");

    const usersWithRole = await db.user.findMany({
      where: { orgId: role.orgId, roles: { some: { id } } },
      select: { id: true, name: true },
    });
    if (usersWithRole.length > 0) {
      throw new Error(
        `Cannot delete role — it is assigned to ${usersWithRole.length} user(s)`
      );
    }

    await db.role.delete({ where: { id } });
    revalidatePath("/dashboard/settings/roles");
    return { success: true };
  } catch (error) {
    console.error("deleteRole error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete role",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ↔ ROLE ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  roleId: string
): Promise<UpdateUserRoleResponse> {
  try {
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!existingUser) return { error: "User not found", status: 404, data: null };

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) return { error: "Role not found", status: 404, data: null };

    if (role.orgId !== existingUser.orgId) {
      return {
        error: "Role does not belong to the user's organisation",
        status: 403,
        data: null,
      };
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { roles: { set: [], connect: { id: roleId } } },
      include: { roles: true },
    });

    revalidatePath("/dashboard/settings/users");
    revalidatePath(`/dashboard/settings/users/${userId}`);
    return { error: null, status: 200, data: updatedUser };
  } catch (error) {
    console.error("updateUserRole error:", error);
    return { error: "Failed to update user role", status: 500, data: null };
  }
}

export async function getUsersByRole(roleId: string, orgId?: string) {
  try {
    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error("Role not found");

    const users = await db.user.findMany({
      where: {
        orgId: orgId || role.orgId,
        roles: { some: { id: roleId } },
      },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("getUsersByRole error:", error);
    return { success: false, error: "Failed to fetch users", data: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function isRoleNameUnique(
  displayName: string,
  orgId: string,
  excludeRoleId?: string
): Promise<boolean> {
  try {
    const found = await db.role.findFirst({
      where: {
        displayName,
        orgId,
        ...(excludeRoleId && { NOT: { id: excludeRoleId } }),
      },
    });
    return !found;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITES  (merged from actions/invites.ts — no separate file needed)
// ─────────────────────────────────────────────────────────────────────────────

export async function getInviteByEmail(email: string, orgId: string) {
  try {
    return await db.invite.findFirst({ where: { email, orgId } });
  } catch (error) {
    console.error("getInviteByEmail error:", error);
    return null;
  }
}

export async function validateInvite(inviteId: string) {
  try {
    const invite = await db.invite.findUnique({ where: { id: inviteId } });
    if (!invite)        return { valid: false, error: "Invitation not found" };
    if (invite.status)  return { valid: false, error: "Invitation already used" };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (invite.createdAt < sevenDaysAgo) {
      return { valid: false, error: "Invitation expired" };
    }
    return { valid: true, invite };
  } catch (error) {
    console.error("validateInvite error:", error);
    return { valid: false, error: "Failed to validate invitation" };
  }
}

export async function updateInviteStatus(inviteId: string, status: boolean) {
  try {
    const updated = await db.invite.update({
      where: { id: inviteId },
      data: { status, updatedAt: new Date() },
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateInviteStatus error:", error);
    return { success: false, error: "Failed to update invitation" };
  }
}

export async function resendInvite(inviteId: string) {
  try {
    const invite = await db.invite.findUnique({ where: { id: inviteId } });
    if (!invite) return { success: false, error: "Invitation not found" };
    // TODO: trigger your email send here
    return { success: true, message: "Invitation resent successfully" };
  } catch (error) {
    console.error("resendInvite error:", error);
    return { success: false, error: "Failed to resend invitation" };
  }
}

export async function deleteInvite(inviteId: string) {
  try {
    await db.invite.delete({ where: { id: inviteId } });
    return { success: true, message: "Invitation deleted successfully" };
  } catch (error) {
    console.error("deleteInvite error:", error);
    return { success: false, error: "Failed to delete invitation" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME PATCH: add accounting permissions to all existing DB roles
// Call from the roles page via a server action button — no separate file needed.
// ─────────────────────────────────────────────────────────────────────────────

export async function patchAccountingPermissions() {
  try {
    const user = await getAuthenticatedUser();

    const roles = await db.role.findMany({
      where: { orgId: user.orgId },
      select: { id: true, roleName: true, displayName: true, permissions: true },
    });

    if (!roles.length) {
      return { success: false, error: "No roles found for this organisation" };
    }

    const results: { role: string; added: string[]; skipped: string[] }[] = [];

    for (const role of roles) {
      const existing = role.permissions as string[];

      const isAdmin   = role.roleName === "admin"   || role.displayName.toLowerCase().includes("admin");
      const isManager = role.roleName === "manager" || role.displayName.toLowerCase().includes("manager");

      const desired: string[] = isAdmin
        ? ["accounting.create", "accounting.read", "accounting.update", "accounting.delete", "accounting.payroll", "accounting.admin"]
        : isManager
        ? ["accounting.read", "accounting.update", "accounting.payroll"]
        : ["accounting.read"];

      const missing = desired.filter((p) => !existing.includes(p));
      const skipped = desired.filter((p) =>  existing.includes(p));

      if (missing.length > 0) {
        await db.role.update({
          where: { id: role.id },
          data:  { permissions: [...existing, ...missing] },
        });
      }

      results.push({ role: role.displayName, added: missing, skipped });
    }

    revalidatePath("/dashboard/settings/roles");
    return { success: true, results };
  } catch (error) {
    console.error("patchAccountingPermissions error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}