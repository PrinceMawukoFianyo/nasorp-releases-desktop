// components/ui/groups/customer-listing-suspense.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, PhoneCall, Building2 } from "lucide-react";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BriefCustomerResponse, CustomerCreateProps } from "@/types/customer";

import { useCreateCustomer, useDeleteCustomer, useOrgCustomers } from "@/hooks/useCustomerQueries";

interface CustomerListingProps {
  title: string;
}

// Form schema for editing/adding customers
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export default function CustomerListing({ title }: CustomerListingProps) {
  const router = useRouter();
  
  // React Query hooks with Suspense
  const { customers, refetch } = useOrgCustomers();
  const createCustomerMutation = useCreateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const [isPending, startTransition] = useTransition();

  // Local state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<BriefCustomerResponse | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<BriefCustomerResponse | null>(null);

  // Form for adding customers
  const form = useForm<CustomerCreateProps>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      address: "",
      email: "",
      phone: "",
    },
  });

  // Update form when current customer changes
  useEffect(() => {
    if (!currentCustomer) {
      // Adding new - reset form
      form.reset({
        name: "",
        address: "",
        email: "",
        phone: "",
      });
    } else {
      // Editing existing - populate form
      form.reset({
        name: currentCustomer.name,
        phone: currentCustomer?.phone ?? "",
        email: currentCustomer?.email ?? "",
      });
    }
  }, [currentCustomer, form]);

  // Format date function
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  };

  // Export to Excel
  const handleExport = async (filteredCustomers: BriefCustomerResponse[]) => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = filteredCustomers.map((customer) => ({
        Name: customer.name,
        Address: customer?.address,
        Email: customer.email,
        Phone: customer.phone,
        "Date Added": formatDate(customer.createdAt),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

      // Generate filename with current date
      const fileName = `Customers_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

      // Export to file
      XLSX.writeFile(workbook, fileName);

      toast.success("Export successful", {
        description: `Customers exported to ${fileName}`,
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
    setCurrentCustomer(null);
    setFormDialogOpen(true);
  };

  const handleEditClick = (customer: BriefCustomerResponse) => {
    startTransition(() => {
      router.push(`/dashboard/sales/customers/${customer.id}/edit`);
    });
  };

  const handleViewClick = (customer: BriefCustomerResponse) => {
    startTransition(() => {
      router.push(`/dashboard/sales/customers/${customer.id}`);
    });
  };

  // Handle delete click
  const handleDeleteClick = (customer: BriefCustomerResponse) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (add only)
  const onSubmit = async (data: CustomerCreateProps) => {
    if (!currentCustomer) {
      console.log(data);
      createCustomerMutation.mutate(data); 
      setFormDialogOpen(false);
      form.reset();
    }
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
      setDeleteDialogOpen(false);
    } 
  };

  // Define columns for the data table
  const columns: Column<BriefCustomerResponse>[] = [
    {
      header: "Logo",
      accessorKey: "imageUrl",
      cell: (row) => {
        const imageUrl = row.imageUrl || null;
        return (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={row.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        );
      },
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
      header: "Email",
      accessorKey: "email",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.email && row.email.length > 20 
            ? `${row.email.substring(0, 20)}...` 
            : row.email || "N/A"}
        </span>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.phone && row.phone.length > 20 
            ? `${row.phone.substring(0, 20)}...` 
            : row.phone || "N/A"}
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
      <DataTable<BriefCustomerResponse>
        title={title}
        subtitle="Customers"
        data={customers}
        columns={columns}
        keyField="id"
        isLoading={false}
        onRefresh={refetch}
        actions={{
          onAdd: handleAddClick,
          onExport: handleExport,
        }}
        filters={{
          searchFields: ["name", "email", "phone"],
          enableDateFilter: true,
          getItemDate: (item) => item.createdAt,
        }}
        renderRowActions={(item) => (
          <TableActions.RowActions
            onEdit={() => handleEditClick(item)}
            onView={() => handleViewClick(item)}
            onDelete={() => handleDeleteClick(item)}
            isDeleting={
              deleteCustomerMutation.isPending &&
              customerToDelete?.id === item.id
            }
          />
        )}
      />

      {/* Customer Form Dialog */}
      <EntityForm
        size="md"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentCustomer ? "Edit Customer" : "Add New Customer"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={createCustomerMutation.isPending}
        submitLabel={
          currentCustomer
            ? "Save Changes"
            : "Add Customer"
        }
      >
        <div className="grid gap-3 grid-cols-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Customer name" {...field} />
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
                    <PhoneCall className="absolute left-2 top-2.5 text-sm text-muted-foreground" />
                    <Input placeholder="+233 549 272251" className="pl-8" {...field} />
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
                    <Mail className="absolute left-2 top-2.5 text-sm text-muted-foreground" />
                    <Input
                      placeholder="princefianyo@gmail.com"
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
        title="Delete Customer"
        description={
          customerToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>{customerToDelete.name}</strong>? This action cannot be
              undone.
            </>
          ) : (
            "Are you sure you want to delete this customer?"
          )
        }
        onConfirm={handleConfirmDelete}
        isConfirming={deleteCustomerMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}