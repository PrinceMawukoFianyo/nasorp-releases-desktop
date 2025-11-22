// hooks/useItemQueries.ts
"use client";

import { itemAPI } from "@/services/items";
import { ItemCreateProps } from "@/types/item";
import {
  useQuery, // ✅ Changed from useSuspenseQuery
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// Query keys for caching
export const itemKeys = {
  all: ["item"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  org_list: (orgId: string) => [...itemKeys.lists(), orgId] as const,
  filteredList: (dateFilter: any, searchQuery: string) =>
    [...itemKeys.lists(), { dateFilter, searchQuery }] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

/**
 * ✅ FIXED: Changed from useSuspenseQuery to useQuery
 * This fixes the Router update error
 */
export function useOrgItems(orgId: string) {
  const { data, refetch, error, isError, isLoading } = useQuery({ // ✅ Changed from useSuspenseQuery
    queryKey: itemKeys.org_list(orgId),
    queryFn: () => itemAPI.getAllBrief(orgId),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.message?.includes("Authentication failed")) {
        return false;
      }
      return failureCount < 2; // Retry twice for other errors
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!orgId, // Only run if orgId exists
  });

  // ✅ Show error toast if query fails (but not during initial load)
  if (isError && error && !isLoading) {
    toast.error("Failed to load items", {
      description: error?.message || "Please try refreshing the page",
    });
  }

  return {
    items: data || [], // ✅ Return empty array if data is undefined
    refetch,
    error,
    isError,
    isLoading, // ✅ Added isLoading for loading states
  };
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  // Create a new item
  return useMutation({
    mutationFn: (data: ItemCreateProps) => itemAPI.create(data),
    onSuccess: () => {
      toast.success("Item added successfully");
      // Invalidate items list to trigger a refetch
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to add item", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  // Delete a product
  return useMutation({
    mutationFn: (id: string) => itemAPI.delete(id),
    onSuccess: () => {
      toast.success("Item deleted successfully");
      // Invalidate products list to trigger a refetch
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete item", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}
/* export function useUpdateProduct() {
  const queryClient = useQueryClient();

  // Update an existing product
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductPayload }) =>
      itemAPI.update(id, data),
    onSuccess: (data, variables) => {
      toast.success("Product updated successfully");
      // Invalidate specific product detail and list queries
      queryClient.invalidateQueries({
        queryKey: itemKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Failed to update product", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}*/