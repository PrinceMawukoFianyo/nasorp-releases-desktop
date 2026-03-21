"use client";
// app/dashboard/settings/roles/columns.tsx

import { Checkbox }        from "@/components/ui/checkbox";
import DateColumn          from "@/components/DataTableColumns/DateColumn";
import ActionColumn        from "@/components/DataTableColumns/ActionColumn";
import SortableColumn      from "@/components/DataTableColumns/SortableColumn";
import { ColumnDef }       from "@tanstack/react-table";
import { Role }            from "@prisma/client";

export const columns: ColumnDef<Role>[] = [
  // ── Select checkbox ────────────────────────────────────────────────────────
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding:  false,
  },

  // ── Role title ─────────────────────────────────────────────────────────────
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <SortableColumn column={column} title="Role Title" />
    ),
  },

  // ── Description ────────────────────────────────────────────────────────────
  {
    accessorKey: "description",
    header: ({ column }) => (
      <SortableColumn column={column} title="Description" />
    ),
    // Show a dash when no description is set
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue("description") || "—"}
      </span>
    ),
  },

  // ── Permission count ────────────────────────────────────────────────────────
  {
    accessorKey: "permissions",
    header: "Permissions",
    cell: ({ row }) => {
      const perms = row.getValue("permissions") as string[];
      return (
        <span className="text-xs font-medium text-muted-foreground">
          {Array.isArray(perms) ? perms.length : 0} permissions
        </span>
      );
    },
  },

  // ── Date created ───────────────────────────────────────────────────────────
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  // FIX: editEndpoint must be the full path from /dashboard root
  // Old (broken): `roles/update/${role.id}`
  // New (correct): `settings/roles/update/${role.id}`
  // ActionColumn prepends /dashboard/ automatically, so the resolved URL
  // becomes: /dashboard/settings/roles/update/${role.id}
  {
    id: "actions",
    cell: ({ row }) => {
      const role = row.original;
      return (
        <ActionColumn
          row={row}
          model="role"
          editEndpoint={`/dashboard/settings/roles/update/${role.id}`}
          id={role.id}
        />
      );
    },
  },
];