"use client";

import { Card, CardContent } from "@/components/ui/card";
import FormHeader from "./FormHeader";
import { useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { RoleFormData } from "@/types/types";
import toast from "react-hot-toast";
import { Role } from "@/generated/prisma-client";
import FormFooter from "./FormFooter";
import TextInput from "../FormInputs/TextInput";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react"; // ── ADDED
import { createRole, updateRole } from "@/actions/roles";
import { sidebarLinks, ISidebarLink } from "@/config/sidebar";
// ── ADDED: pull in the real CRUD permission definitions ─────────────────
// (this is the same `permissions` array the old RoleForm used — nothing
// here changes config/permissions.ts, we're just reading from it again)
import { permissions as crudModules, ModulePermissions } from "@/config/permissions";

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

// ── Build permission groups from sidebar (UNCHANGED) ───────────────────────
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

// ── ADDED: reverse-lookup so we can find a module's full Create/Read/
// Update/Delete set from just its "read" permission string. This is how
// we connect a sidebar row (e.g. "items.read") back to its CRUD definition
// in config/permissions.ts (module.name === "items") without guessing or
// string-splitting — it's an exact match on module.permissions.read.
function buildCrudLookup(): Map<string, ModulePermissions> {
  const map = new Map<string, ModulePermissions>();
  crudModules.forEach((m) => {
    map.set(m.permissions.read, m);
  });
  return map;
}

const CRUD_LABELS: { key: keyof ModulePermissions["permissions"]; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "read", label: "Read" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
];

// ── ADDED: optional CRUD dropdown, triggered by a small chevron button
// next to a checkbox row when a matching module exists in
// config/permissions.ts. Purely additive — it reads/writes the exact same
// `permissions` string array as everything else, via the same
// isSelected/togglePermission the rest of the form already uses.
//
// This renders just the trigger button (chevron); the caller places the
// dropdown panel itself (CrudDropdownPanel) wherever it wants — usually
// directly under the row, so it only nudges that one row's siblings down
// instead of the whole grid.
function CrudDropdownTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Hide detailed permissions" : "Show detailed permissions"}
      className="flex items-center justify-center h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

function CrudDropdownPanel({
  module,
  isSelected,
  togglePermission,
}: {
  module: ModulePermissions;
  isSelected: (perm: string) => boolean;
  togglePermission: (perm: string) => void;
}) {
  return (
    <div className="mt-1.5 mb-1 rounded-md border bg-muted/30 p-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
      {CRUD_LABELS.map(({ key, label }) => {
        const permString = module.permissions[key];
        return (
          <div key={permString} className="flex items-center gap-2">
            <Checkbox
              id={permString}
              checked={isSelected(permString)}
              onCheckedChange={() => togglePermission(permString)}
            />
            <label htmlFor={permString} className="text-xs cursor-pointer select-none">
              {label}
            </label>
          </div>
        );
      })}
    </div>
  );
}


function PermissionGroupCard({
  group,
  isSelected,
  toggleGroup,
  togglePermission,
  crudLookup,
}: {
  group: PermissionGroup;
  isSelected: (perm: string) => boolean;
  toggleGroup: (mother: string, children: string[]) => void;
  togglePermission: (perm: string) => void;
  crudLookup: Map<string, ModulePermissions>; // ── ADDED
}) {
  const hasChildren = group.children.length > 0;
  const allChildrenSelected =
    hasChildren && group.children.every((c) => isSelected(c.permission));
  const someChildrenSelected =
    hasChildren && group.children.some((c) => isSelected(c.permission));
  const motherIndeterminate = hasChildren && someChildrenSelected && !allChildrenSelected;
  const motherChecked = isSelected(group.motherPermission);

  // ── ADDED: does the mother-level permission itself have a CRUD module?
  // (relevant for groups with no children, e.g. Dashboard, Users, Roles)
  const motherCrudModule = crudLookup.get(group.motherPermission);
  // ── ADDED: this row's own open/closed state for its dropdown panel
  const [motherOpen, setMotherOpen] = useState(false);

  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = motherIndeterminate;
    }
  }, [motherIndeterminate]);

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* ── ADDED: chevron trigger sits right beside the title, only
                rendered when this module actually has a CRUD definition ── */}
            {!hasChildren && motherCrudModule && (
              <CrudDropdownTrigger open={motherOpen} onToggle={() => setMotherOpen((o) => !o)} />
            )}
            <span className="text-base font-medium truncate">{group.moduleTitle}</span>
          </div>
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
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
          />
        </div>

        {/* ── ADDED: CRUD dropdown for a childless module (e.g. Dashboard) ── */}
        {!hasChildren && motherCrudModule && motherOpen && (
          <CrudDropdownPanel
            module={motherCrudModule}
            isSelected={isSelected}
            togglePermission={togglePermission}
          />
        )}

        {hasChildren && (
          <div className="ml-2 space-y-1">
            {group.children.map((child) => (
              <ChildPermissionRow
                key={child.permission}
                child={child}
                crudModule={crudLookup.get(child.permission)}
                isSelected={isSelected}
                togglePermission={togglePermission}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ADDED: a single child row (e.g. "Items" under Inventory) with its own
// independent open/closed dropdown state, so expanding one item doesn't
// affect its siblings.
function ChildPermissionRow({
  child,
  crudModule,
  isSelected,
  togglePermission,
}: {
  child: ChildPerm;
  crudModule: ModulePermissions | undefined;
  isSelected: (perm: string) => boolean;
  togglePermission: (perm: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={child.permission}
          checked={isSelected(child.permission)}
          onCheckedChange={() => togglePermission(child.permission)}
        />
        <label htmlFor={child.permission} className="text-sm cursor-pointer select-none flex-1">
          {child.label}
        </label>
        {crudModule && (
          <CrudDropdownTrigger open={open} onToggle={() => setOpen((o) => !o)} />
        )}
      </div>
      {crudModule && open && (
        <div className="ml-6">
          <CrudDropdownPanel
            module={crudModule}
            isSelected={isSelected}
            togglePermission={togglePermission}
          />
        </div>
      )}
    </div>
  );
}

export default function RoleForm({ orgId, editingId, initialData }: RoleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const groups = useMemo(() => buildPermissionGroups(), []);
  const crudLookup = useMemo(() => buildCrudLookup(), []); // ── ADDED

  const allValidPermissions = useMemo(() => {
    const perms = new Set<string>();
    groups.forEach((g) => {
      perms.add(g.motherPermission);
      g.children.forEach((c) => perms.add(c.permission));
    });
    // ── ADDED: also allow the CRUD permissions (create/update/delete)
    // that the expansion checkboxes can now select, so saveRole()'s
    // filter doesn't silently strip them back out.
    crudModules.forEach((m) => {
      Object.values(m.permissions).forEach((p) => perms.add(p));
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
            {/* ── ADDED: small hint so admins know the dropdown exists ── */}
            <p className="text-xs text-muted-foreground -mt-4 mb-4 flex items-center gap-1">
              Click the <ChevronDown className="h-3 w-3 inline" /> next to an item to control
              Create / Read / Update / Delete access separately.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map((group) => (
                <PermissionGroupCard
                  key={group.motherPermission}
                  group={group}
                  isSelected={isSelected}
                  toggleGroup={toggleGroup}
                  togglePermission={togglePermission}
                  crudLookup={crudLookup}
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