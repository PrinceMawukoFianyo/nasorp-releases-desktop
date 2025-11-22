import { Suspense } from "react"

import { getInventoryItems, getInventoryItem } from "@/actions/inventory"


import type { InventoryItem } from "@/types/inventory"
import { getAuthenticatedUser } from "@/config/useAuth"
import { InventoryPageContent } from "./components/inventory-page-content"

interface InventoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const user = await getAuthenticatedUser()
  
  if (!user?.orgId) {
    return <div>Not authenticated</div>
  }

  const resolvedParams = await searchParams
  const selectedItemId = Array.isArray(resolvedParams.itemId) ? resolvedParams.itemId[0] : resolvedParams.itemId
  const searchQuery = Array.isArray(resolvedParams.search) ? resolvedParams.search[0] : resolvedParams.search

  // Fetch inventory items
  const items = await getInventoryItems(user.orgId, searchQuery || "")
  
  // Fetch selected item if specified
  let selectedItem: InventoryItem | null = null
  if (selectedItemId) {
    selectedItem = await getInventoryItem(selectedItemId, user.orgId)
  } else if (items.length > 0) {
    selectedItem = items[0]
  }

  return (
    <Suspense fallback={<div>Loading inventory...</div>}>
      <InventoryPageContent 
        initialItems={items} 
        initialSelectedItem={selectedItem}
        orgId={user.orgId}
      />
    </Suspense>
  )
}