"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Supplier } from "@/generated/prisma-client"
import { Building2, Mail, Phone, User } from "lucide-react"

interface SupplierPreviewHeaderProps {
  supplier: Supplier
}

export default function SupplierPreviewHeader({ supplier }: SupplierPreviewHeaderProps) {
  return (
    <Card className="overflow-hidden mb-8 border-0 shadow-md">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Supplier Logo/Image Section */}
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden h-80">
            <div className="flex flex-col items-center justify-center gap-4">
              <Building2 className="w-24 h-24 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-medium">Supplier Logo</p>
            </div>
          </div>

          {/* Supplier Details Section */}
          <div className="md:col-span-2 flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground truncate">{supplier.name}</h2>
              
              <div className="flex flex-col gap-2 mt-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Mail className="w-4 h-4" />
                    <span className="break-all">{supplier.email}</span>
                  </div>
                )}
                
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <User className="w-4 h-4" />
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info Badges */}
            <div className="flex flex-wrap gap-2">
              {supplier.isActive ? (
                <Badge variant="default" className="bg-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Inactive
                </Badge>
              )}
              
              {supplier.paymentTerms && (
                <Badge variant="outline">
                  Payment Terms: {supplier.paymentTerms} days
                </Badge>
              )}
            </div>

            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Contact Person</p>
                <p className="text-lg font-bold text-foreground">{supplier.contactPerson || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Tax ID</p>
                <p className="text-lg font-bold text-foreground">{supplier.taxId || "N/A"}</p>
              </div>
            </div>

            {/* Address */}
            {supplier.address && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-semibold">Address</p>
                <p className="text-sm text-foreground line-clamp-2">{supplier.address}</p>
              </div>
            )}

            {/* Notes */}
            {supplier.notes && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-semibold">Notes</p>
                <p className="text-sm text-foreground line-clamp-3">{supplier.notes}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}