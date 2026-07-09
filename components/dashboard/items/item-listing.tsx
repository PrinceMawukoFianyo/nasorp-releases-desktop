"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MapPin, Package, Filter, X, ChevronDown, ChevronUp, Copy, AlertTriangle } from "lucide-react"; // ← added Copy, AlertTriangle
import { useSession } from "next-auth/react";
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
import { getOrgLocations, getLocationsWithItemCounts } from "@/actions/locations";
import { createItem, deleteItem, deactivateItem } from "@/actions/items";
import { linkItemToLocation } from "@/actions/inventory-actions";
import { getItemsByLocation } from "@/actions/inventory";
import { Separator } from "@/components/ui/separator";
import { getOrgPackagingUnits, PackagingUnitRecord } from "@/actions/packaging-units";
import { createPricingTiersForItem } from "@/actions/pricing-tiers";
import WholesalePricingSection, { WholesaleTierDraft } from "@/app/(dashboard)/dashboard/inventory/items/wholesale-unit-component/wholesale-pricing-section";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function isNextJsInternalError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const d = (err as any).digest as string | undefined;
  return typeof d === "string" && (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_NOT_FOUND"));
}

interface ItemListingProps {
  title: string;
  orgId: string;
}

interface Option {
  label: string;
  value: string;
}

interface LocationWithCount {
  id: string;
  name: string;
  type: string;
  itemCount: number;
  totalQuantity?: number;
}

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  minStockLevel: z.string().optional(),
  initialQuantity: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const n = parseInt(val, 10);
        return !isNaN(n) && n >= 0;
      },
      { message: "Quantity must be 0 or greater" }
    ),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const DEFAULT_IMAGE = "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP";

// ── ADDED FOR DUPLICATE MANAGEMENT: compute duplicate IDs ────────────────────
function computeDuplicateIds(items: BriefItemResponse[]): Set<string> {
  const nameMap = new Map<string, string[]>(); // normalized name → [id, ...]
  const skuMap  = new Map<string, string[]>(); // normalized sku  → [id, ...]

  for (const item of items) {
    const normName = item.name.trim().toLowerCase();
    const normSku  = item.sku.trim().toLowerCase();

    if (!nameMap.has(normName)) nameMap.set(normName, []);
    nameMap.get(normName)!.push(item.id);

    if (!skuMap.has(normSku)) skuMap.set(normSku, []);
    skuMap.get(normSku)!.push(item.id);
  }

  const dupIds = new Set<string>();
  for (const ids of nameMap.values()) if (ids.length > 1) ids.forEach(id => dupIds.add(id));
  for (const ids of skuMap.values()) if (ids.length > 1) ids.forEach(id => dupIds.add(id));
  return dupIds;
}
// ────────────────────────────────────────────────────────────────────────────

