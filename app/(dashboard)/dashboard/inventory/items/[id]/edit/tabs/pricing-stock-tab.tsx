"use client"

import { updateItemById } from "@/actions/items"
import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import FormSelectInput from "@/components/FormInputs/FormSelectInput"

interface PricingStockTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
  taxOptions?: Option[]
  unitOptions?: Option[]
}

export default function PricingStockTab({ 
  item, 
  onUpdate, 
  categoryOptions, 
  brandOptions, 
  taxOptions = [],
  unitOptions = []
}: PricingStockTabProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedTax, setSelectedTax] = useState<Option | null>(
    taxOptions.find(tax => tax.value === item.taxRateId) || null
  )
  const [selectedUnit, setSelectedUnit] = useState<Option | null>(
    unitOptions.find(unit => unit.value === item.unitId) || null
  )

  const handleUpdate = async (data: Record<string, any>) => {
    setIsUpdating(true)
    try {
      // Convert number fields to proper format
      const processedData: Record<string, any> = {}
      
      Object.keys(data).forEach(key => {
        if (key === 'costPrice' || key === 'sellingPrice' || key === 'tax' || 
            key === 'minStockLevel' || key === 'maxStockLevel') {
          // Convert to number, use undefined instead of null
          processedData[key] = data[key] !== '' ? Number.parseFloat(data[key]) : undefined
        } else if (key === 'isSerialTracked') {
          processedData[key] = Boolean(data[key])
        } else {
          processedData[key] = data[key]
        }
      })

      const result = await updateItemById(item.id, processedData)
      if (result.success) {
        onUpdate(processedData)
        toast.success("Item updated successfully")
      } else {
        toast.error("Failed to update item")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred while updating")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTaxAndUnitUpdate = async () => {
    setIsUpdating(true)
    try {
      const tax = selectedTax?.label.split("-")[0]?.trim() || ""
      const unit = selectedUnit?.label.split("-")[0]?.trim() || ""
      
      const data = {
        taxRateId: selectedTax?.value || undefined,
        unitId: selectedUnit?.value || undefined,
        unitOfMeasure: unit,
        tax: tax ? Number.parseFloat(tax) : undefined,
      }
      
      await updateItemById(item.id, data)
      toast.success("Tax and unit updated successfully")
      onUpdate(data)
    } catch (error) {
      toast.error("Failed to update tax and unit information")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQuickPriceUpdate = async (costPrice: string, sellingPrice: string) => {
    setIsUpdating(true)
    try {
      const data = {
        costPrice: costPrice ? Number.parseFloat(costPrice) : undefined,
        sellingPrice: sellingPrice ? Number.parseFloat(sellingPrice) : undefined,
      }
      
      const result = await updateItemById(item.id, data)
      if (result.success) {
        onUpdate(data)
        toast.success("Prices updated successfully")
      } else {
        toast.error("Failed to update prices")
      }
    } catch (error) {
      toast.error("Failed to update prices")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      {/* Pricing Section */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h3 className="text-lg font-semibold text-foreground">Pricing</h3>
          <p className="text-sm text-muted-foreground">Cost and selling price</p>
        </div>
        <UpdateCard
          title=""
          subtitle=""
          fields={[
            {
              name: "costPrice",
              label: "Cost Price",
              type: "number",
              step: "0.01",
              defaultValue: item.costPrice,
              placeholder: "0.00",
            },
            {
              name: "sellingPrice",
              label: "Selling Price",
              type: "number",
              step: "0.01",
              defaultValue: item.sellingPrice,
              placeholder: "0.00",
            },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* Tax and Unit Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax and Unit Information</CardTitle>
          <CardDescription>Tax rates and unit of measure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelectInput
                label="Tax Rate"
                options={taxOptions}
                option={selectedTax}
                setOption={setSelectedTax}
                toolTipText="Manage Tax Rates"
                href="/dashboard/settings/tax-rates"
              />

              <FormSelectInput
                label="Unit of Measure"
                options={unitOptions}
                option={selectedUnit}
                setOption={setSelectedUnit}
                toolTipText="Manage Units"
                href="/dashboard/inventory/units"
              />
            </div>

            <Button 
              type="button" 
              onClick={handleTaxAndUnitUpdate}
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? "Updating..." : "Update Tax & Unit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Tax and Unit Input */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h3 className="text-lg font-semibold text-foreground">Manual Tax and Unit Settings</h3>
          <p className="text-sm text-muted-foreground">Custom tax percentage and unit details</p>
        </div>
        <UpdateCard
          title=""
          subtitle=""
          fields={[
            {
              name: "tax",
              label: "Tax (%)",
              type: "number",
              step: "0.01",
              defaultValue: item.tax,
              placeholder: "0.00",
            },
            {
              name: "taxRateId",
              label: "Tax Rate ID",
              type: "text",
              defaultValue: item.taxRateId,
              placeholder: "Enter tax rate ID",
            },
          ]}
          onSubmit={handleUpdate}
        />
        <UpdateCard
          title="Unit Settings"
          subtitle="Unit of measure and unit ID"
          fields={[
            {
              name: "unitOfMeasure",
              label: "Unit of Measure",
              type: "text",
              defaultValue: item.unitOfMeasure,
              placeholder: "e.g., piece, kg, liter",
            },
            {
              name: "unitId",
              label: "Unit ID",
              type: "text",
              defaultValue: item.unitId,
            },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* Stock Levels Section */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h3 className="text-lg font-semibold text-foreground">Stock Levels</h3>
          <p className="text-sm text-muted-foreground">Minimum and maximum stock levels</p>
        </div>
        <UpdateCard
          title=""
          subtitle=""
          fields={[
            {
              name: "minStockLevel",
              label: "Minimum Stock Level",
              type: "number",
              defaultValue: item.minStockLevel,
              placeholder: "0",
            },
            {
              name: "maxStockLevel",
              label: "Maximum Stock Level",
              type: "number",
              defaultValue: item.maxStockLevel,
              placeholder: "0",
            },
          ]}
          onSubmit={handleUpdate}
        />
      </div>

      {/* Tracking Section */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h3 className="text-lg font-semibold text-foreground">Tracking</h3>
          <p className="text-sm text-muted-foreground">Serial number tracking</p>
        </div>
        <UpdateCard
          title=""
          subtitle=""
          fields={[
            {
              name: "isSerialTracked",
              label: "Serial Number Tracked",
              type: "checkbox",
              defaultValue: item.isSerialTracked,
            },
          ]}
          onSubmit={handleUpdate}
          singleField
        />
      </div>

      {/* Additional Stock Information */}
      <div className="bg-card border border-input rounded-lg p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h3 className="text-lg font-semibold text-foreground">Additional Information</h3>
          <p className="text-sm text-muted-foreground">Product status and availability</p>
        </div>
        <UpdateCard
          title=""
          subtitle=""
          fields={[
            {
              name: "isActive",
              label: "Product Active",
              type: "checkbox",
              defaultValue: item.isActive,
            },
          ]}
          onSubmit={handleUpdate}
        />
      </div>
    </div>
  )
}