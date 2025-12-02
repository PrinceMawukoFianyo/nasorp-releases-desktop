// components/ui/groups/product-listing-suspense.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { z } from "zod";
import { toast } from "sonner";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // ✅ ADDED: Import Link component
import {
  DataTable,
  Column,
  TableActions,
  ConfirmationDialog,
} from "@/components/ui/data-table";
import {  useDeleteItem, useOrgItems } from "@/hooks/useItemQueries";
import { BriefItemResponse } from "@/types/item";
import { Button } from "@/components/ui/button";

interface ItemListingProps {
  title: string;
  orgId: string;
}

// Form schema for editing/adding products
const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sku: z.string().min(1, "SKU is required"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;



export default function ItemListing({ title, orgId }: ItemListingProps) {
  const router = useRouter();
  
  // React Query hooks with Suspense - note that data is always defined
  const { items, refetch } = useOrgItems(orgId);

  const deleteItemMutation = useDeleteItem();

  const [isPending, startTransition] = useTransition();
 
  // Local state

  const [isUploading, setIsUploading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [productToDelete, setProductToDelete] = useState<BriefItemResponse | null>(null);



  // Format date function
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Export to Excel
  const handleExport = async (filteredProducts: BriefItemResponse[]) => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product) => ({
        Name: product.name,
        Price: product.sellingPrice,
        "Sales Count": product.salesCount,
        "Total Sales": formatCurrency(product.salesTotal),
        // "Date Added": formatDate(product.createdAt),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      // Generate filename with current date
      const fileName = `Products_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

      // Export to file
      XLSX.writeFile(workbook, fileName);

      toast.success("Export successful", {
        description: `Products exported to ${fileName}`,
      });
    } catch (error) {
      toast.error("Export failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle add new click
  const handleAddClick = () => {
     startTransition(() => {
      router.push(`/dashboard/inventory/items/create`);
    });
  };

   const handleEditClick = (product: BriefItemResponse) => {
    startTransition(() => {
      router.push(`/dashboard/inventory/items/${product.id}/edit`);
    });
  };
  
  // Handle delete click
  const handleDeleteClick = (product: BriefItemResponse) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };
  

  // Handle confirming delete
  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteItemMutation.mutate(productToDelete.id);
      setDeleteDialogOpen(false);
    }
  };

  // Calculate total products value
  const getTotalValue = (products: BriefItemResponse[]) => {
    return products.reduce((total, product) => {
      const price = product.sellingPrice;
      return total + price;
    }, 0);
  };

  // Define columns for the data table
  const columns: Column<BriefItemResponse>[] = [
    {
      header: "Image",
      accessorKey: "thumbnail",
      cell: (row) => (
        <img
          className="w-10 h-10"
          src={row.thumbnail ?? "/placeholder.png"}
          alt={row.name}
        />
      ),
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.name.length > 20 ? `${row.name.substring(0, 20)}...` : row.name}
        </span>
      ),
    },
    {
      header: "Price",
      accessorKey: "sellingPrice",
    },
    {
      header: "Sales Count",
      accessorKey: "salesCount",
    },
    {
      header: "Total Sales",
      accessorKey: (row) => formatCurrency(row.salesTotal),
    },
    {
      header: "Supplier",
      accessorKey: "id",
      cell: (row) => (
        // ✅ FIXED: Using Next.js Link component correctly
        <Link href={`/dashboard/inventory/items/${row.id}/suppliers`}>
          <Button variant={"outline"}>
            View Suppliers
          </Button>
        </Link>
      ),
    },
    /* {
      header: "Date Added",
      accessorKey: (row) => formatDate(row.createdAt),
    }, */
  ];

  // Generate subtitle with total value
  const getSubtitle = (productCount: number, totalValue: number) => {
    return `${productCount} ${
      productCount === 1 ? "item" : "items"
    } | Total Value: ${formatCurrency(totalValue)}`;
  };

  return (
    <>
      <DataTable<BriefItemResponse>
        title={title}
        subtitle={
          items.length > 0
            ? getSubtitle(items.length, getTotalValue(items))
            : undefined
        }
        data={items}
        columns={columns}
        keyField="id"
        isLoading={false}
        onRefresh={refetch}
        actions={{
          onAdd: handleAddClick,
          onExport: handleExport,
        }}
        filters={{
          searchFields: ["name"],
          enableDateFilter: true,
          getItemDate: (item) => item.createdAt,
        }}
        renderRowActions={(item) => (
          <TableActions.RowActions
            onEdit={() => handleEditClick(item)}
            onDelete={() => handleDeleteClick(item)}
          />
        )}
      />


      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={
          productToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>{productToDelete.name}</strong>? This action cannot be
              undone.
            </>
          ) : (
            "Are you sure you want to delete this product?"
          )
        }
        onConfirm={handleConfirmDelete}
        isConfirming={deleteItemMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}