export default function ItemListing({ title, orgId }: ItemListingProps) {
  const router = useRouter();

  const { items: allItems, refetch, isLoading } = useOrgItems(orgId);
  const deleteItemMutation = useDeleteItem();

  const [isPending, startTransition] = useTransition();

  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BriefItemResponse | null>(null);
  const [productToDelete, setProductToDelete] = useState<BriefItemResponse | null>(null);

  const [locations, setLocations] = useState<LocationWithCount[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locationItems, setLocationItems] = useState<BriefItemResponse[] | null>(null);

  // ── ADDED: duplicate filter state and IDs ─────────────────────────────────
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [hasShownDuplicateToast, setHasShownDuplicateToast] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

  // ── MODIFIED: displayItems respects duplicate filter ──────────────────────
  const displayItems = useMemo<BriefItemResponse[]>(() => {
    const base = selectedLocationId ? (locationItems ?? []) : (allItems ?? []);
    if (showDuplicatesOnly) {
      return base.filter(item => duplicateIds.has(item.id));
    }
    return base;
  }, [selectedLocationId, locationItems, allItems, showDuplicatesOnly, duplicateIds]);

  const [locationOptions, setLocationOptions] = useState<Option[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingLocationItems, setLoadingLocationItems] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(true);
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [unitOptions, setUnitOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Option | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Option | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Option | null>(null);

  const [packagingUnits, setPackagingUnits] = useState<PackagingUnitRecord[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTierDraft[]>([]);
  const [selectedDefaultLocation, setSelectedDefaultLocation] = useState<Option | null>(null);

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

  useEffect(() => { loadLocationsWithCounts(); }, [orgId]);

  useEffect(() => {
    if (!selectedLocationId) { setLocationItems(null); return; }
    loadItemsForLocation(selectedLocationId);
  }, [selectedLocationId]);

  // ── ADDED: update duplicate IDs when allItems changes ────────────────────
  useEffect(() => {
    if (allItems) {
      setDuplicateIds(computeDuplicateIds(allItems));
    }
  }, [allItems]);

  // ── ADDED: duplicate toast warning ───────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (hasShownDuplicateToast) return;
    if (duplicateIds.size === 0) return;

    toast.warning(`${duplicateIds.size} duplicate item${duplicateIds.size > 1 ? "s" : ""} detected`, {
      description: 'Items with the same name or SKU are marked with a "DUPLICATE" badge. Use the filter to review and delete them.',
      duration: 8000,
      action: {
        label: "Show duplicates",
        onClick: () => setShowDuplicatesOnly(true),
      },
    });
    setHasShownDuplicateToast(true);
  }, [isLoading, duplicateIds, hasShownDuplicateToast]);
  // ──────────────────────────────────────────────────────────────────────────

  const loadLocationsWithCounts = async () => {
    setLoadingLocations(true);
    try {
      const result = await getLocationsWithItemCounts(orgId);
      if (result.success) {
        setLocations(result.data);
        setTotalItemsCount(result.totalItems);
        setLocationOptions(
          result.data.map((loc: LocationWithCount) => ({
            label: `${loc.name} (${loc.type})`,
            value: loc.id,
          }))
        );
      }
    } catch (err) {
      if (isNextJsInternalError(err)) throw err;
      toast.error("Failed to load locations");
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadItemsForLocation = async (locationId: string) => {
    setLoadingLocationItems(true);
    try {
      const items = await getItemsByLocation(orgId, locationId);
      const transformed: BriefItemResponse[] = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        slug: item.slug,
        thumbnail: item.thumbnail,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        isActive: item.isActive,
        categoryId: item.categoryId,
        brandId: item.brandId,
        barcode: item.barcode ?? null,
        category: item.category,
        brand: item.brand,
        supplierRelations: item.supplierRelations ?? [],
        salesCount: item.salesCount ?? 0,
        salesTotal: item.salesTotal ?? 0,
        totalStock: item.inventories
          ? Math.max(0, item.inventories.reduce((s: number, inv: any) => s + inv.quantity, 0))
          : 0,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
      }));
      setLocationItems(transformed);
    } catch (err) {
      if (isNextJsInternalError(err)) throw err;
      toast.error("Failed to load items for this location");
    } finally {
      setLoadingLocationItems(false);
    }
  };

  const refreshAll = useCallback(async () => {
    await refetch();
    await loadLocationsWithCounts();
    if (selectedLocationId) await loadItemsForLocation(selectedLocationId);
  }, [selectedLocationId, orgId]);

  useEffect(() => { if (formDialogOpen) loadOptions(); }, [formDialogOpen]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [categories, brands, units, pkgUnits] = await Promise.all([
        getOrgCategories(orgId),
        getOrgBrands(orgId),
        getOrgUnits(orgId),
        getOrgPackagingUnits(),
      ]);
      setCategoryOptions(categories.map((c) => ({ label: c.title, value: c.id })));
      setBrandOptions(brands.map((b) => ({ label: b.name, value: b.id })));
      setUnitOptions(units.map((u) => ({ label: `${u.name} - ${u.symbol}`, value: u.id })));
      setPackagingUnits(pkgUnits);
    } catch (err) {
      if (isNextJsInternalError(err)) throw err;
      toast.error("Failed to load dropdown options");
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (!currentProduct) {
      form.reset({
        name: "", sellingPrice: "", costPrice: "", sku: "",
        description: "", barcode: "", minStockLevel: "", initialQuantity: "0",
      });
      setImageUrl(DEFAULT_IMAGE);
      setSelectedCategory(null);
      setSelectedBrand(null);
      setSelectedUnit(null);
      setSelectedLocation(null);
      setWholesaleTiers([]);
    }
  }, [currentProduct, form]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MMM dd, yyyy");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency", currency: "GHS", minimumFractionDigits: 0,
    }).format(amount);

  const handleExport = async (filtered: BriefItemResponse[]) => {
    setIsExporting(true);
    try {
      const data = filtered.map((p) => ({
        Name: p.name, SKU: p.sku,
        "Selling Price": p.sellingPrice, "Cost Price": p.costPrice,
        "Sales Count": p.salesCount, "Total Sales": formatCurrency(p.salesTotal),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      XLSX.writeFile(wb, `Products_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddClick = () => { setCurrentProduct(null); setFormDialogOpen(true); };

  const handleEditClick = (product: BriefItemResponse) => {
    startTransition(() => router.push(`/dashboard/inventory/items/${product.id}/edit`));
  };

  const handleDeleteClick = (product: BriefItemResponse) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleLocationSelect = (locationId: string | null) => {
    setSelectedLocationId(locationId);
    const params = new URLSearchParams(window.location.search);
    if (locationId) params.set("location", locationId);
    else params.delete("location");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const clearLocationFilter = () => handleLocationSelect(null);

  const onSubmit = async (formData: ProductFormValues) => {
    if (isSubmitting || isUploading) {
      if (isUploading) toast.error("Please wait for the image to finish uploading");
      return;
    }

    // ── ADDED: client‑side duplicate guard ──────────────────────────────────
    const normName = formData.name.trim().toLowerCase();
    const normSku = formData.sku.trim().toLowerCase();
    const duplicateItem = (allItems ?? []).find(
      item =>
        item.name.trim().toLowerCase() === normName ||
        item.sku.trim().toLowerCase() === normSku
    );
    if (duplicateItem) {
      toast.error("Duplicate item – cannot create", {
        description: `"${duplicateItem.name}" (SKU: ${duplicateItem.sku}) already exists.`,
        duration: 6000,
      });
      return; // stop submission
    }
    // ────────────────────────────────────────────────────────────────────────

    const chosenLocationId = selectedLocation?.value ?? null;
    const chosenLocationLabel = selectedLocation?.label ?? "";

    const rawQty = parseInt(formData.initialQuantity ?? "0") || 0;
    const initialQty = Math.max(0, rawQty);

    const slug = formData.name
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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
      defaultLocationId: selectedDefaultLocation?.value ?? null,
    };

    setIsSubmitting(true);
    try {
      const createResult = await createItem(itemPayload);
      if (!createResult.success || !createResult.data?.id) {
        toast.error("Failed to create item", { description: createResult.error ?? "Unknown error" });
        return;
      }

      const newItemId = createResult.data.id;

      if (chosenLocationId) {
        const linkResult = await linkItemToLocation({
          itemId: newItemId,
          locationId: chosenLocationId,
          quantity: initialQty,
        });

        if (linkResult.success) {
          toast.success("Item added successfully!", {
            description: initialQty > 0
              ? `Linked to ${chosenLocationLabel} with ${initialQty} unit${initialQty !== 1 ? "s" : ""} in stock.`
              : `Linked to ${chosenLocationLabel} (no initial stock set).`,
          });
        } else {
          toast.warning("Item created but location link failed", { description: linkResult.error });
        }
      } else {
        toast.success("Item added successfully!", {
          description: "No location selected — assign one from the item detail page.",
        });
      }

      const validTiers = wholesaleTiers.filter(
        (t) => t.packagingUnitId && parseInt(t.unitsPerPack) >= 1 && parseFloat(t.wholesalePrice) > 0
      );
      if (validTiers.length > 0) {
        const tierResult = await createPricingTiersForItem(
          newItemId,
          validTiers.map((t) => ({
            packagingUnitId: t.packagingUnitId,
            packagingUnitName: packagingUnits.find((u) => u.id === t.packagingUnitId)?.name ?? "",
            unitsPerPack: parseInt(t.unitsPerPack),
            wholesalePrice: parseFloat(t.wholesalePrice),
          }))
        );
        if (!tierResult.success) {
          toast.warning("Item created but pricing tiers failed to save", { description: tierResult.error });
        }
      }

      setFormDialogOpen(false);
      setImageUrl(DEFAULT_IMAGE);
      setSelectedCategory(null); setSelectedBrand(null);
      setSelectedUnit(null); setSelectedLocation(null);
      setWholesaleTiers([]);
      form.reset();
      await refreshAll();

    } catch (err) {
      if (isNextJsInternalError(err)) throw err;
      toast.error("Something went wrong", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteItem(productToDelete.id);
      if (result.success) {
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        toast.success("Item deleted successfully");
        await refreshAll();
      } else {
        const isBlockedByRelations =
          result.error?.includes("sales history") ||
          result.error?.includes("purchase orders") ||
          result.error?.includes("transfers") ||
          result.error?.includes("serial numbers") ||
          result.error?.includes("Deactivate");

        if (isBlockedByRelations) {
          toast.error("Cannot delete this item", {
            description: result.error,
            action: {
              label: "Deactivate instead",
              onClick: async () => {
                const deactivateResult = await deactivateItem(productToDelete.id);
                if (deactivateResult.success) {
                  toast.success(`"${productToDelete.name}" has been deactivated`);
                  setDeleteDialogOpen(false);
                  setProductToDelete(null);
                  await refreshAll();
                } else {
                  toast.error("Deactivation also failed", { description: deactivateResult.error });
                }
              },
            },
          });
        } else {
          toast.error(result.error || "Failed to delete item");
        }
      }
    } catch (error: any) {
      if (isNextJsInternalError(error)) throw error;
      toast.error(error?.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const getInventoryCostValue = (products: BriefItemResponse[]) =>
    products.reduce((sum, p) => sum + Math.max(0, (p as any).totalStock ?? 0) * p.costPrice, 0);

  const getInventoryRetailValue = (products: BriefItemResponse[]) =>
    products.reduce((sum, p) => sum + Math.max(0, (p as any).totalStock ?? 0) * p.sellingPrice, 0);

  // ── MODIFIED: columns with duplicate badge and inline delete ──────────────
  const columns: Column<BriefItemResponse>[] = [
    {
      header: "Image",
      accessorKey: "thumbnail",
      cell: (row) => (
        <img className="w-10 h-10 rounded object-cover" src={row.thumbnail ?? "/placeholder.png"} alt={row.name} />
      ),
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium line-clamp-1">
            {row.name.length > 20 ? `${row.name.substring(0, 20)}...` : row.name}
          </span>
          {duplicateIds.has(row.id) && (
            <span className="inline-flex items-center gap-1">
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                <Copy className="h-2.5 w-2.5 mr-1" />
                DUPLICATE
              </Badge>
              <button
                title="Delete this duplicate item"
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToDelete(row);
                  setDeleteDialogOpen(true);
                }}
                className="ml-0.5 rounded-full p-0.5 text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      ),
    },
    {
      header: "SKU",
      accessorKey: "sku",
      cell: (row) => <span className="text-xs font-mono text-muted-foreground">{row.sku}</span>,
    },
    {
      header: "Price",
      accessorKey: "sellingPrice",
      cell: (row) => formatCurrency(row.sellingPrice),
    },
    {
      header: "Stock",
      accessorKey: "totalStock" as any,
      cell: (row) => {
        const qty = Math.max(0, (row as any).totalStock ?? 0);
        return (
          <Badge
            variant={qty <= 0 ? "destructive" : qty < 5 ? "secondary" : "outline"}
            className="font-mono"
          >
            {qty}
          </Badge>
        );
      },
    },
    { header: "Sales Count", accessorKey: "salesCount" },
    { header: "Total Sales", accessorKey: (row) => formatCurrency(row.salesTotal) },
    {
      header: "Supplier",
      accessorKey: "supplierRelations" as any,
      cell: (row) => {
        const relations = (row as any).supplierRelations ?? [];
        if (relations.length === 0) {
          return (
            <Link href={`/dashboard/inventory/items/${row.id}/suppliers`}>
              <span className="text-xs text-muted-foreground italic hover:underline">No supplier</span>
            </Link>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {relations.slice(0, 2).map((rel: any) => (
              <Link key={rel.id} href={`/dashboard/inventory/items/${row.id}/suppliers`}>
                <Badge variant="outline" className="text-xs font-normal cursor-pointer hover:bg-muted">
                  {rel.supplier?.name ?? "Unknown"}
                </Badge>
              </Link>
            ))}
            {relations.length > 2 && (
              <Link href={`/dashboard/inventory/items/${row.id}/suppliers`}>
                <Badge variant="secondary" className="text-xs cursor-pointer">
                  +{relations.length - 2} more
                </Badge>
              </Link>
            )}
          </div>
        );
      },
    },
  ];
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Location Filter Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowLocationFilter(!showLocationFilter)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter by Location
            {showLocationFilter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* ── ADDED: Duplicate filter toggle ────────────────────────────── */}
          {duplicateIds.size > 0 && (
            <Button
              variant={showDuplicatesOnly ? "destructive" : "outline"}
              size="sm"
              onClick={() => setShowDuplicatesOnly(prev => !prev)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {showDuplicatesOnly ? "Show All Items" : `Show Duplicates (${duplicateIds.size})`}
            </Button>
          )}
          {/* ──────────────────────────────────────────────────────────────── */}

          {selectedLocationId && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <MapPin className="h-3 w-3" />
              {locations.find((l) => l.id === selectedLocationId)?.name || "Selected Location"}
              <button onClick={clearLocationFilter} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        {selectedLocationId && (
          <p className="text-sm text-muted-foreground">
            Showing {displayItems.length} of {totalItemsCount} items
          </p>
        )}
      </div>

      {/* Location Filter Panel (unchanged) */}
      {showLocationFilter && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Select a Location
            </h3>
          </div>

          {loadingLocations ? (
            <div className="flex gap-2 py-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedLocationId ? "default" : "outline"} size="sm"
                onClick={() => handleLocationSelect(null)}
                className="flex items-center gap-2"
              >
                <Package className="h-3 w-3" />
                All Locations
                <Badge variant={!selectedLocationId ? "secondary" : "outline"} className="ml-1">
                  {totalItemsCount}
                </Badge>
              </Button>

              {locations.map((location) => (
                <Button
                  key={location.id}
                  variant={selectedLocationId === location.id ? "default" : "outline"} size="sm"
                  onClick={() => handleLocationSelect(location.id)}
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3" />
                  {location.name}
                  <Badge variant={selectedLocationId === location.id ? "secondary" : "outline"} className="ml-1">
                    {location.itemCount}
                  </Badge>
                </Button>
              ))}
            </div>
          )}

          {locations.length === 0 && !loadingLocations && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              No locations found.{" "}
              <Link href="/dashboard/inventory/locations" className="underline text-primary">
                Create one first
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <DataTable<BriefItemResponse>
        title={title}
        subtitle={
          displayItems.length > 0
            ? `${displayItems.length} ${displayItems.length === 1 ? "item" : "items"} | Cost Value: ${formatCurrency(getInventoryCostValue(displayItems))} | Retail Value: ${formatCurrency(getInventoryRetailValue(displayItems))}`
            : selectedLocationId ? "No items in this location" : "No items found"
        }
        data={displayItems}
        columns={columns}
        keyField="id"
        isLoading={isLoading || loadingLocationItems}
        onRefresh={refreshAll}
        actions={{ onAdd: handleAddClick, onExport: handleExport }}
        filters={{
          searchFields: ["name", "sku"],
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

      {/* Product Form Dialog (unchanged) */}
      <EntityForm
        size="lg"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentProduct ? "Edit Item" : "Add New Item"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting || isUploading}
        submitLabel={
          isUploading ? "Uploading image…"
          : isSubmitting ? "Creating item…"
          : currentProduct ? "Save Changes"
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
              control={form.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name *</FormLabel>
                  <FormControl><Input placeholder="Enter item name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 grid-cols-2">
              <FormField
                control={form.control} name="sellingPrice"
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
                control={form.control} name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₵</span>
                        <Input placeholder="0.00" className="pl-8" {...field} disabled={!!currentProduct} />
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
                  control={form.control} name="sku"
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
                  title="Item image" imageUrl={imageUrl} setImageUrl={setImageUrl}
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
                <p className="text-xs text-muted-foreground">Where is this item stored?</p>
              </div>
            </div>

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
                label="Select Location" options={locationOptions}
                option={selectedLocation}
                setOption={(opt) => { setSelectedLocation(opt); form.setValue("initialQuantity", "0"); }}
                toolTipText="Manage Locations" href="/dashboard/inventory/locations"
              />
            )}

            {selectedLocation && (
              <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-xs">{selectedLocation.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedLocation(null); form.setValue("initialQuantity", "0"); }}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>

                <FormField
                  control={form.control} name="initialQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm">
                        <Package className="h-3.5 w-3.5" />
                        Opening Stock at <span className="font-semibold">{selectedLocation.label}</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value) || 0;
                            const safe = Math.max(0, raw).toString();
                            field.onChange(safe);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        How many units are currently in stock? (minimum 0)
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

          {/* ── DEFAULT LOCATION ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Default Location (Auto‑disperse)</h4>
                <p className="text-xs text-muted-foreground">
                  When receiving this item, it will be auto‑routed here if "Auto‑disperse" is enabled.
                </p>
              </div>
            </div>

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
                label="Select Default Location"
                options={locationOptions}
                option={selectedDefaultLocation}
                setOption={setSelectedDefaultLocation}
                toolTipText="Manage Locations"
                href="/dashboard/inventory/locations"
              />
            )}
          </div>

          <Separator className="my-6" /> 

          {/* Wholesale / Bulk Pricing */}
          <WholesalePricingSection
            sellingPrice={Number(form.watch("sellingPrice")) || 0}
            packagingUnits={packagingUnits}
            tiers={wholesaleTiers}
            onChange={setWholesaleTiers}
            onRefreshUnits={loadOptions}
          />

          <Separator className="my-6" />

          {/* Classification */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Classification (Optional)</h4>
              <p className="text-xs text-muted-foreground">Categorize your item</p>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <FormSelectInput label="Category" options={categoryOptions} option={selectedCategory} setOption={setSelectedCategory} toolTipText="Manage Categories" href="/dashboard/inventory/categories" />
              <FormSelectInput label="Brand" options={brandOptions} option={selectedBrand} setOption={setSelectedBrand} toolTipText="Manage Brands" href="/dashboard/inventory/brands" />
              <FormSelectInput label="Unit" options={unitOptions} option={selectedUnit} setOption={setSelectedUnit} toolTipText="Manage Units" href="/dashboard/inventory/units" />
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
              control={form.control} name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20"
                      placeholder="Enter item description" {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 grid-cols-2">
              <FormField
                control={form.control} name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl><Input placeholder="Enter barcode" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control} name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="0" placeholder="0" {...field}
                        onChange={(e) => {
                          const safe = Math.max(0, parseInt(e.target.value) || 0).toString();
                          field.onChange(safe);
                        }}
                      />
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
        title="Delete Item"
        description={
          productToDelete ? (
            <>
              Are you sure you want to delete <strong>{productToDelete.name}</strong>?
              {" "}If this item has sales or order history it will be deactivated instead.
              {/* ── ADDED: extra context for duplicate delete ── */}
              {duplicateIds.has(productToDelete.id) && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  This item is marked as a duplicate. Deleting it will not affect other items with the same name or SKU.
                </span>
              )}
            </>
          ) : "Are you sure you want to delete this item?"
        }
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting || deleteItemMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}