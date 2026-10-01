"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import SupplierPreviewHeader from "./supplier-preview-header"
import BasicInfoTab from "./tabs/basic-info-tab"
import { Spinner } from "@/components/ui/spinner"
import { getSupplierById } from "@/actions/suppliers"
import { Supplier } from "@/generated/prisma-client"

export default function SupplierUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const id = (await params).id
        const supplierData = await getSupplierById(id)

        if (supplierData) {
          setSupplier(supplierData)
        } else {
          toast.error("Failed to load supplier", {
            description: "Supplier not found",
          })
        }
      } catch (error) {
        console.error("Failed to load supplier:", error)
        toast.error("Error loading supplier", {
          description: "An unexpected error occurred",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params])

  const handleUpdate = (updatedData: Record<string, any>) => {
    console.log("Supplier data Update received:", updatedData)
    setSupplier((prev) => (prev ? { ...prev, ...updatedData } : null))
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

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">Supplier not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <SupplierPreviewHeader supplier={supplier} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Update Supplier Details
          </h1>
          <p className="text-muted-foreground">
            Update supplier details efficiently. Each card can be updated
            independently without affecting other fields.
          </p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <BasicInfoTab supplier={supplier} onUpdate={handleUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}