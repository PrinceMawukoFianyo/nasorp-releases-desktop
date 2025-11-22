"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getBriefItemById } from "@/actions/items"
import { getItemSuppliers, removeItemSupplier, updateItemSupplier } from "@/actions/item-supplier"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import SupplierDetailForm from "./supplier-detail-form"
import SupplierList from "./supplier-list"
import AddSupplierModal from "./add-supplier-modal"


interface ItemData {
  id: string
  name: string
  sku: string
  orgId: string
  thumbnail?: string
  sellingPrice?: number
  supplierRelations?: Array<{
    supplierId: string
  }>
}

interface ItemSupplier {
  id: string
  supplierName: string
  contactPerson?: string
  email?: string
  phone?: string
  costPrice?: number
  isActive: boolean
  addedDate: Date
  isPreferred?: boolean
  supplierSku?: string
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: string
  notes?: string
}

export default function ItemSuppliersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [item, setItem] = useState<ItemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<ItemSupplier[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemId, setItemId] = useState<string>("")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>()
  const [isUpdating, setIsUpdating] = useState(false)

  // Function to refresh suppliers list
  const refreshSuppliers = async (itemIdToRefresh: string) => {
    try {
      const itemSuppliersResult = await getItemSuppliers(itemIdToRefresh)
      if (itemSuppliersResult.success && itemSuppliersResult.data) {
        console.log("Refreshed suppliers:", itemSuppliersResult.data)
        setSuppliers(itemSuppliersResult.data)
        return itemSuppliersResult.data
      } else {
        console.error("Failed to refresh suppliers:", itemSuppliersResult.error)
        toast.error("Failed to load suppliers", {
          description: itemSuppliersResult.error || "Unable to fetch suppliers data",
        })
        return []
      }
    } catch (error) {
      console.error("Error refreshing suppliers:", error)
      return []
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params
        const id = resolvedParams.id
        console.log("Loading data for item ID:", id)
        setItemId(id)

        const itemData = await getBriefItemById(id)
        console.log("Item data loaded:", itemData)

        if (itemData) {
          setItem(itemData)

          // Fetch suppliers for this item
          const loadedSuppliers = await refreshSuppliers(id)
          
          // Only auto-select first supplier if nothing is currently selected
          if (loadedSuppliers.length > 0 && !selectedSupplierId) {
            console.log("Auto-selecting first supplier:", loadedSuppliers[0].id)
            setSelectedSupplierId(loadedSuppliers[0].id)
          }
        } else {
          toast.error("Failed to load item", {
            description: "Unable to fetch item data",
          })
        }
      } catch (error) {
        console.error("Failed to load item:", error)
        toast.error("Error loading item", {
          description: "An unexpected error occurred",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params])

  // Find selected supplier
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null
  
  // Debug logging
  useEffect(() => {
    console.log("=== SELECTION DEBUG ===")
    console.log("selectedSupplierId:", selectedSupplierId)
    console.log("suppliers count:", suppliers.length)
    console.log("selectedSupplier:", selectedSupplier)
    console.log("=====================")
  }, [selectedSupplierId, suppliers])

  const handleUpdateSupplier = async (data: Record<string, any>) => {
    if (!selectedSupplierId) return

    setIsUpdating(true)
    try {
      // Include itemId in the data object
      const result = await updateItemSupplier(selectedSupplierId, {
        ...data,
        itemId: itemId,
      })

      if (result.success) {
        // Update local state to reflect changes immediately
        setSuppliers((prev) =>
          prev.map((s) => {
            // If this supplier is being marked as preferred
            if (data.isPreferred === true && s.id === selectedSupplierId) {
              return { ...s, ...data, isPreferred: true }
            }
            // Unmark all other suppliers as preferred
            else if (data.isPreferred === true && s.id !== selectedSupplierId) {
              return { ...s, isPreferred: false }
            }
            // For the selected supplier with other updates
            else if (s.id === selectedSupplierId) {
              return { ...s, ...data }
            }
            // Keep other suppliers as is
            return s
          })
        )
        
        // Return success without showing toast (form will show toast)
        return
      } else {
        throw new Error("Failed to update supplier")
      }
    } catch (error) {
      // Only show error toast
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      const result = await removeItemSupplier(supplierId)
      if (result.success) {
        toast.success("Supplier removed successfully")
        // Remove from local state
        setSuppliers((prev) => prev.filter((s) => s.id !== supplierId))
        // Clear selection if the deleted supplier was selected
        if (selectedSupplierId === supplierId) {
          const remainingSuppliers = suppliers.filter((s) => s.id !== supplierId)
          setSelectedSupplierId(remainingSuppliers[0]?.id)
        }
      } else {
        throw new Error(result.error || "Failed to remove supplier")
      }
    } catch (error) {
      toast.error("Failed to remove supplier", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
      throw error
    }
  }

  // Get existing supplier IDs from item data
  const existingSupplierIds = item?.supplierRelations?.map((is) => is.supplierId) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Item not found</h2>
            <p className="text-muted-foreground mb-4">
              The item you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push("/dashboard/inventory/items")}>
              Back to Items
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => router.push("/dashboard/inventory/items")}
                >
                  Items
                </span>
                <span>/</span>
                <span>Suppliers</span>
              </div>
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                SKU: {item.sku}
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Suppliers
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Left Sidebar - Supplier List */}
          <div className="md:col-span-1 h-full hidden md:flex flex-col border-r bg-card">
            <SupplierList
              suppliers={suppliers}
              selectedSupplierId={selectedSupplierId}
              onSelectSupplier={(id) => {
                console.log("Manually selecting supplier:", id)
                setSelectedSupplierId(id)
              }}
              isLoading={isUpdating}
            />
          </div>

          {/* Right Panel - Detail Form */}
          <div className="md:col-span-2 h-full flex flex-col bg-background">
            {suppliers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No suppliers added yet
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Start by adding suppliers to track where you purchase this item from
                </p>
                <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Your First Supplier
                </Button>
              </div>
            ) : selectedSupplier ? (
              <SupplierDetailForm
                supplier={selectedSupplier}
                isLoading={isUpdating}
                onUpdate={handleUpdateSupplier}
                onDelete={handleDeleteSupplier}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No supplier selected or supplier not found
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Selected ID: {selectedSupplierId || "none"}</p>
                  <p>Total suppliers: {suppliers.length}</p>
                  {suppliers.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Available supplier IDs:</p>
                      {suppliers.map((s, i) => (
                        <p key={i}>{i + 1}. {s.id} - {s.supplierName}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile - Supplier List (Shown only on small screens) */}
          <div className="md:hidden col-span-1 h-full">
            {selectedSupplierId ? (
              selectedSupplier ? (
                <SupplierDetailForm
                  supplier={selectedSupplier}
                  isLoading={isUpdating}
                  onUpdate={handleUpdateSupplier}
                  onDelete={handleDeleteSupplier}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    Loading supplier...
                  </p>
                </div>
              )
            ) : (
              <SupplierList
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
                isLoading={isUpdating}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={itemId}
        existingSupplierIds={existingSupplierIds}
        onSuppliersAdded={async (newSuppliers) => {
          // Store the current selection before refresh
          const currentSelection = selectedSupplierId
          
          // Fetch the complete updated list from the server
          const loadedSuppliers = await refreshSuppliers(itemId)
          
          // Maintain the previous selection if it still exists
          if (currentSelection && loadedSuppliers.find(s => s.id === currentSelection)) {
            setSelectedSupplierId(currentSelection)
          }
          // If no previous selection or it doesn't exist, select first new supplier
          else if (newSuppliers.length > 0) {
            setSelectedSupplierId(newSuppliers[0].id)
          }
          // Fallback to first available supplier
          else if (loadedSuppliers.length > 0) {
            setSelectedSupplierId(loadedSuppliers[0].id)
          }
        }}
      />
    </div>
  )
}