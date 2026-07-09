"use client";

import { Card, CardContent } from "@/components/ui/card";
import FormHeader from "./FormHeader";
import { useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { RoleFormData } from "@/types/types";
import toast from "react-hot-toast";
import { Role } from "@prisma/client";
import FormFooter from "./FormFooter";
import TextInput from "../FormInputs/TextInput";
import { Checkbox } from "@/components/ui/checkbox";
import { createRole, updateRole } from "@/actions/roles";
import { sidebarLinks } from "@/config/sidebar";

type RoleFormProps = {
  editingId?: string;
  initialData?: Role | null;
  orgId: string;
};

// ── Build permission groups from sidebar ──────────────────────────────────
function buildPermissionGroups() {
  return sidebarLinks
    .filter((link) => link.dropdown && link.dropdownMenu && link.dropdownMenu.length > 0)
    .map((link) => ({
      moduleTitle: link.title,
      motherPermission: link.permission,
      childPermissions: link.dropdownMenu!.map((item) => item.permission),
    }));
}

export default function RoleForm({ orgId, editingId, initialData }: RoleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const groups = useMemo(() => buildPermissionGroups(), []);

  // All valid permissions for filtering
  const allValidPermissions = useMemo(() => {
    const perms = new Set<string>();
    groups.forEach((g) => {
      perms.add(g.motherPermission);
      g.childPermissions.forEach((p) => perms.add(p));
    });
    return Array.from(perms);
  }, [groups]);

  // ── React Hook Form ──
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<RoleFormData>({
    defaultValues: {
      displayName: initialData?.displayName || "",
      description: initialData?.description || "",
      permissions: initialData?.permissions || [],
      orgId: orgId,
    },
  });

  const selectedPermissions = watch("permissions") || [];

  // ── Helpers ──
  const isSelected = (perm: string) => selectedPermissions.includes(perm);

  const togglePermission = (perm: string) => {
    const current = new Set(selectedPermissions);
    if (current.has(perm)) {
      current.delete(perm);
    } else {
      current.add(perm);
    }
    setValue("permissions", Array.from(current));
  };

  const toggleGroup = (mother: string, children: string[]) => {
    const current = new Set(selectedPermissions);
    const allChildrenSelected = children.every((child) => current.has(child));

    if (allChildrenSelected) {
      current.delete(mother);
      children.forEach((child) => current.delete(child));
    } else {
      current.add(mother);
      children.forEach((child) => current.add(child));
    }
    setValue("permissions", Array.from(current));
  };

  // ── Save ──
  async function saveRole(data: RoleFormData) {
    try {
      setLoading(true);

      // ── CRITICAL FIX: parse permissions from hidden input ──
      let permissions: string[] = [];
      if (typeof data.permissions === "string") {
        try {
          permissions = JSON.parse(data.permissions);
        } catch {
          permissions = [];
        }
      } else if (Array.isArray(data.permissions)) {
        permissions = data.permissions;
      }

      // Fallback: if still empty, use the current selected state
      if (permissions.length === 0) {
        permissions = getValues("permissions") || [];
      }

      // Filter to only valid sidebar permissions
      const cleanPermissions = permissions.filter((p) => allValidPermissions.includes(p));

      const roleData: RoleFormData = {
        displayName: data.displayName,
        description: data.description,
        permissions: cleanPermissions,
        orgId: orgId,
      };

      const result = editingId
        ? await updateRole(editingId, roleData)
        : await createRole(roleData);

      if (!result.success) {
        toast.error(result.error || "An error occurred while saving the role");
        return;
      }

      toast.success(
        editingId ? "Role updated successfully!" : "Role created successfully!"
      );
      router.push("/dashboard/settings/roles");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong!");
      console.error("Error saving role:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(saveRole)} className="h-full">
      <FormHeader
        href="/roles"
        title="Role"
        parent="settings"
        editingId={editingId}
        loading={loading}
      />

      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Basic Role Information */}
        <Card>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3 pt-4 grid-cols-1 md:grid-cols-2">
                <TextInput
                  register={register}
                  errors={errors}
                  label="Role Name"
                  name="displayName"
                />
                <TextInput
                  register={register}
                  errors={errors}
                  label="Role Description"
                  name="description"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Section */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-medium mt-6 mb-6">
              Select Permissions the User will have access
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map((group) => {
                const motherChecked = isSelected(group.motherPermission);
                const allChildrenSelected = group.childPermissions.every((child) =>
                  isSelected(child)
                );
                const someChildrenSelected = group.childPermissions.some((child) =>
                  isSelected(child)
                );
                const motherIndeterminate = someChildrenSelected && !allChildrenSelected;

                const checkboxRef = useRef<HTMLInputElement>(null);
                useEffect(() => {
                  if (checkboxRef.current) {
                    checkboxRef.current.indeterminate = motherIndeterminate;
                  }
                }, [motherIndeterminate]);

                return (
                  <div
                    key={group.motherPermission}
                    className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 space-y-2">
                      {/* Mother checkbox */}
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">
                          {group.moduleTitle}
                        </span>
                        <input
                          type="checkbox"
                          ref={checkboxRef}
                          checked={motherChecked}
                          onChange={() =>
                            toggleGroup(group.motherPermission, group.childPermissions)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>

                      {/* Children */}
                      <div className="ml-2 space-y-1">
                        {group.childPermissions.map((child) => (
                          <div key={child} className="flex items-center gap-2">
                            <Checkbox
                              id={child}
                              checked={isSelected(child)}
                              onCheckedChange={() => togglePermission(child)}
                            />
                            <label
                              htmlFor={child}
                              className="text-sm cursor-pointer select-none"
                            >
                              {child.split(".").pop()?.replace(/_/g, " ") || child}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── HIDDEN INPUT – stores permissions as JSON string ── */}
            <input
              type="hidden"
              {...register("permissions")}
              value={JSON.stringify(selectedPermissions)}
            />
          </CardContent>
        </Card>
      </div>

      <FormFooter
        href="/roles"
        title="Role"
        parent="settings"
        editingId={editingId}
        loading={loading}
      />
    </form>
  );
}