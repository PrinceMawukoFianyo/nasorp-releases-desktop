// hooks/usePurchaseQueries.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSupplier,
  deleteSupplier,
  getOrgSupplier
 
} from "@/actions/suppliers";
import { BriefSupplierResponse, SupplierCreateProps } from "@/types/types";
import PurchaseOrderLineItem from "@/app/(dashboard)/dashboard/purchases/purchase-orders/create/purchase-order-line-item";
import { getPurchaseOrderLineItems } from "@/actions/purchase-order";

// Query keys factory for better cache management
export const purchaseOrderKeys = {
  all: ["items"] as const,
  lists: () => [...purchaseOrderKeys.all, "list"] as const,
  list: (filters?: string) => [...purchaseOrderKeys.lists(), { filters }] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
};

/**
 * Hook to fetch organization suppliers
 * Uses regular useQuery instead of useSuspenseQuery to avoid SSR issues
 */
export function usePurchaseOrderItems(purchaseOrderId: string) {
  //Get items in a particular PO
  const { data:lines, refetch, isLoading, error } = useQuery({
    queryKey: purchaseOrderKeys.detail(purchaseOrderId),
    queryFn: () => getPurchaseOrderLineItems(purchaseOrderId)
  });

  return {
    lines,
    refetch,
    isLoading,
    error,
  };
}
