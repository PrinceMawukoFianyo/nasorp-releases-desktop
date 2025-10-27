"use client";

import ImageColumn from "@/components/DataTableColumns/ImageColumn";
import { ColumnDef } from "@tanstack/react-table";
import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import { UserWithRoles } from "@/types/types";
import UserRoleBtn from "@/components/DataTableComponents/UserRoleBtn";

export const columns: ColumnDef<UserWithRoles>[] = [
  {
    accessorKey: "image",
    header: "Profile Image",
    cell: ({ row }) => <ImageColumn row={row} accessorKey="image" />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title="Name" />,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const item = row.original;
      return <UserRoleBtn user={item} />;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableColumn column={column} title="Email" />,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <SortableColumn column={column} title="Phone Number" />
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <ActionColumn
          row={row}
          model="user"
          editEndpoint={`user/update/${user.id}`}
          id={user.id}
        />
      );
    },
  },
];