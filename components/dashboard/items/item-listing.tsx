// components/dashboard/items/item-listing.tsx
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
import FormSelectInput from "@/components/FormInputs/FormSelectInput";
import { getOrgCategories } from "@/actions/categories";
import { getOrgBrands } from "@/actions/brands";
import { getOrgUnits } from "@/actions/units";
import { Separator } from "@/components/ui/separator";

interface ItemListingProps {
  title: string;
  orgId: string;
}

interface Option {
  label: string;
  value: string;
}

// Enhanced form schema with optional category, brand, and unit
const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  minStockLevel: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const DEFAULT_IMAGE = "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP";

export default function ItemListing({ title, orgId }: ItemListingProps) {
  const router = useRouter();
  
  // React Query hooks with Suspense - note that data is always defined
  const { items, refetch } = useOrgItems(orgId);
  const createItemMutation = useCreateItem();
  const deleteItemMutation = useDeleteItem();

  // Debug: Log items when they change
  useEffect(() => {
    console.log("Current items:", items);
    console.log("Total items count:", items.length);
  }, [items]);

  const [isPending, startTransition] = useTransition();

  // Local state
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [isUploading, setIsUploading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BriefItemResponse | null>(null);
  const [productToDelete, setProductToDelete] = useState<BriefItemResponse | null>(null);

  // Options state
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [unitOptions, setUnitOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Option | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Option | null>(null);

  // Form for editing/adding products
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sellingPrice: "",
      costPrice: "",
      sku: "",
      categoryId: "",
      brandId: "",
      unitId: "",
      description: "",
      barcode: "",
      minStockLevel: "",
    },
  });

  // Load options when form dialog opens
  useEffect(() => {
    if (formDialogOpen) {
      loadOptions();
    }
  }, [formDialogOpen, orgId]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [categories, brands, units] = await Promise.all([
        getOrgCategories(orgId),
        getOrgBrands(orgId),
        getOrgUnits(orgId),
      ]);

      setCategoryOptions(
        categories.map((cat) => ({
          label: cat.title,
          value: cat.id,
        }))
      );

      setBrandOptions(
        brands.map((brand) => ({
          label: brand.name,
          value: brand.id,
        }))
      );

      setUnitOptions(
        units.map((unit) => ({
          label: `${unit.name} - ${unit.symbol}`,
          value: unit.id,
        }))
      );
    } catch (error) {
      console.error("Error loading options:", error);
      toast.error("Failed to load options");
    } finally {
      setLoadingOptions(false);
    }
  };

  // Update form when current product changes
  useEffect(() => {
    if (!currentProduct) {
      // Adding new - reset form
      form.reset({
        name: "",
        sellingPrice: "",
        costPrice: "",
        sku: "",
        categoryId: "",
        brandId: "",
        unitId: "",
        description: "",
        barcode: "",
        minStockLevel: "",
      });
      setImageUrl(DEFAULT_IMAGE);
      setSelectedCategory(null);
      setSelectedBrand(null);
      setSelectedUnit(null);
    } else {
      // Editing existing - populate form
      // Use type assertion since sku might not be in the type definition
      form.reset({
        name: currentProduct.name,
        sellingPrice: String(currentProduct.sellingPrice),
        costPrice: String(currentProduct.costPrice || ""),
        sku: (currentProduct as any).sku || "",
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
  const onSubmit = async (data: ProductFormValues) => {
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
      // Generate slug from name
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Prepare item data
      const itemData: any = {
        name: data.name,
        sku: data.sku,
        slug,
        orgId,
        thumbnail: imageUrl,
        costPrice: Number(data.costPrice),
        sellingPrice: Number(data.sellingPrice),
        description: data.description || undefined,
        barcode: data.barcode || undefined,
        minStockLevel: data.minStockLevel ? parseInt(data.minStockLevel) : 0,
        categoryId: selectedCategory?.value || undefined,
        brandId: selectedBrand?.value || undefined,
        unitId: selectedUnit?.value || undefined,
        unitOfMeasure: selectedUnit ? selectedUnit.label.split("-")[0].trim() : undefined,
        isActive: true,
      };

      // Add new product
      createItemMutation.mutate(itemData, {
        onSuccess: (response) => {
          // Check if the response indicates success
          if (response?.success === false) {
            toast.error("Failed to add item", {
              description: response.error || "Unknown error occurred",
            });
            return;
          }
          
          setFormDialogOpen(false);
          setImageUrl(DEFAULT_IMAGE);
          setSelectedCategory(null);
          setSelectedBrand(null);
          setSelectedUnit(null);
          form.reset();
          toast.success("Item added successfully!");
          
          // Force a hard refetch to update the list
          refetch().then(() => {
            console.log("Items refetched successfully");
          });
        },
        onError: (error) => {
          console.error("Error creating item:", error);
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
          className="w-10 h-10 rounded object-cover"
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
        pageSize={100}
      />

      {/* Product Form Dialog */}
      <EntityForm
        size="lg"
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
        <div className="overflow-y-auto max-h-[65vh] px-1 -mx-6 px-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Basic Information</h4>
            <p className="text-xs text-muted-foreground">
              Required fields for the item
            </p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter item name" {...field} />
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
                  <FormLabel>Selling Price *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">
                        ₵
                      </span>
                      <Input placeholder="0.00" className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">
                        ₵
                      </span>
                      <Input
                        placeholder="0.00"
                        className="pl-8"
                        {...field}
                        disabled={!!currentProduct}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-7">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item SKU *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SKU-"
                        {...field}
                        disabled={!!currentProduct}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Unique product identifier
                    </FormDescription>
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
        </div>

        <Separator className="my-6" />

        {/* Optional Classification Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Classification (Optional)</h4>
            <p className="text-xs text-muted-foreground">
              Categorize your item for better organization
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <FormSelectInput
              label="Category"
              options={categoryOptions}
              option={selectedCategory}
              setOption={setSelectedCategory}
              toolTipText="Manage Categories"
              href="/dashboard/inventory/categories"
            />

            <FormSelectInput
              label="Brand"
              options={brandOptions}
              option={selectedBrand}
              setOption={setSelectedBrand}
              toolTipText="Manage Brands"
              href="/dashboard/inventory/brands"
            />

            <FormSelectInput
              label="Unit"
              options={unitOptions}
              option={selectedUnit}
              setOption={setSelectedUnit}
              toolTipText="Manage Units"
              href="/dashboard/inventory/units"
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Additional Details Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Additional Details (Optional)</h4>
            <p className="text-xs text-muted-foreground">
              Extra information about the item
            </p>
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20"
                    placeholder="Enter item description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 grid-cols-2">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter barcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minStockLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Stock Level</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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