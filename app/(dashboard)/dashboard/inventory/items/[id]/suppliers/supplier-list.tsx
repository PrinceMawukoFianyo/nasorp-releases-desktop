"use client"

import { useState, useMemo } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface ItemSupplier {
  id: string
  supplierName: string
  contactPerson?: string
  email?: string
  phone?: string
  costPrice?: number
  isActive: boolean
  addedDate: Date
  isPreferred?: boolean
}

interface SupplierListProps {
  suppliers: ItemSupplier[]
  selectedSupplierId?: string
  onSelectSupplier: (supplierId: string) => void
  isLoading?: boolean
}

export default function SupplierList({
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  isLoading,
}: SupplierListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers
    
    const query = searchQuery.toLowerCase()
    return suppliers.filter((supplier) =>
      supplier.supplierName.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query) ||
      supplier.phone?.includes(query) ||
      supplier.contactPerson?.toLowerCase().includes(query)
    )
  }, [suppliers, searchQuery])

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-foreground">Suppliers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {filteredSuppliers.length} of {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute riUSt-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            {searchQuery ? (
              <>
                <p className="text-sm text-muted-foreground">No suppliers found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No suppliers yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add suppliers to get started
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-3">
            {filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => onSelectSupplier(supplier.id)}
                disabled={isLoading}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg border transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedSupplierId === supplier.id
                    ? "bg-primary/10 border-primary text-foreground"
                    : "border-transparent hover:bg-accent text-foreground"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {supplier.supplierName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {supplier.email || supplier.phone || "No contact info"}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {supplier.isPreferred && (
                      <Badge variant="default" className="text-xs h-5">
                        Preferred
                      </Badge>
                    )}
                    {supplier.isActive ? (
                      <Badge variant="default" className="bg-green-600 text-xs h-5">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs h-5">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 transition-opacity",
                    selectedSupplierId === supplier.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
