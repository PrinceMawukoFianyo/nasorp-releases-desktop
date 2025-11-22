// components/ui/groups/product-listing-suspense.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Car, DollarSign, Mail, Phone, PhoneCall } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { useRouter } from "next/navigation"; // ✅ FIXED: Changed from "next/router"
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
import { useCreateSupplier, useDeleteSupplier, useOrgSuppliers } from "@/hooks/useSupplierQueries";
import { BriefSupplierResponse, SupplierCreateProps } from "@/types/types";
import { deleteSupplier } from "@/actions/suppliers";

interface ItemListingProps {
  title: string;

}

// Form schema for editing/adding products
const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),


});

type supplierFormValues = z.infer<typeof supplierFormSchema>;



export default function SupplierListing({ title,  }: ItemListingProps) {
  const router = useRouter(); // FIXED: Moved router hook to top
  
  // React Query hooks with Suspense - note that data is always defined
  const { suppliers, refetch } = useOrgSuppliers();
  const createItemMutation = useCreateSupplier();
  const deleteItemMutation = useDeleteSupplier();

  const [isPending, startTransition] = useTransition();

  // Local state

  const [isUploading, setIsUploading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<BriefSupplierResponse | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<BriefSupplierResponse | null>(null);

  // Form for editing/adding products
  const form = useForm<SupplierCreateProps>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
    },
  });

  // Update form when current product changes
  useEffect(() => {
    if (!currentProduct) {
      // Adding new - reset form
      form.reset({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      });
     
    } else {
      // Editing existing - populate form
      form.reset({
        name: currentProduct.name,
        phone: currentProduct?.phone?? "",
        contactPerson: currentProduct?.contactPerson?? "",
        email: currentProduct?.email?? "",

      });
    }
  }, [currentProduct, form]);

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
  const handleExport = async (filteredProducts: BriefSupplierResponse []) => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product) => ({
        Name: product.name,
        ContactPerson: product?.contactPerson,
        Email: product.email,
        Phone: product.phone,
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

   const handleEditClick = (supplier: BriefSupplierResponse) => {
    startTransition(() => {
      router.push(`/dashboard/purchases/suppliers/${supplier.id}/edit`);
    });
  };
  // Handle delete click
  const handleDeleteClick = (product: BriefSupplierResponse) => {
    setSupplierToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (edit or add)
  const onSubmit = async (data: SupplierCreateProps) => {
    // Validate upload status

    if (!currentProduct) {
       console.log(data);
      // Add new product
      createItemMutation.mutate(data); 
      setFormDialogOpen(true);
      form.reset();
      }else{

      }
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      deleteItemMutation.mutate(supplierToDelete.id);
      
    } 
  };


  // Define columns for the data table
  const columns: Column<BriefSupplierResponse>[] = [
  
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
      header: "Contact Person",
      accessorKey: "contactPerson",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.name.length > 20 ? `${row.name.substring(0, 20)}...` : row.contactPerson}
        </span>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.name.length > 20 ? `${row.name.substring(0, 20)}...` : row.email}
        </span>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.name.length > 20 ? `${row.name.substring(0, 20)}...` : row.phone}
        </span>
      ),
    },
    
    {
      header: "Date Added",
      accessorKey: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <>
      <DataTable<BriefSupplierResponse>
        title={title}
        subtitle="Suppliers"
        data={suppliers}
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

      {/* Product Form Dialog */}
      <EntityForm
        size="md"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentProduct ? "Edit Supplier" : "Add New Supplier"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={createItemMutation.isPending || isUploading}
        submitLabel={
            currentProduct
            ? "Save Changes"
            : "Add Supplier"
        }
      >
        <div className="grid gap-3 grid-cols-2">
          <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter Supplier name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder=" Enter supplier contact person " {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-3 grid-cols-2">
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <div className="relative">
                    <PhoneCall className="absolute left-2 top-2.5 text-sm text-muted-foreground"/>
                    <Input placeholder=" +233 549 272251" className="pl-8" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 text-sm text-muted-foreground"/>
                    <Input
                      placeholder=" princefianyo@gmail.com"
                      className="pl-8"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </EntityForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Supplier"
        description={
          supplierToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>{supplierToDelete.name}</strong>? This action cannot be
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