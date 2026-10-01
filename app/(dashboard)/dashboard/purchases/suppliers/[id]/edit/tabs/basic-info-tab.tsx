"use client"

import UpdateCard from "./update-card"
import { Supplier } from "@/generated/prisma-client"
import { updateSupplierById } from "@/actions/suppliers"
import { toast } from "sonner"

interface BasicInfoTabProps {
  supplier: Supplier
  onUpdate: (data: Record<string, any>) => void
}

export default function BasicInfoTab({ supplier, onUpdate }: BasicInfoTabProps) {
  const handleUpdate = async (data: Record<string, any>) => {
    try {
      const result = await updateSupplierById(supplier.id, data)
      if (result.success) {
        onUpdate(data)
        toast.success("Supplier updated successfully")
      } else {
        toast.error("Failed to update supplier")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred while updating")
    }
  }

  return (
    <div className="grid gap-6">
      {/* Supplier Identity */}
      <UpdateCard
        title="Identity"
        subtitle="Supplier name and contact person"
        fields={[
          {
            name: "name",
            label: "Supplier Name",
            type: "text",
            defaultValue: supplier.name,
            required: true,
            placeholder: "Enter supplier name"
          },
          {
            name: "contactPerson",
            label: "Contact Person",
            type: "text",
            defaultValue: supplier.contactPerson || "",
            placeholder: "Enter contact person name"
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
            defaultValue: supplier.email || "",
            placeholder: "supplier@example.com"
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "text",
            defaultValue: supplier.phone || "",
            placeholder: "+1 234 567 8900"
          },
        ]}
        onSubmit={handleUpdate}
      />

      {/* Address */}
      <UpdateCard
        title="Address"
        subtitle="Supplier physical address"
        fields={[
          {
            name: "address",
            label: "Full Address",
            type: "textarea",
            defaultValue: supplier.address || "",
            placeholder: "Enter complete address including street, city, state, and postal code"
          },
        ]}
        onSubmit={handleUpdate}
        singleField
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
            defaultValue: supplier.taxId || "",
            placeholder: "Enter tax identification number"
          },
        ]}
        onSubmit={handleUpdate}
        singleField
      />

      {/* Payment Terms */}
      <UpdateCard
        title="Payment Terms"
        subtitle="Payment terms in days"
        fields={[
          {
            name: "paymentTerms",
            label: "Payment Terms (Days)",
            type: "number",
            defaultValue: supplier.paymentTerms || "",
            placeholder: "e.g., 30, 60, 90"
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
            defaultValue: supplier.notes || "",
            placeholder: "Add any additional notes or special instructions about this supplier"
          },
          {
            name: "isActive",
            label: "Active Supplier",
            type: "checkbox",
            defaultValue: supplier.isActive,
          },
        ]}
        onSubmit={handleUpdate}
      />
    </div>
  )
}