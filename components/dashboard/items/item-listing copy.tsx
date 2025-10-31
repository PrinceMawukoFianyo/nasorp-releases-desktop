// components/ui/groups/product-listing-suspense.tsx
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
import { useScroll } from "framer-motion";

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

export default function ItemListing({ title,orgId }: ItemListingProps) {
  // React Query hooks with Suspense - note that data is always defined
  const { items, refetch } = useOrgItems(orgId);
  const createItemMutation = useCreateItem();
  //const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  // Local state
  const [imageUrl, setImageUrl] = useState("https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP");
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
      currency: "UGX",
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
        "Date Added": formatDate(product.createdAt),
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
    setFormDialogOpen(true);
  };

  // Handle edit click
  /* const handleEditClick = (product: Product) => {
    setCurrentProduct(product);
    setFormDialogOpen(true);
  }; */

  // Handle delete click
  const handleDeleteClick = (product: BriefItemResponse) => {
    setProductToDelete(product);
    setDeleteDialogOpen(false);
  };

  // Handle form submission (edit or add)
  const onSubmit = async (data: ItemCreateProps) => {
    if (!currentProduct) {
      
      data.costPrice = Number(data.costPrice);
      data.sellingPrice = Number(data.sellingPrice);
      data.orgId = orgId;
      data.thumbnail = imageUrl;
      //console.log(data)
      //Add new product
      createItemMutation.mutate(data);
      setFormDialogOpen(true);
      form.reset();
    } else {
      // Edit existing product
      /* updateProductMutation.mutate({
        id: currentProduct.id,
        data,
      }); */
    }
  };

  // Handle confirming delete
  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteItemMutation.mutate(productToDelete.id);
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
      cell: (row) => <img className="w-10 h-10" src={row.thumbnail??"/placeholder.png"} alt={row.name} />,
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: (row) => <span className="font-medium line-clamp-1">
        {row.name.length > 20? `${row.name.substring(0,20)}...`: row.name}
      </span>,
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
      header: "Date Added",
      accessorKey: (row) => formatDate(row.createdAt),
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
        isLoading={false} // With Suspense, we're guaranteed to have data
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
            //onEdit={() => handleEditClick(item)}
            onDelete={() => handleDeleteClick(item)}
            //isDeleting={
              //deleteProductMutation.isPending && productToDelete?.id === item.id
            //}
          />
        )}
      />

      {/* Product Form Dialog */}
      <EntityForm
        size="md"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentProduct ? "Edit Item" : "Add New Item"}
        form={form}
        onSubmit={onSubmit}
        /* isSubmitting={
          createItemMutation.isPending || updateProductMutation.isPending
        } */
        submitLabel={currentProduct ? "Save Changes" : "Add Item"}
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
                  <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₵</span>
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
                  <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₵</span>
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
        <div className="grip gap-3 grid-cols-2">
        </div>
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
            <button>
             {/* <ImageUploadButton
              title = "Item image" 
              imageUrl = {imageUrl} 
              setImageUrl = {setImageUrl}
              endpoint = "itemImage"
              />  */}
            </button>
          </div>
        </div>
      </EntityForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={
          productToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>{productToDelete.name}</strong> (
              {productToDelete.salesTotal})? This action cannot be undone.
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
