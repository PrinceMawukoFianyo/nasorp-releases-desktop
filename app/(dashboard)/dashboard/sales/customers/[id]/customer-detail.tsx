"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { updateCustomerStatus } from "@/actions/customers"
import {
  salesOrderStatusLabels,
  salesOrderStatusColors,
  paymentStatusLabels,
  paymentStatusColors,
} from "@/types/customer"

interface CustomerDetailProps {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    taxId: string | null
    notes: string | null
    imageUrl?: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  orders: any[]
  orderStats: {
    total: number
    completed: number
    pending: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
    paid: number
    partiallyPaid: number
    unpaid: number
    refunded: number
    totalRevenue: number
    averageOrderValue: number
    totalDiscount: number
    totalTax: number
  }
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}


export default function CustomerDetail({ 
  customer, 
  orders, 
  orderStats,
  pagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false
  }
}: CustomerDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)

  const currentPage = pagination.currentPage
  const statusFilter = searchParams.get("status") || "ALL"
  const paymentStatusFilter = searchParams.get("paymentStatus") || "ALL"

  // Format date
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return format(dateObj, "MMM dd, yyyy")
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Calculate order total
  const getOrderTotal = (order: any) => {
    return (
      order.subtotal +
      order.taxAmount +
      (order.shippingCost || 0) -
      (order.discount || 0)
    )
  }

  // Handle toggle active status
  const handleToggleStatus = async () => {
    setIsProcessing(true)
    try {
      const result = await updateCustomerStatus(customer.id, !customer.isActive)
      if (result.success) {
        toast.success(
          customer.isActive ? "Customer deactivated" : "Customer activated",
          {
            description: `${customer.name} has been ${
              customer.isActive ? "deactivated" : "activated"
            } successfully`,
          }
        )
        router.refresh()
      } else {
        toast.error("Failed to update customer status", {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Failed to update customer status",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle filter change
  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value && value !== "ALL") {
      params.set(type, value)
    } else {
      params.delete(type)
    }
    
    params.set("page", "1") // Reset to page 1 on filter change
    
    router.push(`/dashboard/sales/customers/${customer.id}?${params.toString()}`)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/dashboard/sales/customers/${customer.id}?${params.toString()}`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/sales/customers"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <Badge variant={customer.isActive ? "success" : "destructive"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            Customer since {formatDate(customer.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/sales/customers/${customer.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant={customer.isActive ? "destructive" : "default"}
            onClick={handleToggleStatus}
            disabled={isProcessing}
          >
            <Power className="w-4 h-4 mr-2" />
            {customer.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orderStats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(orderStats.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orderStats.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(orderStats.averageOrderValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Logo Card */}
          {customer.imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Customer Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                  <img
                    src={customer.imageUrl}
                    alt={`${customer.name} logo`}
                    className="w-full h-full object-contain p-4"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.phone && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                </>
              )}

              {customer.address && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {customer.address}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {customer.taxId && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tax ID</p>
                      <p className="text-sm text-gray-600">{customer.taxId}</p>
                    </div>
                  </div>
                </>
              )}

              {customer.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {customer.notes}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Order Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">{orderStats.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-yellow-600">{orderStats.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipped</span>
                  <span className="font-semibold text-blue-600">{orderStats.shipped}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cancelled</span>
                  <span className="font-semibold text-red-600">{orderStats.cancelled}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount</span>
                  <span className="font-semibold">{formatCurrency(orderStats.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax</span>
                  <span className="font-semibold">{formatCurrency(orderStats.totalTax)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order History</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value) => handleFilterChange("status", value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentStatusFilter} onValueChange={(value) => handleFilterChange("paymentStatus", value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Payments" />
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
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(statusFilter && statusFilter !== "ALL") || (paymentStatusFilter && paymentStatusFilter !== "ALL")
                      ? "Try adjusting your filters"
                      : "This customer hasn't placed any orders"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/dashboard/sales/orders/${order.id}`}
                        className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-mono text-sm font-semibold text-blue-600">
                                {order.orderNumber}
                              </p>
                              <Badge variant={order.status.toLowerCase() as any}>
                                {salesOrderStatusLabels[order.status as keyof typeof salesOrderStatusLabels]}
                              </Badge>
                              <Badge variant={order.paymentStatus.toLowerCase() as any}>
                                {paymentStatusLabels[order.paymentStatus as keyof typeof paymentStatusLabels]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(order.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {order.location.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {order.lines.length} items
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(getOrderTotal(order))}
                            </p>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.lines.slice(0, 3).map((line: any) => (
                              <div
                                key={line.id}
                                className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded text-xs"
                              >
                                {line.item.thumbnail ? (
                                  <img
                                    src={line.item.thumbnail}
                                    alt={line.item.name}
                                    className="w-6 h-6 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                                    <Package className="w-3 h-3 text-gray-400" />
                                  </div>
                                )}
                                <span className="text-gray-700">
                                  {line.item.name} × {line.quantity}
                                </span>
                              </div>
                            ))}
                            {order.lines.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{order.lines.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
                        {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                        {pagination.totalItems} orders
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!pagination.hasPreviousPage}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}