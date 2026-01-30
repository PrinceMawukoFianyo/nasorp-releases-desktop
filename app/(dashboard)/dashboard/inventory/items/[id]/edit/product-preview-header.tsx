"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProductData } from "@/types/item"

interface ProductPreviewHeaderProps {
  item: ProductData
  categoryOptions: Option[]
  brandOptions: Option[]
}

interface Option {
  label: string
  value: string
}

export default function ProductPreviewHeader({ item, brandOptions, categoryOptions }: ProductPreviewHeaderProps) {
  const primaryImage = item.thumbnail || item.imageUrl?.[0] || "/diverse-products-still-life.png"
  
  // Find the category and brand labels safely
  const categoryLabel = categoryOptions.find(opt => opt.value === item.categoryId)?.label || item.categoryId
  const brandLabel = brandOptions.find(opt => opt.value === item.brandId)?.label || item.brandId

  return (
    <Card className="overflow-hidden mb-8 border-0 shadow-md">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Product Image Section */}
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden h-80">
            <Image
              src={primaryImage || "/placeholder.svg"}
              alt={item.name || "Product image"}
              width={300}
              height={300}
              className="object-cover w-full h-full"
              priority
            />
          </div>

          {/* Product Details Section */}
          <div className="md:col-span-2 flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground truncate">{item.name}</h2>
              <p className="text-muted-foreground text-sm">SKU: {item.sku}</p>
              <p className="text-muted-foreground text-sm break-all">Slug: {item.slug}</p>
            </div>

            {/* Quick Info Badges */}
            <div className="flex flex-wrap gap-2">
              {item.isActive && (
                <Badge variant="default" className="bg-green-600">
                  Active
                </Badge>
              )}
              {item.isSerialTracked && <Badge variant="outline">Serial Tracked</Badge>}
              {item.categoryId && <Badge variant="secondary">Category: {categoryLabel}</Badge>}
              {item.brandId && <Badge variant="secondary">Brand: {brandLabel}</Badge>}
            </div>

            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Selling Price</p>
                <p className="text-lg font-bold text-foreground">GH₵{item.sellingPrice?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Stock Level</p>
                <p className="text-lg font-bold text-foreground">Min: {item.minStockLevel || 0}</p>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-semibold">Description</p>
                <p className="text-sm text-foreground line-clamp-3">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Images Preview */}
        {item.imageUrl && item.imageUrl.length > 1 && (
          <div className="border-t border-border px-6 py-4 bg-muted/30">
            <p className="text-xs text-muted-foreground font-semibold mb-3">Additional Images</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {item.imageUrl.map((url, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-20 h-20 bg-background rounded-md overflow-hidden border border-border"
                >
                  <Image
                    src={url || "/placeholder.svg"}
                    alt={`Product image ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}