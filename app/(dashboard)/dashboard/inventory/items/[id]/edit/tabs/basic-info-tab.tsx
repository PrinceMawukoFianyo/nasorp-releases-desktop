"use client"

import UpdateCard, { Option } from "./update-card"
import ImageUploadField from "./image-upload-field"
import type { ProductData } from "@/types/item"
import { useState } from "react"
import { updateItemById } from "@/actions/items"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FormSelectInput from "@/components/FormInputs/FormSelectInput"
import { toast } from "sonner"
import MultipleImageInput from "@/components/FormInputs/MultipleImageInput"

interface BasicInfoTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
}

export default function BasicInfoTab({ item, brandOptions, categoryOptions, onUpdate }: BasicInfoTabProps) {
  const [images, setImages] = useState({
    thumbnail: item.thumbnail || "",
    imageUrl: item.imageUrl || ["https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP", "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP","https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP", "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP", "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP"],
  })

  // State for category and brand selections
  const [selectedCategory, setSelectedCategory] = useState<Option | null>(
    categoryOptions.find(cat => cat.value === item.categoryId) || null
  )
  const [selectedBrand, setSelectedBrand] = useState<Option | null>(
    brandOptions.find(brand => brand.value === item.brandId) || null
  )
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (data: Record<string, any>) => {
    try {
      const result = await updateItemById(item.id, data)
      if (result.success) {
        onUpdate(data)
        toast.success("Item updated successfully")
      } else {
        toast.error("Failed to update item")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred while updating")
    }
  }

  const handleImageUpdate = (thumbnail: string, imageUrl: string[]) => {
    setImages({ thumbnail, imageUrl })
    handleUpdate({
      thumbnail,
      imageUrl,
    })
  }

  const handleCategoryBrandUpdate = async () => {
    setIsUpdating(true)
    try {
      const updateData: Record<string, any> = {}
      
      if (selectedCategory?.value !== item.categoryId) {
        updateData.categoryId = selectedCategory?.value || null
      }
      
      if (selectedBrand?.value !== item.brandId) {
        updateData.brandId = selectedBrand?.value || null
      }

      if (Object.keys(updateData).length > 0) {
        await handleUpdate(updateData)
      } else {
        toast.info("No changes detected")
      }
    } catch (error) {
      console.error("Category/Brand update error:", error)
      toast.error("Failed to update category/brand")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid gap-6">
      <UpdateCard
        title="Identity"
        subtitle="Name and SKU"
        fields={[
          {
            name: "name",
            label: "Item Name",
            type: "text",
            defaultValue: item.name,
            required: true,
          },
          {
            name: "slug",
            label: "URL Slug",
            type: "text",
            defaultValue: item.slug,
            required: true,
          },
        ]}
        onSubmit={handleUpdate}
      />

      <UpdateCard
        title="Product Identifiers"
        subtitle="Barcode and UPC codes"
        fields={[
          {
            name: "barcode",
            label: "Barcode",
            type: "text",
            defaultValue: item.barcode,
          },
          {
            name: "upc",
            label: "UPC",
            type: "text",
            defaultValue: item.upc,
          },
        ]}
        onSubmit={handleUpdate}
      />

      <UpdateCard
        title="Global Identifiers"
        subtitle="EAN and MPN codes"
        fields={[
          {
            name: "ean",
            label: "EAN",
            type: "text",
            defaultValue: item.ean,
          },
          {
            name: "mpn",
            label: "MPN",
            type: "text",
            defaultValue: item.mpn,
          },
        ]}
        onSubmit={handleUpdate}
      />

      <UpdateCard
        title="Book Info"
        subtitle="ISBN code"
        fields={[
          {
            name: "isbn",
            label: "ISBN",
            type: "text",
            defaultValue: item.isbn,
          },
        ]}
        onSubmit={handleUpdate}
        singleField
      />

      <UpdateCard
        title="Description"
        subtitle="Product description and details"
        fields={[
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: item.description,
          },
          {
            name: "isActive",
            label: "Active",
            type: "checkbox",
            defaultValue: item.isActive,
          },
        ]}
        onSubmit={handleUpdate}
      />

      <UpdateCard
        title="Physical Properties"
        subtitle="weight and dimensions"
        fields={[
          {
            name: "weight",
            label: "weight",
            type: "text",
            defaultValue: item.weight,
          },
          {
            name: "dimensions",
            label: "Dimensions",
            type: "text",
            defaultValue: item.dimensions,
            placeholder: "e.g., 10x20x30cm",
          },
        ]}
        onSubmit={handleUpdate}
      />

      {/* Updated Category & Brand Section with FormSelectInput */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category & Brand</CardTitle>
          <CardDescription>Product classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelectInput
                label="Category"
                options={categoryOptions}
                option={selectedCategory}
                setOption={setSelectedCategory}
                toolTipText="Add New Category"
                href="/dashboard/inventory/categories"
              />

              <FormSelectInput
                label="Brand"
                options={brandOptions}
                option={selectedBrand}
                setOption={setSelectedBrand}
                toolTipText="Add New Brand"
                href="/dashboard/inventory/brands"
              />
            </div>

            <Button 
              type="button" 
              onClick={handleCategoryBrandUpdate}
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? "Updating..." : "Update Category & Brand"}
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Media Section */}
      <div className="bg-card border border-input rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Media</h3>
          <p className="text-sm text-muted-foreground">Product images and thumbnails</p>
        </div>
        <div className="grid gap-3 w-full">
          <ImageUploadField
            label="Product Images"
            currentThumbnail={images.thumbnail}
            currentImages={images.imageUrl}
            onChange={handleImageUpdate}
          />
        </div>
      </div>
    </div>
  )
}