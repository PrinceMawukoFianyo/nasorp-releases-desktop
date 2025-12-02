"use client"

import { useState, useMemo } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface PurchaseOrder {
  id: string
  poNumber: string
  supplierName?: string
  date: Date
  expectedDeliveryDate?: Date
  subtotal: number
  taxAmount: number
  shippingCost?: number
  status: string
}

interface PurchaseOrderListProps {
  purchaseOrders: PurchaseOrder[]
  selectedPOId?: string
  onSelectPO: (poId: string) => void
  isLoading?: boolean
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-rose-100 text-rose-800",
  ORDERED: "bg-purple-100 text-purple-800",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-600 text-white",
  CANCELLED: "bg-red-100 text-red-800",
}

export default function PurchaseOrderList({
  purchaseOrders,
  selectedPOId,
  onSelectPO,
  isLoading,
}: PurchaseOrderListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPOs = useMemo(() => {
    if (!searchQuery.trim()) return purchaseOrders

    const query = searchQuery.toLowerCase()
    return purchaseOrders.filter((po) =>
      po.poNumber.toLowerCase().includes(query) ||
      po.supplierName?.toLowerCase().includes(query)
    )
  }, [purchaseOrders, searchQuery])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount)
  }

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-foreground">Purchase Orders</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {filteredPOs.length} of {purchaseOrders.length} PO{purchaseOrders.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number..."
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

      {filteredPOs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            {searchQuery ? (
              <>
                <p className="text-sm text-muted-foreground">No purchase orders found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No purchase orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new purchase order to get started
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-3">
            {filteredPOs.map((po) => {
              const total = po.subtotal + po.taxAmount + (po.shippingCost || 0)
              return (
                <button
                  key={po.id}
                  onClick={() => onSelectPO(po.id)}
                  disabled={isLoading}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg border transition-colors flex flex-col justify-between group disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedPOId === po.id
                      ? "bg-primary/10 border-primary text-foreground"
                      : "border-transparent hover:bg-accent text-foreground"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{po.poNumber}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {po.supplierName || "Unknown Supplier"}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs flex-shrink-0 h-5", statusColors[po.status] || statusColors.DRAFT)}
                    >
                      {po.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(po.date).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-sm">{formatCurrency(total)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}