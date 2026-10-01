// components/ui/groups/product-listing-suspense.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, PhoneCall } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLocation, useDeleteLocation, useOrgLocations, useUpdateLocation } from "@/hooks/useLocationQueries";
import { LocationCreateProps, LocationResponse } from "@/types/location";
import { LocationType } from "@/generated/prisma-client";

interface LocationListingProps {
  title: string;
}

// Form schema for editing/adding locations
const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function LocationListing({ title}: LocationListingProps) {
  const router = useRouter();
  
  // React Query hooks with Suspense - note that data is always defined
  const { locations, refetch } = useOrgLocations();
  const createLocationMutation = useCreateLocation();
  const deleteLocationMutation = useDeleteLocation();
  const updateLocationMutation = useUpdateLocation();

  const [isPending, startTransition] = useTransition();

  // Local state
  const [isUploading, setIsUploading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationResponse | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<LocationResponse | null>(null);

  // Form for editing/adding locations
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      type: "WAREHOUSE",
      address: "",
      phone: "",
      email: "",
    },
  });

  // Update form when current location changes
  useEffect(() => {
    if (!currentLocation) {
      // Adding new - reset form
      form.reset({
        name: "",
        type: "WAREHOUSE",
        address: "",
        phone: "",
        email: "",
      });
    } else {
      // Editing existing - populate form
      form.reset({
        name: currentLocation.name,
        type: currentLocation.type,
        address: currentLocation.address || "",
        phone: currentLocation.phone || "",
        email: currentLocation.email || "",
      });
    }
  }, [currentLocation, form]);

  // Format date function
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  };

  // Export to Excel
  const handleExport = async (filteredLocations: LocationResponse[]) => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = filteredLocations.map((location) => ({
        Name: location.name,
        Type: location.type,
        Phone: location.phone,
        Address: location.address,
        Email: location.email,
        "Date Added": formatDate(location.createdAt)
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");

      // Generate filename with current date
      const fileName = `Locations_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

      // Export to file
      XLSX.writeFile(workbook, fileName);

      toast.success("Export successful", {
        description: `Locations exported to ${fileName}`,
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
    setCurrentLocation(null);
    setFormDialogOpen(true);
  };

  const handleEditClick = (location: LocationResponse) => {
   setCurrentLocation(location);
   setFormDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (location: LocationResponse) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  // Handle form submission (edit or add)
  const onSubmit = async (data: LocationFormValues) => {
      // Validate upload status
      if (isUploading) {
        toast.error("Please wait for the image to finish uploading");
        return;
      }

      if (!currentLocation) {
        // Add new location
        createLocationMutation.mutate(data as LocationCreateProps, {
          onSuccess: () => {
            setFormDialogOpen(false);
            form.reset();
            toast.success("Location added successfully!");
          },
          onError: (error) => {
            toast.error("Failed to add location", {
              description: error instanceof Error ? error.message : "Unknown error",
            });
          },
        });
      } else {
        // Edit existing location
        const obj = {
          ...data,
          type: data.type as LocationType,
        };
        
        updateLocationMutation.mutate(
          {
            id: currentLocation.id,
            data: obj,
          },
          {
            onSuccess: () => {
              setFormDialogOpen(false);
              form.reset();
              toast.success("Location updated successfully!");
            },
            onError: (error) => {
              toast.error("Failed to update location", {
                description: error instanceof Error ? error.message : "Unknown error",
              });
            },
          }
        );
      }
    };

  // Handle confirming delete
  const handleConfirmDelete = () => {
    if (locationToDelete) {
      deleteLocationMutation.mutate(locationToDelete.id);
      setDeleteDialogOpen(false);
    }
  };

  // Define columns for the data table
  const columns: Column<LocationResponse>[] = [ 
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
      header: "Type",
      accessorKey: "type",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.type}
        </span>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.phone || "N/A"}
        </span>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (row) => (
        <span className="font-medium line-clamp-1">
          {row.email || "N/A"}
        </span>
      ),
    },
    // {
    //   header: "Address",
    //   accessorKey: "address",
    //   cell: (row) => (
    //     <span className="font-medium line-clamp-1">
    //       {row.address && row.address.length > 20 ? `${row.address.substring(0, 20)}...` : (row.address || "N/A")}
    //     </span>
    //   ),
    // },
    {
      header: "Date Added",
      accessorKey: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <>
      <DataTable<LocationResponse>
        title={title}
        subtitle="Locations"
        data={locations}
        columns={columns}
        keyField="id"
        isLoading={false}
        onRefresh={refetch}
        actions={{
          onAdd: handleAddClick,
          onExport: handleExport,
        }}
        filters={{
          searchFields: ["name","type"],
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

      {/* Location Form Dialog */}
      <EntityForm
        size="md"
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        title={currentLocation ? "Edit Location" : "Add New Location"}
        form={form as any}
        onSubmit={onSubmit as any}
        isSubmitting={createLocationMutation.isPending || isUploading}
        submitLabel={
          isUploading
            ? "Uploading..."
            : currentLocation
            ? "Save Changes"
            : "Add Location"
        }
      >
        <div className="grid gap-3 grid-cols-2">
          <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter Location name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the location type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE">WAREHOUSE</SelectItem>
                    <SelectItem value="SHOP">SHOP</SelectItem>
                    <SelectItem value="VIRTUAL">VIRTUAL</SelectItem>
                  </SelectContent>
                </Select>
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
                      disabled={!!currentLocation}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
      </EntityForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Location"
        description={
          locationToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>{locationToDelete.name}</strong>? This action cannot be
              undone.
            </>
          ) : (
            "Are you sure you want to delete this location?"
          )
        }
        onConfirm={handleConfirmDelete}
        isConfirming={deleteLocationMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}