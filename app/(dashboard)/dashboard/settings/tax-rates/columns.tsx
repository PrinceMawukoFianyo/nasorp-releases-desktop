"use client";
// app/dashboard/settings/tax-rates/columns.tsx

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { TaxResponse } from "@/types/types";

// Note: With TaxRatesClient.tsx handling the table directly,
// these column definitions are kept only if you still use DataTable elsewhere.
// The TaxRatesClient uses its own inline table with built-in delete buttons.

export const columns: ColumnDef<TaxResponse>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "rate",
    header: "Rate",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono">
        {row.original.rate}%
      </Badge>
    ),
  },
];