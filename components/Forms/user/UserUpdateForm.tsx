"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { toast } from "sonner"
import { updateUser } from "@/actions/users"

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  roleId: z.string().min(1, "Please select a role"),
  locationId: z.string().optional(),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserUpdateFormProps {
  user: any
  roles: Array<{ label: string; value: string }>
  locations: Array<{ label: string; value: string }>
  orgId: string
}

export function UserUpdateForm({ user, roles, locations, orgId }: UserUpdateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentRoleId = user.roles?.[0]?.id ?? ""
  const currentLocationId = user.locationId ?? user.Location?.id ?? ""

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      roleId: currentRoleId,
      locationId: currentLocationId,
    },
  })

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true)
    try {
      const result = await updateUser(user.id, {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        locationId: data.locationId,
        orgId,
      })

      if (!result.success) {
        toast.error(result.error || "Failed to update user")
        return
      }

      toast.success("User updated successfully")
      router.push("/dashboard/settings/users")
      router.refresh()
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Failed to update user")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormDescription>Enter the user's full name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role Field */}
        {/* FIX: was defaultValue={field.value} — that only sets the value ONCE
            at mount and then Radix's Select never picks up changes again,
            which is why it kept snapping back to "Select a role" on refresh.
            Using value= keeps it fully controlled by the form state. */}
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location Field — same fix applied */}
        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update User"}
        </Button>
      </form>
    </Form>
  )
}