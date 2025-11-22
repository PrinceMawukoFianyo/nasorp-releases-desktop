// hooks/useSupplierQueries.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSupplier,
  deleteSupplier,
  getOrgSupplier,
  updateSupplierById,
} from "@/actions/suppliers";
import { BriefSupplierResponse, SupplierCreateProps } from "@/types/types";

// Query keys factory for better cache management
export const supplierKeys = {
  all: ["items"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (filters?: string) => [...supplierKeys.lists(), { filters }] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

/**
 * Hook to fetch organization suppliers
 * Uses regular useQuery instead of useSuspenseQuery to avoid SSR issues
 */
export function useOrgSuppliers() {
  const { data, refetch, isLoading, error } = useQuery({
    queryKey: supplierKeys.lists(),
    queryFn: async () => {
      const result = await getOrgSupplier();
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  return {
    suppliers: data || [],
    refetch,
    isLoading,
    error,
  };
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SupplierCreateProps) => {
      return await createSupplier(data);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate and refetch suppliers list
        queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
        
        toast.success("Success", {
          description: "Supplier created successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to create supplier",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to create supplier",
      });
    },
  });
}

/**
 * Hook to update an existing supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SupplierCreateProps>;
    }) => {
      return await updateSupplierById(id, data);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate both the list and the specific supplier detail
        queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: supplierKeys.detail(variables.id),
        });

        toast.success("Success", {
          description: "Supplier updated successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to update supplier",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to update supplier",
      });
    },
  });
}

/**
 * Hook to delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteSupplier(id);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate suppliers list to trigger refetch
        queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });

        toast.success("Success", {
          description: "Supplier deleted successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to delete supplier",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to delete supplier",
      });
    },
  });
}

/**
 * Hook to get a single supplier by ID
 */
export function useSupplier(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: async () => {
      // You'll need to create this action
      const result = await getOrgSupplier();
      return result.find((s: BriefSupplierResponse) => s.id === id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    supplier: data,
    isLoading,
    error,
  };
}