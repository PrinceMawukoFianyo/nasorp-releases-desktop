// app/(dashboard)/dashboard/sales/orders/page.tsx - UPDATED TO FILTER OUT POS
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, X, Download, Upload, FileText, User, CreditCard, Eye, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { getSalesOrders, cancelSalesOrder } from "@/actions/sales-orders"
import { formatCurrency, formatDate, getStatusColor, getPaymentStatusColor } from "./so-utils"

import type { SalesOrder } from "@/types/sales-order"
import SalesOrderDetailView from "./components/sales-order-details-view"

// Sales Order Card Component
function SalesOrderCard({ 
  order, 
  isSelected, 
  onClick,
  onViewDetails
}: { 
  order: SalesOrder
  isSelected: boolean
  onClick: () => void
  onViewDetails: () => void
}) {
  const total = (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0)
  
  return (
    <div
      className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer group relative ${
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "bg-background hover:bg-accent hover:shadow-sm"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-sm">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {order.customer?.name || "Unknown Customer"}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} text-xs flex-shrink-0`}>
            {order.status}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-muted-foreground">
            {order.orderDate ? formatDate(order.orderDate) : formatDate(order.createdAt)}
          </span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
        
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="outline" className={`${getPaymentStatusColor(order.paymentStatus)} text-xs`}>
            {order.paymentStatus}
          </Badge>
          
          {order.paymentMethod && order.paymentMethod !== "NOT_SPECIFIED" && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {order.paymentMethod.toLowerCase().replace('_', ' ')}
            </Badge>
          )}
          
          {order.createdBy && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <User className="w-3 h-3" />
              {order.createdBy.name || order.createdBy.email || 'Unknown'}
            </Badge>
          )}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onViewDetails()
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-md p-1.5 hover:bg-primary/90"
        title="View Details"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Date filter options
const dateFilterOptions = [
  { value: "ALL", label: "All Dates" },
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
  { value: "LAST_90_DAYS", label: "Last 90 Days" },
  { value: "THIS_YEAR", label: "This Year" },
]

export default function SalesOrdersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentFilter, setPaymentFilter] = useState("ALL")
  const [dateFilter, setDateFilter] = useState("ALL")

  useEffect(() => {
    loadSalesOrders()
  }, [])

  const loadSalesOrders = async () => {
    try {
      setIsLoading(true)
      const orders = await getSalesOrders()
      
      // 🔥 FILTER OUT POS TRANSACTIONS - Only show non-POS sales orders
      const salesOrdersOnly = orders.filter((order: any) => 
        !order.orderNumber.startsWith("POS-")
      )
      
      setSalesOrders(salesOrdersOnly as unknown as SalesOrder[])
      
      if (salesOrdersOnly.length > 0 && !selectedOrder) {
        setSelectedOrder(salesOrdersOnly[0] as unknown as SalesOrder)
      }
      
      if (selectedOrder) {
        const updatedOrder = salesOrdersOnly.find((o: any) => o.id === selectedOrder.id)
        if (updatedOrder) {
          setSelectedOrder(updatedOrder as unknown as SalesOrder)
        }
      }
    } catch (error) {
      console.error("Failed to load sales orders:", error)
      toast.error("Failed to load sales orders")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (order: SalesOrder) => {
    router.push(`/dashboard/sales/orders/${order.id}/details`)
  }

  const handleEdit = (order: SalesOrder) => {
    router.push(`/dashboard/sales/orders/${order.id}/edit`)
  }

  const handleCancel = async (order: SalesOrder) => {
    if (!confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
      return
    }

    try {
      const result = await cancelSalesOrder(order.id)
      if (result.success) {
        toast.success("Order cancelled successfully")
        await loadSalesOrders()
      } else {
        toast.error(result.error || "Failed to cancel order")
      }
    } catch (error) {
      toast.error("Failed to cancel order")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const headers = ['Order Number', 'Customer', 'Order Date', 'Status', 'Payment Status', 'Payment Method', 'Created By', 'Total']
      const csvData = filteredOrders.map(order => {
        const total = (order.subtotal || 0) + (order.taxAmount || 0) + (order.shippingCost || 0) - (order.discount || 0)
        return [
          order.orderNumber,
          order.customer?.name || 'Unknown',
          order.orderDate ? formatDate(order.orderDate) : formatDate(order.createdAt),
          order.status,
          order.paymentStatus,
          order.paymentMethod || 'Not Specified',
          order.createdBy?.name || order.createdBy?.email || 'Unknown',
          total.toFixed(2)
        ]
      })
      
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales-orders-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success("Export completed successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export orders")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = () => {
    toast.info("Import functionality coming soon")
  }

  // Date filter function
  const filterByDate = (order: SalesOrder, dateRange: string) => {
    if (dateRange === "ALL") return true
    
    const orderDate = new Date(order.orderDate || order.createdAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (dateRange) {
      case "TODAY":
        const orderDay = new Date(orderDate)
        orderDay.setHours(0, 0, 0, 0)
        return orderDay.getTime() === today.getTime()
      
      case "LAST_7_DAYS":
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return orderDate >= sevenDaysAgo
      
      case "LAST_30_DAYS":
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return orderDate >= thirtyDaysAgo
      
      case "LAST_90_DAYS":
        const ninetyDaysAgo = new Date(today)
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        return orderDate >= ninetyDaysAgo
      
      case "THIS_YEAR":
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return orderDate >= startOfYear
      
      default:
        return true
    }
  }

  const filteredOrders = salesOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.paymentMethod && order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.createdBy?.name && order.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.createdBy?.email && order.createdBy.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter
    const matchesPayment = paymentFilter === "ALL" || order.paymentStatus === paymentFilter
    const matchesDate = filterByDate(order, dateFilter)

    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading sales orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header Section */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Sales Orders</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track your sales orders (POS transactions excluded)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleImport}
                disabled={isExporting}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || filteredOrders.length === 0}
              >
                {isExporting ? (
                  <Spinner className="w-4 h-4 mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
              <Button 
                onClick={() => router.push("/dashboard/sales/orders/create")}
                className="gap-2 bg-rose-600 hover:bg-rose-700"
              >
                <Plus className="w-4 h-4" />
                Create Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Filters Section */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by order number, customer, payment method, or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <SelectValue placeholder="Date range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {dateFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Order status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Payment Status Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payments</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Grid Layout */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 h-full">
              {/* Left Panel - Order List */}
              <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h2 className="font-semibold text-sm text-muted-foreground">
                    {filteredOrders.length} Order{filteredOrders.length !== 1 ? 's' : ''}
                  </h2>
                  {(statusFilter !== "ALL" || paymentFilter !== "ALL" || searchTerm || dateFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("ALL")
                        setPaymentFilter("ALL")
                        setSearchTerm("")
                        setDateFilter("ALL")
                      }}
                      className="h-7 text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-hidden border rounded-lg bg-background">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {filteredOrders.length === 0 ? (
                        <div className="text-center py-12">
                          {searchTerm || statusFilter !== "ALL" || paymentFilter !== "ALL" || dateFilter !== "ALL" ? (
                            <>
                              <p className="text-muted-foreground mb-2">No orders found</p>
                              <p className="text-sm text-muted-foreground mb-4">
                                Try adjusting your search or filters
                              </p>
                              <Button
                                variant="link"
                                onClick={() => {
                                  setSearchTerm("")
                                  setStatusFilter("ALL")
                                  setPaymentFilter("ALL")
                                  setDateFilter("ALL")
                                }}
                              >
                                Clear all filters
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground mb-4">No sales orders yet</p>
                              <Button
                                onClick={() => router.push("/dashboard/sales/orders/create")}
                                variant="outline"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Order
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        filteredOrders.map((order) => (
                          <SalesOrderCard
                            key={order.id}
                            order={order}
                            isSelected={selectedOrder?.id === order.id}
                            onClick={() => setSelectedOrder(order)}
                            onViewDetails={() => handleViewDetails(order)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Right Panel - Order Details Preview */}
              <div className="lg:col-span-3 xl:col-span-3 h-full overflow-hidden">
                {selectedOrder ? (
                  <div className="h-full flex flex-col">
                    <div className="h-full overflow-hidden border rounded-lg shadow-sm bg-background">
                      <SalesOrderDetailView
                        salesOrder={selectedOrder}
                        onEdit={handleEdit}
                        onCancel={handleCancel}
                        onPrint={handlePrint}
                        onExport={handleExport}
                        onRefresh={loadSalesOrders} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg bg-background">
                      <div className="text-center text-muted-foreground p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                          <FileText className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium mb-2">No order selected</p>
                        <p className="text-sm">Select an order from the list to view details</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}