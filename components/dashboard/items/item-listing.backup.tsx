/*// components/dashboard/items/item-listing.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Car, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DataTable,
  Column,
  TableActions,
  EntityForm,
  ConfirmationDialog,
} from "@/components/ui/data-table";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateItem, useDeleteItem, useOrgItems } from "@/hooks/useItemQueries";
import { BriefItemDTO, ItemCreateProps } from "@/types/item";
import { BriefItemResponse } from "@/types/item";
import ImageUploadButton from "@/components/FormInputs/ImageUploadButton";
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

const DEFAULT_IMAGE = "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP";

export default function ItemListing({ title, orgId }: ItemListingProps) {
  const router = useRouter();
  
  // React Query hooks with Suspense - note that data is always defined
  const { items, refetch } = useOrgItems(orgId);
  const createItemMutation = useCreateItem();
  const deleteItemMutation = useDeleteItem();

  const [isPending, startTransition] = useTransition();

  // Local state
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [isUploading, setIsUploading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BriefItemResponse | null>(null);
  const [productToDelete, setProductToDelete] = useState<BriefItemResponse | null>(null);

  // Form for editing/adding products
  const form = useForm<ItemCreateProps>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sellingPrice: 0,
      costPrice: 0,
      sku: "",
    },
  });

  // Update form when current product changes
  useEffect(() => {
    if (!currentProduct) {
      // Adding new - reset form
      form.reset({
        name: "",
        sellingPrice: 0,
        costPrice: 0,
        sku: "",
      });
      setImageUrl(DEFAULT_IMAGE);
    } else {
      // Editing existing - populate form
      form.reset({
        name: currentProduct.name,
        sellingPrice: currentProduct.sellingPrice,
      });
    }
  }, [currentProduct, form]);

  const { data: session } = useSession();

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
    setCurrentProduct(null);
    setImageUrl(DEFAULT_IMAGE);
    setFormDialogOpen(true);
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

  // Handle form submission (edit or add)
  const onSubmit = async (data: ItemCreateProps) => {
    // Validate upload status
    if (isUploading) {
      toast.error("Please wait for the image to finish uploading");
      return;
    }

    if (imageUrl === DEFAULT_IMAGE) {
      toast.error("Please upload an item image first");
      return;
    }

    if (!currentProduct) {
      data.costPrice = Number(data.costPrice);
      data.sellingPrice = Number(data.sellingPrice);
      data.orgId = orgId;
      data.thumbnail = imageUrl;

      // Add new product
      createItemMutation.mutate(data, {
        onSuccess: () => {
          setFormDialogOpen(false);
          setImageUrl(DEFAULT_IMAGE);
          form.reset();
          toast.success("Item added successfully!");
        },
        onError: (error) => {
          toast.error("Failed to add item", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        },
      });
    }
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
        <Link href={`/dashboard/inventory/items/${row.id}/suppliers`}>
          <Button variant={"outline"}>
            View Suppliers
          </Button>
        </Link>
      ),
    },
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
        pageSize={100} // ADDED: Set default page size to 100
      />*/

      {/* Product Form Dialog */}
      /*
      <EntityForm
        size="md"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentProduct ? "Edit Item" : "Add New Item"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={createItemMutation.isPending || isUploading}
        submitLabel={
          isUploading
            ? "Uploading image..."
            : currentProduct
            ? "Save Changes"
            : "Add Item"
        }
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter Item name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 grid-cols-2">
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">
                      ₵
                    </span>
                    <Input placeholder="25,000,000" className="pl-8" {...field} />
                  </div>
                </FormControl>
                <FormDescription>Enter the product price in GHS</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">
                      ₵
                    </span>
                    <Input
                      placeholder="25,000"
                      className="pl-8"
                      {...field}
                      disabled={!!currentProduct}
                    />
                  </div>
                </FormControl>
                <FormDescription>Enter the product price in GHS</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grip gap-3 grid-cols-2"></div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-7">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Sku</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="SKU-"
                        className="pl-8"
                        {...field}
                        disabled={!!currentProduct}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Enter the product SKU</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-5">
            <ImageUploadButton
              title="Item image"
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              endpoint="itemImage"
              onUploadStart={() => setIsUploading(true)}
              onUploadComplete={() => setIsUploading(false)}
            />
          </div>
        </div>
      </EntityForm>*/

      {/* Delete Confirmation Dialog */}
      /*
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
}*/