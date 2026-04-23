import { Suspense } from "react"
import { getInventoryItems, getInventoryItem } from "@/actions/inventory"
import type { InventoryItem } from "@/types/inventory"
import { getAuthenticatedUser } from "@/config/useAuth"
import { InventoryPageContent } from "./components/inventory-page-content"

export default async function InventoryPage({ searchParams }: any) {
  const user = await getAuthenticatedUser()
  if (!user?.orgId) return <div>Not authenticated</div>

  const resolvedParams = await searchParams
  const selectedItemId = resolvedParams.itemId
  const searchQuery = resolvedParams.search || ""

  const items = await getInventoryItems(user.orgId, searchQuery)
  let selectedItem: InventoryItem | null = null
  if (selectedItemId) {
    selectedItem = await getInventoryItem(selectedItemId, user.orgId)
  } else if (items.length > 0) {
    selectedItem = items[0]
  }

  return (
    <Suspense fallback={<div>Loading inventory...</div>}>
      <InventoryPageContent initialItems={items} initialSelectedItem={selectedItem} orgId={user.orgId} />
    </Suspense>
  )
}