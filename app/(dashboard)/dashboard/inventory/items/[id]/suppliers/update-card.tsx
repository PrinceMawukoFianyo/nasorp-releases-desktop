"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getBriefSuppliers } from "@/actions/suppliers"

interface FieldConfig {
  name: string
  label: string
  type: "text" | "number" | "checkbox" | "textarea" | "select"
  defaultValue?: any
  required?: boolean
  step?: string
  placeholder?: string
  options?: Option[]
}

export interface Option{
  label: string
  value: string
}

interface UpdateCardProps {
  title: string
  subtitle: string
  fields: FieldConfig[]
  onSubmit: (data: Record<string, any>) => void
  singleField?: boolean
  isUpdating?: boolean
}

export default async function UpdateCard({ 
  title, 
  subtitle, 
  fields = [], 
  onSubmit, 
  singleField = false,
  isUpdating = false 
}: UpdateCardProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (!fields || fields.length === 0) return {}
    return fields.reduce((acc, field) => ({ ...acc, [field.name]: field.defaultValue ?? "" }), {})
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const suppliers = await getBriefSuppliers ();

  const handleChange = (name: string, value: any, type: string) => {
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: !prev[name] }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const changedFields =
      !fields || fields.length === 0
        ? {}
        : fields.reduce(
            (acc, field) => {
              const currentValue = formData[field.name]
              const defaultValue = field.defaultValue

              // Skip empty or unchanged values
              if (currentValue === defaultValue) {
                return acc
              }

              // Check for empty strings (but allow zero, false, etc.)
              if (typeof currentValue === "string" && currentValue.trim() === "") {
                return acc
              }

              // Check for empty arrays
              if (Array.isArray(currentValue) && currentValue.length === 0) {
                return acc
              }

              // Handle imageUrl special case
              if (field.name === "imageUrl" && typeof currentValue === "string") {
                const urlArray = currentValue
                  .split(",")
                  .map((url: string) => url.trim())
                  .filter((url: string) => url.length > 0)
                
                if (urlArray.length > 0) {
                  acc[field.name] = urlArray
                }
              } else {
                acc[field.name] = currentValue
              }

              return acc
            },
            {} as Record<string, any>,
          )

    setIsSubmitting(false)

    if (Object.keys(changedFields).length === 0) {
      toast.info("No changes detected", {
        description: "Please modify at least one field with valid data before updating.",
      })
    } else {
      toast.success("Update successful", {
        description: `${Object.keys(changedFields).length} field(s) updated`,
      })
      console.log("Fianyo Changed fields:", changedFields)
      onSubmit(changedFields)
    }
  }

  if (!fields || fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No fields available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid ${singleField ? "grid-cols-1" : "grid-cols-2"} gap-6`}>
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col space-y-2">
                {field.type === "checkbox" ? (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id={field.name}
                      checked={formData[field.name] || false}
                      onCheckedChange={() => handleChange(field.name, undefined, field.type)}
                      disabled={isUpdating}
                    />
                    <Label htmlFor={field.name} className="font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ) : field.type === "select" ? (
                  <>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <select
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                      required={field.required}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : field.type === "textarea" ? (
                  <>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <textarea
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                      required={field.required}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      type={field.type}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                      required={field.required}
                      step={field.step}
                      disabled={isUpdating}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || isUpdating} 
            className="w-full"
          >
            {isSubmitting || isUpdating ? "Updating..." : `Update ${title}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}