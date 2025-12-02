// hooks/useSupplierQueries.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BriefCustomerResponse,  CustomerCreateProps,  } from "@/types/customer";
import { createCustomer, deleteCustomer, getOrgCustomer, updateCustomerById } from "@/actions/customers";

// Query keys factory for better cache management
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters?: string) => [...customerKeys.lists(), { filters }] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

/**
 * Hook to fetch organization suppliers
 * Uses regular useQuery instead of useSuspenseQuery to avoid SSR issues
 */
export function useOrgCustomers() {
  const { data: customer, refetch, isLoading, error } = useQuery({
    queryKey: customerKeys.lists(),
    queryFn: async () => {
      const result = await getOrgCustomer();
      return result;
    },
    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 10, 
  });

  return {
    customers: customer || [],
    refetch,
    isLoading,
    error,
  };
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CustomerCreateProps) => {
      return await createCustomer(data);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate and refetch suppliers list
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
        
        toast.success("Success", {
          description: "Customer created successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to create customer",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to create customer",
      });
    },
  });
}

/**
 * Hook to update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CustomerCreateProps>;
    }) => {
      return await updateCustomerById(id, data);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate both the list and the specific customer detail
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: customerKeys.detail(variables.id),
        });

        toast.success("Success", {
          description: "Customer updated successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to update customer",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to update customer",
      });
    },
  });
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteCustomer(id);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate suppliers list to trigger refetch
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() });

        toast.success("Success", {
          description: "Customer deleted successfully",
        });
      } else {
        toast.error("Error", {
          description: result.error || "Failed to delete customer",
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to delete customer",
      });
    },
  });
}

/**
 * Hook to get a single customer by ID
 */
export function useCustomer(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      // You'll need to create this action
      const result = await getOrgCustomer();
      return result.find((s: BriefCustomerResponse) => s.id === id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    customer: data,
    isLoading,
    error,
  };
}