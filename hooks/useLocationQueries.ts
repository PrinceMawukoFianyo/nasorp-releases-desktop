// hooks/useProductQueries.ts
import { createLocation, deleteLocation, getOrgLocations, updateLocationById } from "@/actions/locations";
import { itemAPI } from "@/services/items";
import { ItemCreateProps } from "@/types/item";
import { LocationCreateProps, LocationResponse } from "@/types/location";
import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// Query keys for caching
export const locationKeys = {
  all: ["item"] as const,
  lists: () => [...locationKeys.all, "list"] as const,
  list:(filters: any) =>[...locationKeys.lists(), {filters}] as const,
  filteredList: (dateFilter: any, searchQuery: string) =>
    [...locationKeys.lists(), { dateFilter, searchQuery }] as const,
  details: () => [...locationKeys.all, "detail"] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};



export function useOrgLocations() {
  // Get an item a particular organisation
  const {data: locations, refetch} = useSuspenseQuery({
    queryKey: locationKeys.lists(),
    queryFn: () => getOrgLocations(),
  });
  return {
    locations,
    refetch,
  }
  
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  // Create a new location
  return useMutation({
    mutationFn: (data: LocationCreateProps) => createLocation(data),
    onSuccess: () => {
      toast.success("Location added successfully");
      // Invalidate locations list to trigger a refetch
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to add location", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  // Update an existing product
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<LocationResponse> }) =>
      updateLocationById(id, data),
    onSuccess: (data,variables ) => {
      toast.success("Location updated successfully");
      // Invalidate specific product detail and list queries
      queryClient.invalidateQueries({
        queryKey: locationKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to update location", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  // Delete a product
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      toast.success("location deleted successfully");
      // Invalidate products list to trigger a refetch
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete location", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
} 
