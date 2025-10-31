// hooks/useProductQueries.ts
import { itemAPI } from "@/services/items";
import { ItemCreateProps } from "@/types/item";
import {
  useQuery,
  useSuspenseQuery,
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
 * Hook for fetching products with React Suspense
 * Use this when the component is wrapped in a Suspense boundary
 */
// export function useSuspenseProducts() {
//   // Get all products with Suspense (data is guaranteed to be defined)
//   const { data: products, refetch } = useSuspenseQuery({
//     queryKey: itemKeys.lists(),
//     queryFn: itemAPI.getAll,
//   });

//   return {
//     products,
//     refetch,
//   };
// }

export function useOrgItems(orgId: string) {
  // Get an item a particular organisation
  const {data: items, refetch} = useSuspenseQuery({
    queryKey: itemKeys.org_list(orgId),
    queryFn: () => itemAPI.getAllBrief(orgId),

  });
  return {
    items,
    refetch,
  }
  
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

export function useDeleteItem() {
  const queryClient = useQueryClient();

  // Delete a product
  return useMutation({
    mutationFn: (id: string) => itemAPI.delete(id),
    onSuccess: () => {
      toast.success("item deleted successfully");
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
