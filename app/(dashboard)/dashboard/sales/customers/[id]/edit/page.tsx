"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import BasicInfoTab from "./tabs/basic-info-tab"
import { Spinner } from "@/components/ui/spinner"
import { getCustomerById } from "@/actions/customers"
import { Customer } from "@/generated/prisma-client"
import CustomerPreviewHeader from "./customer-preview-header"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

// Extend Customer type to include imageUrl
type CustomerWithImage = Customer & { imageUrl?: string | null }

export default function CustomerUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [customer, setCustomer] = useState<CustomerWithImage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const id = (await params).id
        const customerData = await getCustomerById(id)

        if (customerData) {
          setCustomer(customerData as CustomerWithImage)
        } else {
          toast.error("Failed to load customer", {
            description: "Customer not found",
          })
        }
      } catch (error) {
        console.error("Failed to load customer:", error)
        toast.error("Error loading customer", {
          description: "An unexpected error occurred",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params])

  const handleUpdate = (updatedData: Record<string, any>) => {
    console.log("Customer data Update received:", updatedData)
    setCustomer((prev) => {
      if (!prev) return null
      
      // Create new object with updated data
      const updated = { ...prev, ...updatedData }
      
      // Force re-render by creating a completely new object
      return { ...updated }
    })
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

  if (!customer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">Customer not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Link
        href="/dashboard/sales/customers"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>
      <div className="max-w-6xl mx-auto">
        <CustomerPreviewHeader customer={customer} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Update Customer Details
          </h1>
          <p className="text-muted-foreground">
            Update customer details efficiently. Each card can be updated
            independently without affecting other fields.
          </p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <BasicInfoTab customer={customer} onUpdate={handleUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}