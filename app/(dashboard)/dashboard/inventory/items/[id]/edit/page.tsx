"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getItemById } from "@/actions/items"
import type { ProductData } from "@/types/item"
import { toast } from "sonner"
import ProductPreviewHeader from "./product-preview-header"
import BasicInfoTab from "./tabs/basic-info-tab"
import SpecificationsTab from "./tabs/specifications-tab"
import PricingStockTab from "./tabs/pricing-stock-tab"
import { Spinner } from "@/components/ui/spinner"
import { getOrgCategories } from "@/actions/categories"
import { getOrgBrands } from "@/actions/brands"
import { getOrgLocations } from "@/actions/locations" // NEW

interface Option {
  label: string
  value: string
}

export default function ItemUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [item, setItem] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandOptions, setBrandOptions] = useState<Option[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([])
  const [locationOptions, setLocationOptions] = useState<Option[]>([]) // NEW

  useEffect(() => {
    async function loadData() {
      try {
        const id = (await params).id
        const { data: itemData, success, error } = await getItemById(id)

        if (success && itemData) {
          setItem(itemData as ProductData)

          // Fetch categories, brands, and locations in parallel
          const [categories, brands, locations] = await Promise.all([
            getOrgCategories(itemData.orgId),
            getOrgBrands(itemData.orgId),
            getOrgLocations(),
          ])

          setBrandOptions(
            brands.map((b) => ({ label: b.name, value: b.id }))
          )
          setCategoryOptions(
            categories.map((c) => ({ label: c.title, value: c.id }))
          )
          // NEW — adjust field names to match your Location model
          setLocationOptions(
            locations.map((loc) => ({
              label: `${loc.name}${loc.type ? ` (${loc.type})` : ""}`,
              value: loc.id,
            }))
          )
        } else {
          toast.error("Failed to load item", {
            description: error || "Unable to fetch item data",
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

  const handleUpdate = (updatedData: Record<string, any>) => {
    setItem((prev) => (prev ? { ...prev, ...updatedData } : null))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">Item not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <ProductPreviewHeader
          brandOptions={brandOptions}
          categoryOptions={categoryOptions}
          item={item}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Update Item Details
          </h1>
          <p className="text-muted-foreground">
            Update item details efficiently. Each card can be updated
            independently without affecting other fields.
          </p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <BasicInfoTab
              brandOptions={brandOptions}
              categoryOptions={categoryOptions}
              item={item}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <SpecificationsTab
              brandOptions={brandOptions}
              categoryOptions={categoryOptions}
              item={item}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <PricingStockTab
              brandOptions={brandOptions}
              categoryOptions={categoryOptions}
              locationOptions={locationOptions} 
              item={item}
              onUpdate={handleUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}