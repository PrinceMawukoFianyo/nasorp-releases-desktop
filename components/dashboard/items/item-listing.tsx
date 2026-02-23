// components/dashboard/items/item-listing.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MapPin, Package } from "lucide-react";
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
import { useDeleteItem, useOrgItems } from "@/hooks/useItemQueries";
import { BriefItemDTO, ItemCreateProps } from "@/types/item";
import { BriefItemResponse } from "@/types/item";
import ImageUploadButton from "@/components/FormInputs/ImageUploadButton";
import { Button } from "@/components/ui/button";
import FormSelectInput from "@/components/FormInputs/FormSelectInput";
import { getOrgCategories } from "@/actions/categories";
import { getOrgBrands } from "@/actions/brands";
import { getOrgUnits } from "@/actions/units";
import { getOrgLocations } from "@/actions/locations";
import { createItem } from "@/actions/items";
import { linkItemToLocation } from "@/actions/inventory-actions";
import { Separator } from "@/components/ui/separator";
import { deleteItem } from "@/actions/items";

interface ItemListingProps {
  title: string;
  orgId: string;
}

interface Option {
  label: string;
  value: string;
}

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  minStockLevel: z.string().optional(),
  initialQuantity: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const DEFAULT_IMAGE =
  "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP";

export default function ItemListing({ title, orgId }: ItemListingProps) {
  const router = useRouter();

  const { items, refetch, isLoading } = useOrgItems(orgId);
  const deleteItemMutation = useDeleteItem();

  const [isPending, startTransition] = useTransition();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BriefItemResponse | null>(null);
  const [productToDelete, setProductToDelete] = useState<BriefItemResponse | null>(null);

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [unitOptions, setUnitOptions] = useState<Option[]>([]);
  const [locationOptions, setLocationOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // ── Selected values (outside RHF because FormSelectInput is uncontrolled) ─
  const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Option | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Option | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Option | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sellingPrice: "",
      costPrice: "",
      sku: "",
      description: "",
      barcode: "",
      minStockLevel: "",
      initialQuantity: "0",
    },
  });

  // Load dropdown options whenever the form opens
  useEffect(() => {
    if (formDialogOpen) loadOptions();
  }, [formDialogOpen]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [categories, brands, units, locations] = await Promise.all([
        getOrgCategories(orgId),
        getOrgBrands(orgId),
        getOrgUnits(orgId),
        getOrgLocations(),
      ]);

      setCategoryOptions(categories.map((c) => ({ label: c.title, value: c.id })));
      setBrandOptions(brands.map((b) => ({ label: b.name, value: b.id })));
      setUnitOptions(
        units.map((u) => ({ label: `${u.name} - ${u.symbol}`, value: u.id }))
      );
      setLocationOptions(
        locations.map((l) => ({
          label: `${l.name}${l.type ? ` (${l.type})` : ""}`,
          value: l.id,
        }))
      );
    } catch (err) {
      console.error("Error loading options:", err);
      toast.error("Failed to load dropdown options");
    } finally {
      setLoadingOptions(false);
    }
  };

  // Reset form every time the dialog closes or opens for a new item
  useEffect(() => {
    if (!currentProduct) {
      form.reset({
        name: "",
        sellingPrice: "",
        costPrice: "",
        sku: "",
        description: "",
        barcode: "",
        minStockLevel: "",
        initialQuantity: "0",
      });
      setImageUrl(DEFAULT_IMAGE);
      setSelectedCategory(null);
      setSelectedBrand(null);
      setSelectedUnit(null);
      setSelectedLocation(null);
    }
  }, [currentProduct, form]);

  const { data: session } = useSession();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MMM dd, yyyy");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleExport = async (filtered: BriefItemResponse[]) => {
    setIsExporting(true);
    try {
      const data = filtered.map((p) => ({
        Name: p.name,
        Price: p.sellingPrice,
        "Sales Count": p.salesCount,
        "Total Sales": formatCurrency(p.salesTotal),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      XLSX.writeFile(wb, `Products_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Exported successfully");
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddClick = () => {
    setCurrentProduct(null);
    setFormDialogOpen(true);
  };

  const handleEditClick = (product: BriefItemResponse) => {
    startTransition(() =>
      router.push(`/dashboard/inventory/items/${product.id}/edit`)
    );
  };

  const handleDeleteClick = (product: BriefItemResponse) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // ── Submit — calls server action DIRECTLY so we own the item ID ───────────
  const onSubmit = async (formData: ProductFormValues) => {
    if (isSubmitting || isUploading) {
      if (isUploading) toast.error("Please wait for the image to finish uploading");
      return;
    }

    if (imageUrl === DEFAULT_IMAGE) {
      toast.error("Please upload an item image first");
      return;
    }

    // ✅ Capture state values synchronously before any await
    const chosenLocationId = selectedLocation?.value ?? null;
    const chosenLocationLabel = selectedLocation?.label ?? "";
    const initialQty = Math.max(0, parseInt(formData.initialQuantity ?? "0") || 0);

    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const itemPayload = {
      name: formData.name,
      sku: formData.sku,
      slug,
      orgId,
      thumbnail: imageUrl,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      description: formData.description || null,
      barcode: formData.barcode || null,
      minStockLevel: formData.minStockLevel ? parseInt(formData.minStockLevel) : 0,
      categoryId: selectedCategory?.value || null,
      brandId: selectedBrand?.value || null,
      unitId: selectedUnit?.value || null,
      unitOfMeasure: selectedUnit ? selectedUnit.label.split("-")[0].trim() : null,
      isActive: true,
      isbn: null, 
      tax: 0, 
    };

    setIsSubmitting(true);
    try {
      // ── Step 1: Create the item ──────────────────────────────────────────
      const createResult = await createItem(itemPayload);

      if (!createResult.success || !createResult.data?.id) {
        toast.error("Failed to create item", {
          description: createResult.error ?? "Unknown error",
        });
        return;
      }

      const newItemId = createResult.data.id;
      console.log("✅ Item created:", newItemId);

      // ── Step 2: Link to location with initial stock quantity ─────────────
      if (chosenLocationId) {
        const linkResult = await linkItemToLocation({
          itemId: newItemId,
          locationId: chosenLocationId,
          quantity: initialQty,
        });

        if (linkResult.success) {
          console.log(
            `✅ Linked to "${chosenLocationLabel}" with qty=${initialQty}`
          );
          toast.success("Item added successfully!", {
            description:
              initialQty > 0
                ? `Linked to ${chosenLocationLabel} with ${initialQty} unit${initialQty !== 1 ? "s" : ""} in stock.`
                : `Linked to ${chosenLocationLabel} (no initial stock set).`,
          });
        } else {
          // Item was created — just the location link failed
          toast.warning("Item created but location link failed", {
            description: linkResult.error,
          });
        }
      } else {
        toast.success("Item added successfully!", {
          description: "No location selected — you can assign one from the item detail page.",
        });
      }

      // ── Step 3: Reset and refresh ────────────────────────────────────────
      setFormDialogOpen(false);
      setImageUrl(DEFAULT_IMAGE);
      setSelectedCategory(null);
      setSelectedBrand(null);
      setSelectedUnit(null);
      setSelectedLocation(null);
      form.reset();
      refetch();
    } catch (err) {
      console.error("❌ onSubmit error:", err);
      toast.error("Something went wrong", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATED: Handle confirm delete with proper refresh
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    
    try {
      console.log("🗑️ Attempting to delete item:", productToDelete.id);
      
      // Call the delete function directly
      const result = await deleteItem(productToDelete.id);
      
      console.log("📨 Delete result:", result);
      
      if (result.success) {
        // Close the dialog
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        
        // Show success message
        toast.success("Item deleted successfully");
        
        // Force a complete refresh of the data
        await refetch();
        
        // Also refresh the router to update any server components
        router.refresh();
        
      } else {
        toast.error(result.error || "Failed to delete item");
      }
    } catch (error: any) {
      console.error("💥 Delete error:", error);
      toast.error(error?.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const getTotalValue = (products: BriefItemResponse[]) =>
    products.reduce((sum, p) => sum + p.sellingPrice, 0);

  // ── Table columns ─────────────────────────────────────────────────────────
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
      cell: (row) => formatCurrency(row.sellingPrice),
    },
    { header: "Sales Count", accessorKey: "salesCount" },
    {
      header: "Total Sales",
      accessorKey: (row) => formatCurrency(row.salesTotal),
    },
    {
      header: "Supplier",
      accessorKey: "id",
      cell: (row) => (
        <Link href={`/dashboard/inventory/items/${row.id}/suppliers`}>
          <Button variant="outline" size="sm">View Suppliers</Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      <DataTable<BriefItemResponse>
        title={title}
        subtitle={
          items.length > 0
            ? `${items.length} ${items.length === 1 ? "item" : "items"} | Total Value: ${formatCurrency(getTotalValue(items))}`
            : undefined
        }
        data={items}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        onRefresh={refetch}
        actions={{ onAdd: handleAddClick, onExport: handleExport }}
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

      {/* ── Product Form Dialog ─────────────────────────────────────────── */}
      <EntityForm
        size="lg"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentProduct ? "Edit Item" : "Add New Item"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting || isUploading}
        submitLabel={
          isUploading
            ? "Uploading image…"
            : isSubmitting
            ? "Creating item…"
            : currentProduct
            ? "Save Changes"
            : "Add Item"
        }
      >
        <div className="overflow-y-auto max-h-[65vh] px-1">

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Basic Information</h4>
              <p className="text-xs text-muted-foreground">Required fields for the item</p>
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
                        <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₵</span>
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
                        <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₵</span>
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
                        <Input placeholder="SKU-" {...field} disabled={!!currentProduct} />
                      </FormControl>
                      <FormDescription className="text-xs">Unique product identifier</FormDescription>
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

          {/* Storage Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Storage Location</h4>
                <p className="text-xs text-muted-foreground">
                  Where is this item stored and how many units do you have?
                </p>
              </div>
            </div>

            {/* Location dropdown */}
            {loadingOptions ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading locations…</p>
            ) : locationOptions.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border border-dashed rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  No locations found.{" "}
                  <Link href="/dashboard/inventory/locations" className="underline text-primary">
                    Create one first
                  </Link>
                </p>
              </div>
            ) : (
              <FormSelectInput
                label="Select Location"
                options={locationOptions}
                option={selectedLocation}
                setOption={(opt) => {
                  setSelectedLocation(opt);
                  // ✅ Reset initial quantity when location changes
                  form.setValue("initialQuantity", "0");
                }}
                toolTipText="Manage Locations"
                href="/dashboard/inventory/locations"
              />
            )}

            {/* Initial stock quantity — visible only after a location is chosen */}
            {selectedLocation && (
              <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
                {/* Selected location badge */}
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-xs">{selectedLocation.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation(null);
                      form.setValue("initialQuantity", "0");
                    }}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>

                {/* ✅ Initial stock quantity */}
                <FormField
                  control={form.control}
                  name="initialQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm">
                        <Package className="h-3.5 w-3.5" />
                        Opening Stock at{" "}
                        <span className="font-semibold">{selectedLocation.label}</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => {
                            // ✅ Ensure value is always a valid non-negative string
                            const val = e.target.value;
                            field.onChange(val === "" ? "0" : val);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        How many units are currently in stock? Setting this above 0 will
                        immediately update the Inventory by Location chart on your dashboard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {!selectedLocation && locationOptions.length > 0 && (
              <p className="text-xs text-muted-foreground px-1">
                Select a location above to set the opening stock quantity.
              </p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Classification */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Classification (Optional)</h4>
              <p className="text-xs text-muted-foreground">Categorize your item</p>
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

          {/* Additional Details */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Additional Details (Optional)</h4>
              <p className="text-xs text-muted-foreground">Extra information</p>
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
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </EntityForm>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={
          productToDelete ? (
            <>
              Are you sure you want to delete <strong>{productToDelete.name}</strong>?
              This action cannot be undone.
            </>
          ) : (
            "Are you sure you want to delete this product?"
          )
        }
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting || deleteItemMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}