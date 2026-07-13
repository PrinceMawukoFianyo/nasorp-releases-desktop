"use client";
// app/dashboard/settings/roles/columns.tsx

import { Checkbox }        from "@/components/ui/checkbox";
import DateColumn          from "@/components/DataTableColumns/DateColumn";
import SortableColumn      from "@/components/DataTableColumns/SortableColumn";
import { ColumnDef }       from "@tanstack/react-table";
import { Role }            from "@prisma/client";
import { Button }          from "@/components/ui/button";
import { Pencil, Trash2 }  from "lucide-react";
import { useRouter }       from "next/navigation";
import { deleteRole }      from "@/actions/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast }           from "sonner"; // or your toast library
import { useState }        from "react";

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

  // ── Actions (custom) ──────────────────────────────────────────────────────
  {
    id: "actions",
    cell: ({ row }) => {
      const role = row.original;
      const router = useRouter();
      const [isDeleting, setIsDeleting] = useState(false);

      const handleDelete = async () => {
        setIsDeleting(true);
        try {
          const result = await deleteRole(role.id);
          if (result.success) {
            toast.success("Role deleted successfully");
            router.refresh(); // 👈 This refreshes the page and updates the table
          } else {
            toast.error(result.error || "Failed to delete role");
          }
        } catch (error) {
          toast.error("Something went wrong");
        } finally {
          setIsDeleting(false);
        }
      };

      return (
        <div className="flex items-center gap-2">
          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(`/dashboard/settings/roles/update/${role.id}`)
            }
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Delete button with confirmation dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the role
                  <strong> “{role.displayName}”</strong> and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting…" : "Permanently Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];