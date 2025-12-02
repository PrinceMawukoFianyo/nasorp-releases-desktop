"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { createCustomer } from "@/actions/customers" // Import the server action

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
})

interface QuickCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated: (customer: any) => void
}

export function QuickCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
}: QuickCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  })

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      // Call the server action to create customer
      const result = await createCustomer({
        name: data.name,
        email: data.email || undefined, // Convert empty string to undefined
        phone: data.phone,
        address: data.address || undefined, // Convert empty string to undefined
      })

      if (result.success && result.data) {
        toast.success("Customer created successfully!")
        
        // Call the callback with the created customer
        onCustomerCreated(result.data)
        
        // Close dialog and reset form
        onOpenChange(false)
        form.reset()
      } else {
        // Handle error from server action
        toast.error(result.error || "Failed to create customer")
      }
    } catch (error) {
      console.error("Error creating customer:", error)
      toast.error("Failed to create customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        < DialogHeader>
          <DialogTitle>Quick Add Customer</DialogTitle>
          <DialogDescription>
            Add a new customer without leaving this page
          </DialogDescription>
        </ DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Customer name"
              disabled={isSubmitting}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder="+233 XX XXX XXXX"
              disabled={isSubmitting}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-red-600">
                {form.formState.errors.phone.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="customer@example.com"
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...form.register("address")}
              placeholder="Customer address"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}