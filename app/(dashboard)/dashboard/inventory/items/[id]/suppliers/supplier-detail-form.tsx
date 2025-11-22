"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Trash2 } from 'lucide-react'

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

interface SupplierDetailFormProps {
  supplier: ItemSupplier | null
  isLoading: boolean
  onUpdate: (data: Record<string, any>) => Promise<void>
  onDelete: (supplierId: string) => Promise<void>
}

export default function SupplierDetailForm({
  supplier,
  isLoading,
  onUpdate,
  onDelete,
}: SupplierDetailFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (supplier) {
      console.log("SupplierDetailForm: Setting form data for supplier:", supplier.id)
      setFormData({
        isPreferred: supplier.isPreferred || false,
        supplierSku: supplier.supplierSku || "",
        leadTime: supplier.leadTime || "",
        minOrderQty: supplier.minOrderQty || "",
        unitCost: supplier.unitCost || "",
        lastPurchaseDate: supplier.lastPurchaseDate || "",
        notes: supplier.notes || "",
      })
      setHasUnsavedChanges(false)
    }
  }, [supplier?.id]) // Only reset when supplier ID changes

  const handleChange = (name: string, value: any, type: string) => {
    let newValue = value
    
    if (type === "checkbox") {
      newValue = !formData[name]
    }
    
    setFormData((prev) => ({ ...prev, [name]: newValue }))
    setHasUnsavedChanges(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasUnsavedChanges) {
      toast.info("No changes to save")
      return
    }

    setIsSubmitting(true)

    try {
      const changedFields: Record<string, any> = {}

      // Collect changed fields
      if (formData.isPreferred !== (supplier?.isPreferred || false)) {
        changedFields.isPreferred = formData.isPreferred
      }
      if (formData.supplierSku !== (supplier?.supplierSku || "")) {
        changedFields.supplierSku = formData.supplierSku
      }
      if (formData.leadTime !== (supplier?.leadTime || "")) {
        if (formData.leadTime) {
          changedFields.leadTime = parseInt(formData.leadTime)
        }
      }
      if (formData.minOrderQty !== (supplier?.minOrderQty || "")) {
        if (formData.minOrderQty) {
          changedFields.minOrderQty = parseInt(formData.minOrderQty)
        }
      }
      if (formData.unitCost !== (supplier?.unitCost || "")) {
        if (formData.unitCost) {
          changedFields.unitCost = parseFloat(formData.unitCost)
        }
      }
      if (formData.lastPurchaseDate !== (supplier?.lastPurchaseDate || "")) {
        changedFields.lastPurchaseDate = formData.lastPurchaseDate
      }
      if (formData.notes !== (supplier?.notes || "")) {
        changedFields.notes = formData.notes
      }

      if (Object.keys(changedFields).length === 0) {
        toast.info("No changes detected")
        setIsSubmitting(false)
        setHasUnsavedChanges(false)
        return
      }

      await onUpdate(changedFields)
      setHasUnsavedChanges(false)
      toast.success("Supplier updated successfully")
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!supplier) return

    if (!confirm("Are you sure you want to remove this supplier? This action cannot be undone.")) {
      return
    }

    try {
      await onDelete(supplier.id)
    } catch (error) {
      toast.error("Failed to remove supplier", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    }
  }

  if (!supplier) {
    console.log("SupplierDetailForm: No supplier provided, showing placeholder")
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground text-center">
          Select a supplier from the list to view and edit details
        </p>
      </div>
    )
  }

  console.log("SupplierDetailForm: Rendering form for supplier:", supplier.supplierName)

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Supplier Header */}
        <div className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{supplier.supplierName}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Added on {new Date(supplier.addedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {supplier.contactPerson && (
                <p className="text-sm text-muted-foreground">Contact: {supplier.contactPerson}</p>
              )}
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preferred Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPreferred"
              checked={formData.isPreferred || false}
              onCheckedChange={() => handleChange("isPreferred", undefined, "checkbox")}
              disabled={isSubmitting || isLoading}
            />
            <Label htmlFor="isPreferred" className="font-normal cursor-pointer">
              Mark as Preferred Supplier
            </Label>
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier SKU */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="supplierSku" className="text-sm font-medium">
                Supplier SKU
              </Label>
              <Input
                id="supplierSku"
                type="text"
                value={formData.supplierSku || ""}
                onChange={(e) => handleChange("supplierSku", e.target.value, "text")}
                disabled={isSubmitting || isLoading}
                placeholder="e.g., SKU-12345"
              />
              <p className="text-xs text-muted-foreground">
                The supplier's product code
              </p>
            </div>

            {/* Lead Time */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="leadTime" className="text-sm font-medium">
                Lead Time (Days)
              </Label>
              <Input
                id="leadTime"
                type="number"
                value={formData.leadTime || ""}
                onChange={(e) => handleChange("leadTime", e.target.value, "number")}
                disabled={isSubmitting || isLoading}
                placeholder="e.g., 7"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Days to deliver from order
              </p>
            </div>

            {/* Min Order Qty */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="minOrderQty" className="text-sm font-medium">
                Minimum Order Quantity
              </Label>
              <Input
                id="minOrderQty"
                type="number"
                value={formData.minOrderQty || ""}
                onChange={(e) => handleChange("minOrderQty", e.target.value, "number")}
                disabled={isSubmitting || isLoading}
                placeholder="e.g., 50"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Minimum units per order
              </p>
            </div>

            {/* Unit Cost */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="unitCost" className="text-sm font-medium">
                Unit Cost
              </Label>
              <Input
                id="unitCost"
                type="number"
                value={formData.unitCost || ""}
                onChange={(e) => handleChange("unitCost", e.target.value, "number")}
                disabled={isSubmitting || isLoading}
                placeholder="e.g., 15.50"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Cost per unit
              </p>
            </div>

            {/* Last Purchase Date */}
            <div className="flex flex-col space-y-2 md:col-span-2">
              <Label htmlFor="lastPurchaseDate" className="text-sm font-medium">
                Last Purchase Date
              </Label>
              <Input
                id="lastPurchaseDate"
                type="date"
                value={formData.lastPurchaseDate || ""}
                onChange={(e) => handleChange("lastPurchaseDate", e.target.value, "text")}
                disabled={isSubmitting || isLoading}
              />
              <p className="text-xs text-muted-foreground">
                When was the last purchase
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value, "textarea")}
              disabled={isSubmitting || isLoading}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-24 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add any notes about this supplier..."
            />
            <p className="text-xs text-muted-foreground">
              Additional information or terms
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || !hasUnsavedChanges}
              className="flex-1"
            >
              {isSubmitting ? "Updating..." : "Update Supplier"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={isSubmitting || isLoading}
              title="Remove this supplier"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}