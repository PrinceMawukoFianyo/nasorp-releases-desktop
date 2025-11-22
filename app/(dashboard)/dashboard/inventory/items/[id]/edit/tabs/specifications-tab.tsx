"use client"

import UpdateCard, { Option } from "./update-card"
import type { ProductData } from "@/types/item"

interface SpecificationsTabProps {
  item: ProductData
  onUpdate: (data: Record<string, any>) => void
  categoryOptions: Option[]
  brandOptions: Option[]
}

export default function SpecificationsTab({ 
  item, 
  onUpdate, 
  categoryOptions, 
  brandOptions 
}: SpecificationsTabProps) {
  return (
    <div className="grid gap-6">
      

      <UpdateCard
        title="Tracking & Status"
        subtitle="Serial tracking and availability"
        fields={[
          {
            name: "isSerialTracked",
            label: "Serial Number Tracked",
            type: "checkbox",
            defaultValue: item.isSerialTracked,
          },
          {
            name: "isActive",
            label: "Active Status",
            type: "checkbox",
            defaultValue: item.isActive,
          },
        ]}
        onSubmit={onUpdate}
      />

      <UpdateCard
        title="Sales Metrics"
        subtitle="Track sales performance"
        fields={[
          {
            name: "salesCount",
            label: "Sales Count",
            type: "number",
            defaultValue: item.salesCount,
          },
          {
            name: "salesTotal",
            label: "Sales Total",
            type: "number",
            step: "0.01",
            defaultValue: item.salesTotal,
          },
        ]}
        onSubmit={onUpdate}
      />
    </div>
  )
}