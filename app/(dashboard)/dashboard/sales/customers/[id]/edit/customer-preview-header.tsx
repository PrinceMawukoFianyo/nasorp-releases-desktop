"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Customer } from "@/generated/prisma-client"
import { Building2, Mail, Phone } from "lucide-react"

interface CustomerPreviewHeaderProps {
  customer: Customer & { imageUrl?: string | null }
}

export default function CustomerPreviewHeader({ customer }: CustomerPreviewHeaderProps) {
  // Safely access imageUrl with proper type checking
  const customerImageUrl = customer.imageUrl || null

  return (
    <Card className="overflow-hidden mb-8 border-0 shadow-md">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Customer Logo/Image Section */}
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden h-80">
            {customerImageUrl ? (
              <div className="relative w-full h-full">
                <Image
                  src={customerImageUrl}
                  alt={`${customer.name} logo`}
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                <Building2 className="w-24 h-24 text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-medium">No Logo</p>
              </div>
            )}
          </div>

          {/* Customer Details Section */}
          <div className="md:col-span-2 flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground truncate">{customer.name}</h2>
              
              <div className="flex flex-col gap-2 mt-4">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Mail className="w-4 h-4" />
                    <span className="break-all">{customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info Badges */}
            <div className="flex flex-wrap gap-2">
              {customer.isActive ? (
                <Badge variant="default" className="bg-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Basic Stats */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">Tax ID</p>
              <p className="text-lg font-bold text-foreground">{customer.taxId || "N/A"}</p>
            </div>
              
            {/* Address */}
            {customer.address && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-semibold">Address</p>
                <p className="text-sm text-foreground line-clamp-2">{customer.address}</p>
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-semibold">Notes</p>
                <p className="text-sm text-foreground line-clamp-3">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}