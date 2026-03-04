// hooks/useItemQueries.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// ✅ Import server actions directly — bypasses the HTTP API service layer
// which had its own network latency + a separate caching layer on top of
// React Query's own 5-minute staleTime, causing items to stay invisible
// after creation until two caches both expired.
import {
  getOrgBriefItems,
  deleteItem,
  deactivateItem,
} from "@/actions/items";
import { BriefItemResponse } from "@/types/item";

// ── Query keys ────────────────────────────────────────────────────────────────
// Kept compatible with the old shape so any code using itemKeys still compiles.
export const itemKeys = {
  all: ["item"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  org_list: (orgId: string) => [...itemKeys.lists(), orgId] as const,
  filteredList: (dateFilter: any, searchQuery: string) =>
    [...itemKeys.lists(), { dateFilter, searchQuery }] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// ── useOrgItems ───────────────────────────────────────────────────────────────
export function useOrgItems(orgId: string) {
  const { data, refetch, error, isError, isLoading, isFetching } = useQuery({
    queryKey: itemKeys.org_list(orgId),
    queryFn: async () => {
      const result = await getOrgBriefItems(orgId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to fetch items");
      }
      return (result.data ?? []) as BriefItemResponse[];
    },
    // ✅ FIX 1: Was 5 * 60 * 1000 (5 minutes).
    // With a 5-minute staleTime, React Query serves the old cached list for
    // up to 5 minutes after any mutation — so newly created items were
    // invisible and deleted items kept showing until the cache expired.
    // Setting to 0 means the list is always considered stale and refetches
    // on every mount and after every invalidation.
    staleTime: 0,

    // ✅ FIX 2: Refetch when the user switches back to the browser tab.
    // Covers the case where an item was created/deleted in another tab.
    refetchOnWindowFocus: true,

    // Keep showing previous data while a background refetch is in flight
    // so the table never flashes empty.
    placeholderData: (previousData) => previousData,

    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Authentication failed")) return false;
      return failureCount < 2;
    },
    enabled: !!orgId,
  });

  // Show error toast only after initial load completes (same behaviour as before)
  if (isError && error && !isLoading) {
    toast.error("Failed to load items", {
      description: (error as Error)?.message || "Please try refreshing the page",
    });
  }

  return {
    items: data ?? [],
    refetch,
    error,
    isError,
    isLoading,
    isFetching,
  };
}

// ── useDeleteItem ─────────────────────────────────────────────────────────────
// ✅ FIX 3: Was calling itemAPI.delete(id) — an HTTP service that goes through
// an API route. Now calls the server action directly, which also runs
// revalidatePath so Next.js server cache is busted at the same time.
//
// IMPORTANT CHANGE IN SIGNATURE: mutationFn now takes { id, orgId } instead
// of just id. Update call sites:
//   OLD: deleteItemMutation.mutate(item.id)
//   NEW: deleteItemMutation.mutate({ id: item.id, orgId })
//
// If you want to keep the old signature (just id), see the note below.
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const result = await deleteItem(id);
      if (!result.success) {
        // Throw so the caller's catch / onError receives the descriptive message
        // (e.g. "Item has sales history. Deactivate instead.")
        throw new Error(result.error ?? "Delete failed");
      }
      return { id, orgId };
    },
    onSuccess: ({ orgId }) => {
      // ✅ Invalidate immediately so the list refetches without a page reload
      queryClient.invalidateQueries({ queryKey: itemKeys.org_list(orgId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
    // item-listing.tsx shows its own toast with the "Deactivate instead" action,
    // so we intentionally do NOT call toast.error here to avoid double-toasting.
    onError: (error: Error) => {
      console.error("useDeleteItem error:", error.message);
    },
  });
}

// ── useDeactivateItem ─────────────────────────────────────────────────────────
// ✅ NEW: Soft-delete — sets isActive = false.
// Safe for any item regardless of related records.
// Used as the fallback when deleteItem fails due to FK constraints.
export function useDeactivateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const result = await deactivateItem(id);
      if (!result.success) {
        throw new Error(result.error ?? "Deactivation failed");
      }
      return { id, orgId };
    },
    onSuccess: ({ orgId }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.org_list(orgId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      toast.success("Item deactivated — it will no longer appear in lists");
    },
    onError: (error: Error) => {
      toast.error("Failed to deactivate item", { description: error.message });
    },
  });
}

// ── useCreateItem (kept for compatibility) ────────────────────────────────────
// NOTE: item-listing.tsx calls createItem directly (not via this hook) so this
// is only here for any other call sites that still use it.
// If nothing else uses it you can safely delete it.
import { createItem } from "@/actions/items";
import { ItemCreateProps } from "@/types/item";

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, orgId }: { data: ItemCreateProps; orgId: string }) => {
      const result = await createItem(data);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create item");
      }
      return { result, orgId };
    },
    onSuccess: ({ orgId }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.org_list(orgId) });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      toast.success("Item added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add item", {
        description: error.message || "Unknown error occurred",
      });
    },
  });
}