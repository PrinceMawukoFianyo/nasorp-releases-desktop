"use client";
import { ColumnDef } from "@tanstack/react-table";
import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import { UnitResponse} from "@/types/types";

export const columns: ColumnDef<UnitResponse>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title="Name" />,
  },
   {
    accessorKey: "symbol",
    header: ({ column }) => <SortableColumn column={column} title="Symbol" />,
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
      const unit = row.original;
      return (
        <ActionColumn
          row={row}
          model="unit"
          editEndpoint={""}
          id={unit.id}
        />
      );
    },
  }, 
]; 