// hooks/useAdjustmentQueries.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAdjustments, approveAdjustment, cancelAdjustment } from "@/actions/stock-adjustments"
import { BriefAdjustmentResponse } from "@/types/stockAdjustments"

// Query key factory
export const adjustmentKeys = {
  all: ["adjustments"] as const,
  lists: () => [...adjustmentKeys.all, "list"] as const,
  list: (orgId: string) => [...adjustmentKeys.lists(), orgId] as const,
  details: () => [...adjustmentKeys.all, "detail"] as const,
  detail: (id: string) => [...adjustmentKeys.details(), id] as const,
}

// Fetch adjustments with React Query
export function useOrgAdjustments(orgId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adjustmentKeys.list(orgId),
    queryFn: async () => {
      const result = await getAdjustments(1, 1000) // Get all adjustments
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch adjustments")
      }
      return result.adjustments as BriefAdjustmentResponse[]
    },
    staleTime: 30000, // 30 seconds
  })

  return {
    adjustments: data ?? [],
    isLoading,
    error,
    refetch,
  }
}

// Approve adjustment mutation
export function useApproveAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adjustmentId: string) => {
      const result = await approveAdjustment(adjustmentId)
      if (!result.success) {
        throw new Error(result.error || "Failed to approve adjustment")
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adjustmentKeys.lists() })
      toast.success("Adjustment approved", {
        description: "Inventory levels have been updated successfully",
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to approve adjustment", {
        description: error.message,
      })
    },
  })
}

// Cancel adjustment mutation
export function useCancelAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adjustmentId: string) => {
      const result = await cancelAdjustment(adjustmentId)
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel adjustment")
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adjustmentKeys.lists() })
      toast.success("Adjustment cancelled", {
        description: "The adjustment has been cancelled successfully",
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to cancel adjustment", {
        description: error.message,
      })
    },
  })
}