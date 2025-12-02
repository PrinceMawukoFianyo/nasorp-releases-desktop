// components/sales/save-order-template-dialog.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
   DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
})

interface SaveOrderTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderData: any
}

export function SaveOrderTemplateDialog({
  open,
  onOpenChange,
  orderData,
}: SaveOrderTemplateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const templateData = {
        ...data,
        lineItems: orderData.lineItems,
        discount: orderData.discount,
        shippingCost: orderData.shippingCost,
        notes: orderData.notes,
      }

      // TODO: Create a server action to save templates
      // For now, just show success message
      
      // Example of what you should create:
      // import { saveOrderTemplate } from "@/actions/order-templates"
      // await saveOrderTemplate(templateData)

      toast.success("Template saved successfully (Feature coming soon)")
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error("Error saving template:", error)
      toast.error("Failed to save template")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        < DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this order configuration for quick reuse
          </DialogDescription>
        </ DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g., Standard Product Order"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Brief description of this template..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Template will include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{orderData.lineItems?.length || 0} line items</li>
              <li>Discount and shipping settings</li>
              <li>Notes and special instructions</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}