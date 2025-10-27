"use client";
import { ColumnDef } from "@tanstack/react-table";
import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import { TaxResponse, UnitResponse} from "@/types/types";

export const columns: ColumnDef<TaxResponse>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title="Name" />,
  },
   {
    accessorKey: "rate",
    header: ({ column }) => <SortableColumn column={column} title="Rate" />,
  },
  
  /* {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const item = row.original;
      return <UserRoleBtn user={item} />;
    },
  },*/
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const tax = row.original;
      return (
        <ActionColumn
          row={row}
          model="tax"
          editEndpoint={""}
          id={tax.id}
        />
      );
    },
  }, 
]; 