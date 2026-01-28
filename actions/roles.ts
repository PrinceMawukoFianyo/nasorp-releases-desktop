"use server";

import { revalidatePath } from "next/cache";
import { RoleFormData } from "@/types/types";
import { getAllPermissions, isValidPermission } from "@/config/permissions";
import { db } from "@/prisma/db";
import { createRoleName } from "@/lib/createRoleName";
import { UpdateUserRoleResponse } from "@/types/types";

export async function updateUserRole(
  userId: string,
  roleId: string
): Promise<UpdateUserRoleResponse> {
  try {
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!existingUser) {
      return {
        error: "User not found",
        status: 404,
        data: null,
      };
    }

    // Check if role exists
    const role = await db.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return {
        error: "Role not found",
        status: 404,
        data: null,
      };
    }

    // ✅ FIXED: Verify that the role belongs to the same organization as the user
    if (role.orgId !== existingUser.orgId) {
      return {
        error: "Role does not belong to the user's organization",
        status: 403,
        data: null,
      };
    }

    // Update user's roles
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: [], // First clear existing roles
          connect: { id: roleId }, // Then connect new role
        },
      },
      include: {
        roles: true,
      },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${userId}`);

    return {
      error: null,
      status: 200,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      error: "Failed to update user role",
      status: 500,
      data: null,
    };
  }
}

export async function createRole(data: RoleFormData) {
  try {
    // Validate permissions
    const validPermissions = getAllPermissions();
    const invalidPermissions = data.permissions.filter(
      (permission) => !validPermissions.includes(permission)
    );

    if (invalidPermissions.length > 0) {
      throw new Error(
        `Invalid permissions detected: ${invalidPermissions.join(", ")}`
      );
    }

    // ✅ FIXED: Check if role with same name exists IN THIS ORGANIZATION
    const existingRole = await db.role.findFirst({
      where: {
        displayName: data.displayName,
        orgId: data.orgId,  // Search within the organization
      },
    });

    if (existingRole) {
      throw new Error("A role with this name already exists in your organization");
    }

    // Create role with permissions
    const role = await db.role.create({
      data: {
        displayName: data.displayName,
        roleName: createRoleName(data.displayName),
        description: data.description,
        permissions: data.permissions,
        orgId: data.orgId,
      },
    });

    revalidatePath("/dashboard/users/roles");
    return { success: true, data: role };
  } catch (error) {
    console.error("Error creating role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role",
    };
  }
}

export async function updateRole(id: string, data: Partial<RoleFormData>) {
  try {
    // ✅ FIXED: Get the existing role first to verify orgId
    const existingRole = await db.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new Error("Role not found");
    }

    // Validate permissions if they're being updated
    if (data.permissions) {
      const validPermissions = getAllPermissions();
      const invalidPermissions = data.permissions.filter(
        (permission) => !validPermissions.includes(permission)
      );

      if (invalidPermissions.length > 0) {
        throw new Error(
          `Invalid permissions detected: ${invalidPermissions.join(", ")}`
        );
      }
    }

    // ✅ FIXED: Check if new name conflicts with existing role IN THE SAME ORGANIZATION
    if (data.displayName) {
      const conflictingRole = await db.role.findFirst({
        where: {
          displayName: data.displayName,
          orgId: existingRole.orgId,  // Search within the organization
          NOT: {
            id: id,
          },
        },
      });

      if (conflictingRole) {
        throw new Error("A role with this name already exists in your organization");
      }
    }

    // Update role
    const role = await db.role.update({
      where: { id },
      data: {
        ...(data.displayName && {
          displayName: data.displayName,
          roleName: createRoleName(data.displayName),
        }),
        ...(data.description && { description: data.description }),
        ...(data.permissions && { permissions: data.permissions }),
      },
    });

    revalidatePath("/dashboard/users/roles");
    return { success: true, data: role };
  } catch (error) {
    console.error("Error updating role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function deleteRole(id: string) {
  try {
    // ✅ FIXED: Get the role first to ensure we're checking users in the same organization
    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    // Check if role is assigned to any users IN THE SAME ORGANIZATION
    const usersWithRole = await db.user.findMany({
      where: {
        orgId: role.orgId,  // Check within the organization
        roles: {
          some: {
            id: id,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (usersWithRole.length > 0) {
      throw new Error(
        `Cannot delete role as it is assigned to ${usersWithRole.length} user(s)`
      );
    }

    // Delete role
    await db.role.delete({
      where: { id },
    });
    
    revalidatePath("/dashboard/users/roles");
    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete role",
    };
  }
}

export async function getOrgRoles(orgId: string) {
  try {
    const roles = await db.role.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        orgId,
      },
      include: {
        _count: {
          select: {
            users: true,  // Include count of users with this role
          },
        },
      },
    });
    return { success: true, data: roles };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return {
      success: false,
      error: "Failed to fetch roles",
      data: [],
    };
  }
}

export async function getRoleById(id: string) {
  try {
    const role = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    return { success: true, data: role };
  } catch (error) {
    console.error("Error fetching role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch role",
    };
  }
}

// ✅ FIXED: Helper function to get users by role within an organization
export async function getUsersByRole(roleId: string, orgId?: string) {
  try {
    const role = await db.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    const users = await db.user.findMany({
      where: {
        orgId: orgId || role.orgId,  // Use provided orgId or role's orgId
        roles: {
          some: {
            id: roleId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users by role:", error);
    return {
      success: false,
      error: "Failed to fetch users",
      data: [],
    };
  }
}

// ✅ NEW: Helper function to check if a role name is unique within an organization
export async function isRoleNameUnique(
  displayName: string,
  orgId: string,
  excludeRoleId?: string
): Promise<boolean> {
  try {
    const existingRole = await db.role.findFirst({
      where: {
        displayName,
        orgId,
        ...(excludeRoleId && {
          NOT: {
            id: excludeRoleId,
          },
        }),
      },
    });

    return !existingRole;
  } catch (error) {
    console.error("Error checking role name uniqueness:", error);
    return false;
  }
}