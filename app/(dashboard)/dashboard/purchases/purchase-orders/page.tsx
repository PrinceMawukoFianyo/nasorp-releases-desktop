"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { getPurchaseOrders, cancelPurchaseOrder } from "@/actions/purchase-order"
import PurchaseOrderCard from "./components/purchase-order-card"
import PurchaseOrderDetailView from "./components/purchase-order-detail-view"
import { ReceiveInventoryModal } from "./components/receive-inventory-modal"

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [selectedPO, setSelectedPO] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [poToReceive, setPOToReceive] = useState<any | null>(null)

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true)
      const data = await getPurchaseOrders()
      
      console.log("Loaded POs:", data)
      
      setPurchaseOrders(data)
      
      // Auto-select first PO if available and none is selected
      if (data.length > 0 && !selectedPO) {
        setSelectedPO(data[0])
      }
      
      // Update selected PO if it was modified
      if (selectedPO) {
        const updatedPO = data.find((po: any) => po.id === selectedPO.id)
        if (updatedPO) {
          setSelectedPO(updatedPO)
        }
      }
    } catch (error) {
      console.error("Failed to load purchase orders:", error)
      toast.error("Failed to load purchase orders")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    router.push("/dashboard/purchases/purchase-orders/create")
  }

  const handleSelectPO = (po: any) => {
    setSelectedPO(po)
  }

  const handleEdit = (po: any) => {
    router.push(`/dashboard/purchases/purchase-orders/${po.id}/edit`)
  }

  const handleCancel = async (po: any) => {
    if (!confirm("Are you sure you want to cancel this purchase order?")) {
      return
    }

    try {
      const result = await cancelPurchaseOrder(po.id)
      if (result.success) {
        toast.success("Purchase order cancelled successfully")
        await loadPurchaseOrders()
      } else {
        toast.error(result.error || "Failed to cancel purchase order")
      }
    } catch (error) {
      toast.error("Failed to cancel purchase order")
    }
  }

  const handleReceiveInventory = (po: any) => {
    console.log("Opening receive modal for PO:", po)
    console.log("PO has lines:", po.lines?.length || 0)
    setPOToReceive(po)
    setShowReceiveModal(true)
  }

  const handleCloseModal = () => {
    console.log("Closing receive modal")
    setShowReceiveModal(false)
    setPOToReceive(null)
    // Reload purchase orders after closing modal to get updated data
    loadPurchaseOrders()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    toast.info("Export functionality coming soon")
  }

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading purchase orders...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-screen bg-background flex flex-col">
        {/* Header Section */}
        <div className="border-b px-4 py-2 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Purchase Orders</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your purchase orders and track deliveries
                </p>
              </div>
              <Button 
                onClick={handleCreateNew} 
                className="gap-2 bg-rose-600 hover:bg-rose-700"
              >
                Create Purchase Order
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Left Panel - PO List */}
              <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
                {/* Search */}
                <div className="relative flex-shrink-0 mb-4">
                  <Input
                    placeholder="Search PO number or supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                {/* PO Cards - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredPOs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {searchQuery ? (
                        <>
                          <p>No purchase orders found</p>
                          <p className="text-sm mt-2">Try a different search term</p>
                        </>
                      ) : (
                        <>
                          <p>No purchase orders found</p>
                          <Button
                            onClick={handleCreateNew}
                            className="mt-4"
                            variant="outline"
                          >
                            Create Your First PO
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredPOs.map((po) => (
                      <PurchaseOrderCard
                        key={po.id}
                        purchaseOrder={po}
                        isSelected={selectedPO?.id === po.id}
                        onClick={() => handleSelectPO(po)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* RiUSt Panel - PO Details */}
              <div className="lg:col-span-2 h-full overflow-hidden">
                {selectedPO ? (
                  <div className="h-full border rounded-lg bg-white overflow-hidden">
                    <PurchaseOrderDetailView
                      purchaseOrder={selectedPO}
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onPrint={handlePrint}
                      onExport={handleExport}
                      onRefresh={loadPurchaseOrders}
                      onReceiveInventory={handleReceiveInventory}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full border rounded-lg bg-white">
                    <div className="text-center">
                      <p className="text-lg text-muted-foreground mb-2">
                        No purchase order selected
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        Select a purchase order from the list
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Inventory Modal - Rendered outside main content */}
      {poToReceive && showReceiveModal && (
        <ReceiveInventoryModal
          open={showReceiveModal}
          onOpenChange={handleCloseModal}
          purchaseOrder={poToReceive}
          locationId={poToReceive.deliveryLocationId || ""}
        />
      )}
    </>
  )
}