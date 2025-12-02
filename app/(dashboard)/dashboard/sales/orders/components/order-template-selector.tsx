// components/sales/order-template-selector.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
   DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { formatDate } from "../so-utils"

interface OrderTemplate {
  id: string
  name: string
  description?: string
  lineItems: any[]
  discount?: number
  shippingCost?: number
  notes?: string
  createdAt: Date
}

interface OrderTemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateSelected: (template: OrderTemplate) => void
}

export function OrderTemplateSelector({
  open,
  onOpenChange,
  onTemplateSelected,
}: OrderTemplateSelectorProps) {
  const [templates, setTemplates] = useState<OrderTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      // TODO: Create a server action to fetch templates
      // For now, show empty state
      setTemplates([])
      
      // Example of what you should create:
      // import { getOrderTemplates } from "@/actions/order-templates"
      // const templates = await getOrderTemplates()
      // setTemplates(templates)
      
    } catch (error) {
      console.error("Failed to load templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = async (template: OrderTemplate) => {
    try {
      onTemplateSelected(template)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to select template:", error)
      toast.error("Failed to load template")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        < DialogHeader>
          <DialogTitle>Load Order Template</DialogTitle>
          <DialogDescription>
            Select a saved template to quickly create an order
          </DialogDescription>
        </ DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-8" />
            <p className="ml-4 text-muted-foreground">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No templates found</p>
            <p className="text-sm mt-2">
              Create your first template by saving an order
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{template.lineItems.length} items</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(template.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">Template</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}