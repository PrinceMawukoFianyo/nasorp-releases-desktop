"use client";

import Image from "next/image";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import DateColumn from "@/components/DataTableColumns/DateColumn";
import ImageColumn from "@/components/DataTableColumns/ImageColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import { ColumnDef } from "@tanstack/react-table";
import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import { CategoryResponse } from "@/types/types";
export type CategoryRow = CategoryResponse & {
  itemCount: number;
  totalUnits: number;
  costValue: number;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export const columns: ColumnDef<CategoryRow>[] = [
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
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableColumn column={column} title="Title" />,
  },
  {
    accessorKey: "itemCount",
    header: ({ column }) => <SortableColumn column={column} title="Items in stock" />,
    cell: ({ row }) => <span>{row.original.itemCount.toLocaleString()}</span>,
  },
  {
    accessorKey: "totalUnits",
    header: ({ column }) => <SortableColumn column={column} title="Units" />,
    cell: ({ row }) => <span>{row.original.totalUnits.toLocaleString()}</span>,
  },
  {
    accessorKey: "costValue",
    header: ({ column }) => <SortableColumn column={column} title="Inventory value" />,
    cell: ({ row }) => (
      <span className="font-semibold text-green-700">{money(row.original.costValue)}</span>
    ),
  },
  {
    accessorKey: "imageUrl",
    header: "Category Image",
    cell: ({ row }) => <ImageColumn row={row} accessorKey="imageUrl" />,
  },

  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const category = row.original;
      return (
        <ActionColumn
          row={row}
          model="category"
          editEndpoint={""}
          id={category.id}
        />
      );
    },
  },
];