"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getSuppliers, getLocations, getItems, generatePONumber } from "@/actions/purchase-order"

import PurchaseOrderForm from "./purchase-order-form"


export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [generatedPONumber, setGeneratedPONumber] = useState<string>("")

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // Load all data including generating PO number
        const [suppliersData, locationsData, itemsData, poNumber] = await Promise.all([
          getSuppliers(),
          getLocations(),
          getItems(),
          generatePONumber() // Auto-generate PO number on page load
        ])
        
        setSuppliers(suppliersData || [])
        setLocations(locationsData || [])
        setItems(itemsData || [])
        setGeneratedPONumber(poNumber) // Set the generated PO number
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.error("Failed to load form data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading form data...</p>
        </div>
      </div>
    )
  }

  const showForm = suppliers.length > 0 && items.length > 0 && locations.length > 0

  return (
    <div className="min-h-screen bg-background">
      {showForm && (
        <div className="border-b px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create Purchase Order</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new purchase order for your suppliers
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {!showForm ? (
            <div className="space-y-8">
              {suppliers.length === 0 && (
                <div className="text-center py-12 border rounded-lg">
                  <p className="text-lg text-muted-foreground mb-4">
                    No suppliers found
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    You need to add suppliers before creating a purchase order
                  </p>
                  <Button onClick={() => router.push('/dashboard/suppliers/create')}>
                    Add Supplier
                  </Button>
                </div>
              )}
              
              {items.length === 0 && (
                <div className="text-center py-12 border rounded-lg">
                  <p className="text-lg text-muted-foreground mb-4">
                    No items found
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    You need to add items before creating a purchase order
                  </p>
                  <Button onClick={() => router.push('/dashboard/purchases/purchase-order')}>
                    Add Item
                  </Button>
                </div>
              )}
              
              {locations.length === 0 && (
                <div className="text-center py-12 border rounded-lg">
                  <p className="text-lg text-muted-foreground mb-4">
                    No delivery locations found
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    You need to add delivery locations before creating a purchase order
                  </p>
                  <Button onClick={() => router.push('/dashboard/settings/locations')}>
                    Add Location
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <PurchaseOrderForm
              suppliers={suppliers}
              items={items}
              deliveryLocations={locations}
              autoGeneratedPONumber={generatedPONumber} // Pass the auto-generated PO number
              onSuccess={(po) => {
                toast.success("Purchase order created successfully")
                router.push('/dashboard/purchases/purchase-orders')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}