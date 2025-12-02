// app/dashboard/customers/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import CustomerDetail from "./customer-detail"
import { db } from "@/prisma/db"


interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    page?: string
    status?: string
    paymentStatus?: string
  }>
}

async function getCustomerData(customerId: string, page: number, status?: string, paymentStatus?: string) {
  const itemsPerPage = 10

  // Fetch customer
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    return null
  }

  // Build order filters
  const orderFilters: any = {
    customerId,
  }

  if (status) {
    orderFilters.status = status
  }

  if (paymentStatus) {
    orderFilters.paymentStatus = paymentStatus
  }

  // Fetch orders with pagination
  const [orders, totalOrders] = await Promise.all([
    db.salesOrder.findMany({
      where: orderFilters,
      include: {
        location: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
    }),
    db.salesOrder.count({
      where: orderFilters,
    }),
  ])

  // Calculate order stats
  const allOrders = await db.salesOrder.findMany({
    where: { customerId },
    select: {
      status: true,
      paymentStatus: true,
      subtotal: true,
      taxAmount: true,
      discount: true,
      shippingCost: true,
    },
  })

  // Calculate stats with proper type handling
  const completedStatuses = ["COMPLETED"]
  const pendingStatuses = ["PENDING", "DRAFT", "CONFIRMED"]
  const shippedStatuses = ["SHIPPED"]
  const deliveredStatuses = ["DELIVERED"]
  const cancelledStatuses = ["CANCELLED"]
  const returnedStatuses = ["RETURNED"]
  
  const paidStatuses = ["PAID"]
  const partialStatuses = ["PARTIAL"]
  const unpaidStatuses = ["PENDING"]
  const refundedStatuses = ["REFUNDED"]

  const orderStats = {
    total: allOrders.length,
    completed: allOrders.filter((o) => completedStatuses.includes(o.status)).length,
    pending: allOrders.filter((o) => pendingStatuses.includes(o.status)).length,
    shipped: allOrders.filter((o) => shippedStatuses.includes(o.status)).length,
    delivered: allOrders.filter((o) => deliveredStatuses.includes(o.status)).length,
    cancelled: allOrders.filter((o) => cancelledStatuses.includes(o.status)).length,
    returned: allOrders.filter((o) => returnedStatuses.includes(o.status)).length,
    paid: allOrders.filter((o) => paidStatuses.includes(o.paymentStatus)).length,
    partiallyPaid: allOrders.filter((o) => partialStatuses.includes(o.paymentStatus)).length,
    unpaid: allOrders.filter((o) => unpaidStatuses.includes(o.paymentStatus)).length,
    refunded: allOrders.filter((o) => refundedStatuses.includes(o.paymentStatus)).length,
    totalRevenue: allOrders.reduce(
      (sum, o) => sum + (o.subtotal + o.taxAmount + (o.shippingCost || 0) - (o.discount || 0)),
      0
    ),
    averageOrderValue:
      allOrders.length > 0
        ? allOrders.reduce(
            (sum, o) => sum + (o.subtotal + o.taxAmount + (o.shippingCost || 0) - (o.discount || 0)),
            0
          ) / allOrders.length
        : 0,
    totalDiscount: allOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
    totalTax: allOrders.reduce((sum, o) => sum + o.taxAmount, 0),
  }

  const totalPages = Math.ceil(totalOrders / itemsPerPage)

  return {
    customer,
    orders,
    orderStats,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalOrders,
      itemsPerPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

export default async function CustomerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const search = await searchParams
  
  const page = Number(search.page) || 1
  const status = search.status
  const paymentStatus = search.paymentStatus

  const data = await getCustomerData(id, page, status, paymentStatus)

  if (!data) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="size-8" />
        </div>
      }
    >
      <CustomerDetail
        customer={data.customer}
        orders={data.orders}
        orderStats={data.orderStats}
        pagination={data.pagination}
      />
    </Suspense>
  )
}