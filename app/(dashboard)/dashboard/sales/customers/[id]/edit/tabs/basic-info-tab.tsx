"use client"

import UpdateCard from "./update-customer"
import { Customer } from "@prisma/client"
import { updateCustomerById } from "@/actions/customers"
import { toast } from "sonner"
import ImageUploadField from "./image-upload-field"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface BasicInfoTabProps {
  customer: Customer & { imageUrl?: string | null }
  onUpdate: (data: Record<string, any>) => void
}

export default function BasicInfoTab({ customer, onUpdate }: BasicInfoTabProps) {
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false)

  const handleUpdate = async (data: Record<string, any>) => {
    try {
      const result = await updateCustomerById(customer.id, data)
      if (result.success) {
        onUpdate(data)
        toast.success("Customer updated successfully")
      } else {
        toast.error("Failed to update customer", {
          description: result.error || "Unknown error"
        })
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred while updating")
    }
  }

  const handleLogoUpdate = async (thumbnail: string) => {
    setIsUpdatingLogo(true)
    try {
      // If thumbnail is empty, remove the image
      const imageValue = thumbnail || undefined
      
      const result = await updateCustomerById(customer.id, { 
        imageUrl: imageValue
      })
      
      if (result.success) {
        // Update local state with the new value
        onUpdate({ imageUrl: imageValue })
        
        if (!thumbnail) {
          toast.success("Customer logo removed successfully")
        } else {
          toast.success("Customer logo updated successfully")
        }
      } else {
        toast.error("Failed to update logo", {
          description: result.error || "Unknown error"
        })
        throw new Error(result.error || "Update failed")
      }
    } catch (error) {
      console.error("Logo update error:", error)
      toast.error("An error occurred while updating logo")
      throw error // Re-throw to let ImageUploadField handle the error state
    } finally {
      setIsUpdatingLogo(false)
    }
  }

  return (
    <div className="grid gap-6">
      {/* Back Button */}
      <Link
        href="/dashboard/sales/customers"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Customer Logo Upload - Moved to Top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Logo</CardTitle>
          <CardDescription>
            Upload customer logo or brand image (displayed in header and listing)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            label="Logo Image"
            currentThumbnail={customer.imageUrl}
            currentImages={[]}
            onChange={handleLogoUpdate}
            isUploading={isUpdatingLogo}
          />
        </CardContent>
      </Card>

      {/* Customer Identity */}
      <UpdateCard
        title="Customer Identity"
        subtitle="Customer name and Address"
        fields={[
          {
            name: "name",
            label: "Customer Name",
            type: "text",
            defaultValue: customer.name,
            required: true,
            placeholder: "Enter customer name"
          },
          {
            name: "address",
            label: "Full Address",
            type: "text",
            defaultValue: customer.address || "",
            placeholder: "Enter complete address including street, city, state, and postal code"
          },
        ]}
        onSubmit={handleUpdate}
      />

      {/* Contact Information */}
      <UpdateCard
        title="Contact Information"
        subtitle="Email and phone details"
        fields={[
          {
            name: "email",
            label: "Email Address",
            type: "text",
            defaultValue: customer.email || "",
            required: true,
            placeholder: "customer@example.com"
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "text",
            defaultValue: customer.phone || "",
            required: true,
            placeholder: "+1 234 567 8900"
          },
        ]}
        onSubmit={handleUpdate}
      />

      {/* Tax Information */}
      <UpdateCard
        title="Tax Information"
        subtitle="Tax identification number"
        fields={[
          {
            name: "taxId",
            label: "Tax ID / VAT Number",
            type: "text",
            defaultValue: customer.taxId || "",
            placeholder: "Enter tax identification number"
          },
        ]}
        onSubmit={handleUpdate}
        singleField
      />

      {/* Notes & Status */}
      <UpdateCard
        title="Notes & Status"
        subtitle="Additional information and active status"
        fields={[
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: customer.notes || "",
            placeholder: "Add any additional notes or special instructions about this customer"
          },
          {
            name: "isActive",
            label: "Active Customer",
            type: "checkbox",
            defaultValue: customer.isActive,
          },
        ]}
        onSubmit={handleUpdate}
      />
    </div>
  )
}