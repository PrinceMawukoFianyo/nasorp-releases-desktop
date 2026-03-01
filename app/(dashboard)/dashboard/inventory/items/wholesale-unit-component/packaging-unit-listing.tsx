"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Package2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import {
  DataTable,
  Column,
  TableActions,
  EntityForm,
  ConfirmationDialog,
} from "@/components/ui/data-table"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  getOrgPackagingUnits,
  createPackagingUnit,
  updatePackagingUnit,
  deletePackagingUnit,
  PackagingUnitRecord,
} from "@/actions/packaging-units"

const formSchema = z.object({
  name:        z.string().min(1, "Name is required").max(50, "Max 50 characters"),
  description: z.string().max(200, "Max 200 characters").optional(),
})
type FormValues = z.infer<typeof formSchema>

// Common preset container names shown as quick-add chips
const PRESETS = [
  "Box", "Half Box", "Quarter Box",
  "Sack", "Half Sack", "Quarter Sack",
  "Crate", "Dozen", "Bundle", "Tray", "Bag", "Carton",
]

export default function PackagingUnitListing() {
  const [units,       setUnits]       = useState<PackagingUnitRecord[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [formOpen,    setFormOpen]    = useState(false)
  const [deleteOpen,  setDeleteOpen]  = useState(false)
  const [current,     setCurrent]     = useState<PackagingUnitRecord | null>(null)
  const [toDelete,    setToDelete]    = useState<PackagingUnitRecord | null>(null)
  const [isSubmitting,setIsSubmitting]= useState(false)
  const [isDeleting,  setIsDeleting]  = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => { loadUnits() }, [])

  const loadUnits = async () => {
    setIsLoading(true)
    try {
      const data = await getOrgPackagingUnits()
      setUnits(data)
    } catch { toast.error("Failed to load packaging units") }
    finally   { setIsLoading(false) }
  }

  useEffect(() => {
    form.reset(current
      ? { name: current.name, description: current.description ?? "" }
      : { name: "", description: "" }
    )
  }, [current, form])

  const handleAdd       = () => { setCurrent(null); setFormOpen(true) }
  const handleEdit      = (u: PackagingUnitRecord) => { setCurrent(u); setFormOpen(true) }
  const handleDeleteClick = (u: PackagingUnitRecord) => { setToDelete(u); setDeleteOpen(true) }

  // Quick-add preset — pre-fill name and open form
  const handlePreset = (name: string) => {
    setCurrent(null)
    form.reset({ name, description: "" })
    setFormOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      // Ensure name is never undefined by providing a fallback
      const submitData = {
        name: data.name || "", // This ensures name is always a string
        description: data.description
      }

      const result = current
        ? await updatePackagingUnit(current.id, submitData)
        : await createPackagingUnit(submitData)

      if (result.success) {
        toast.success(current ? "Updated!" : "Created!")
        setFormOpen(false)
        loadUnits()
      } else {
        toast.error(result.error ?? "Something went wrong")
      }
    } finally { setIsSubmitting(false) }
  }

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setIsDeleting(true)
    try {
      const result = await deletePackagingUnit(toDelete.id)
      if (result.success) {
        toast.success("Deleted")
        setDeleteOpen(false)
        loadUnits()
      } else {
        toast.error(result.error ?? "Failed to delete")
      }
    } finally { setIsDeleting(false) }
  }

  const existingNames = new Set(units.map(u => u.name.toLowerCase()))
  const availablePresets = PRESETS.filter(p => !existingNames.has(p.toLowerCase()))

  const columns: Column<PackagingUnitRecord>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded">
            <Package2 className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.description || "—"}</span>
      ),
    },
    {
      header: "Date Created",
      accessorKey: (row) => format(new Date(row.createdAt), "MMM dd, yyyy"),
    },
  ]

  return (
    <>
      {/* Quick-add preset chips */}
      {availablePresets.length > 0 && (
        <div className="px-4 pt-4 pb-0">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Quick add common packaging types:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {availablePresets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <DataTable<PackagingUnitRecord>
        title="Packaging Units"
        subtitle="Container types used for wholesale pricing (Box, Sack, Crate, etc.)"
        data={units}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        onRefresh={loadUnits}
        actions={{ onAdd: handleAdd }}
        filters={{ searchFields: ["name"] }}
        renderRowActions={(item) => (
          <TableActions.RowActions
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDeleteClick(item)}
          />
        )}
      />

      {/* Create / Edit form */}
      <EntityForm
        size="sm"
        open={formOpen}
        onOpenChange={setFormOpen}
        title={current ? `Edit "${current.name}"` : "Add Packaging Unit"}
        form={form}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        submitLabel={current ? "Save Changes" : "Create Unit"}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Box, Sack, Crate, Dozen" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                This appears in the "Sell as" dropdown when making sales.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Standard 6-unit carton" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </EntityForm>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Packaging Unit"
        description={
          toDelete ? (
            <>
              Delete <strong>{toDelete.name}</strong>? This will fail if any items currently use it.
            </>
          ) : "Delete this packaging unit?"
        }
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  )
}