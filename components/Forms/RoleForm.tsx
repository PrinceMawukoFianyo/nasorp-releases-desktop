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
import { sidebarLinks, ISidebarLink } from "@/config/sidebar";

type RoleFormProps = {
  editingId?: string;
  initialData?: Role | null;
  orgId: string;
};

type ChildPerm = { label: string; permission: string };

type PermissionGroup = {
  moduleTitle: string;
  motherPermission: string;
  children: ChildPerm[];
};

// ── Build permission groups from sidebar ──────────────────────────────────
// FIX: labels now come from each item's real `title` in sidebar.ts (e.g.
// "Items", "Categories", "Payroll") instead of being guessed from the tail
// end of the permission string — that's why everything used to say "read".
function buildPermissionGroups(): PermissionGroup[] {
  return sidebarLinks.map((link: ISidebarLink) => ({
    moduleTitle: link.title,
    motherPermission: link.permission,
    children:
      link.dropdownMenu?.map((item) => ({
        label: item.title,
        permission: item.permission,
      })) ?? [],
  }));
}

function PermissionGroupCard({
  group,
  isSelected,
  toggleGroup,
  togglePermission,
}: {
  group: PermissionGroup;
  isSelected: (perm: string) => boolean;
  toggleGroup: (mother: string, children: string[]) => void;
  togglePermission: (perm: string) => void;
}) {
  const hasChildren = group.children.length > 0;
  const allChildrenSelected =
    hasChildren && group.children.every((c) => isSelected(c.permission));
  const someChildrenSelected =
    hasChildren && group.children.some((c) => isSelected(c.permission));
  const motherIndeterminate = hasChildren && someChildrenSelected && !allChildrenSelected;
  const motherChecked = isSelected(group.motherPermission);

  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = motherIndeterminate;
    }
  }, [motherIndeterminate]);

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{group.moduleTitle}</span>
          <input
            type="checkbox"
            ref={checkboxRef}
            checked={hasChildren ? allChildrenSelected : motherChecked}
            onChange={() =>
              toggleGroup(
                group.motherPermission,
                group.children.map((c) => c.permission)
              )
            }
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>

        {hasChildren && (
          <div className="ml-2 space-y-1">
            {group.children.map((child) => (
              <div key={child.permission} className="flex items-center gap-2">
                <Checkbox
                  id={child.permission}
                  checked={isSelected(child.permission)}
                  onCheckedChange={() => togglePermission(child.permission)}
                />
                <label htmlFor={child.permission} className="text-sm cursor-pointer select-none">
                  {child.label}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoleForm({ orgId, editingId, initialData }: RoleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const groups = useMemo(() => buildPermissionGroups(), []);

  const allValidPermissions = useMemo(() => {
    const perms = new Set<string>();
    groups.forEach((g) => {
      perms.add(g.motherPermission);
      g.children.forEach((c) => perms.add(c.permission));
    });
    return Array.from(perms);
  }, [groups]);

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

  const isSelected = (perm: string) => selectedPermissions.includes(perm);

  const togglePermission = (perm: string) => {
    const current = new Set(selectedPermissions);
    if (current.has(perm)) {
      current.delete(perm);
    } else {
      current.add(perm);
    }
    setValue("permissions", Array.from(current), { shouldDirty: true });
  };

  const toggleGroup = (mother: string, children: string[]) => {
    const current = new Set(selectedPermissions);

    if (children.length === 0) {
      if (current.has(mother)) {
        current.delete(mother);
      } else {
        current.add(mother);
      }
      setValue("permissions", Array.from(current), { shouldDirty: true });
      return;
    }

    const allChildrenSelected = children.every((child) => current.has(child));

    if (allChildrenSelected) {
      current.delete(mother);
      children.forEach((child) => current.delete(child));
    } else {
      current.add(mother);
      children.forEach((child) => current.add(child));
    }
    setValue("permissions", Array.from(current), { shouldDirty: true });
  };

  async function saveRole(data: RoleFormData) {
    try {
      setLoading(true);

      const permissions = getValues("permissions") || [];
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

        <Card>
          <CardContent>
            <h2 className="text-xl font-medium mt-6 mb-6">
              Select Permissions the User will have access
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map((group) => (
                <PermissionGroupCard
                  key={group.motherPermission}
                  group={group}
                  isSelected={isSelected}
                  toggleGroup={toggleGroup}
                  togglePermission={togglePermission}
                />
              ))}
            </div>
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