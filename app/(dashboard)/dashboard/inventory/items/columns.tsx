"use client";


import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import DateColumn from "@/components/DataTableColumns/DateColumn";
import ImageColumn from "@/components/DataTableColumns/ImageColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import { ColumnDef } from "@tanstack/react-table";
import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import { BriefItemResponse } from "@/types/item";

export const columns: ColumnDef<BriefItemResponse>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
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
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title="Name" />,
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <SortableColumn column={column} title="Slug" />,
  },
  {
    accessorKey: "thumbnail",
    header: "Item Image",
    cell: ({ row }) => <ImageColumn row={row} accessorKey="thumbnail" />,
  },

 /*  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  }, */
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <ActionColumn
          row={row}
          model="item"
          editEndpoint={""}
          id={item.id}
        />
      );
    },
  },
];
