// components/dashboard-main.tsx
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  DollarSign,
  FileText,
  Eye,
  ArrowRight,
  AlertTriangle,
  ShoppingBag,
  Download,
  BarChart3,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DateRangePicker from "../ui/date-range-picker";


type DashboardData = {
  inventoryValue: number;
  totalItems: number;
  salesOrdersCount: number;
  salesOrdersValue: number;
  purchaseOrdersCount: number;
  purchaseOrdersValue: number;
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    currentQty: number;
    minLevel: number;
    location: string;
  }>;
  topSellingProducts: Array<{
    id: string;
    name: string;
    salesCount: number;
    salesTotal: number;
  }>;
  recentCustomers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  recentSalesOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    date: string;
  }>;
  inventoryByLocation: Array<{
    location: string;
    value: number;
    itemCount: number;
  }>;
  salesByCategory: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
};

type Props = {
  data: DashboardData;
  initialPeriod?: string;
  isLoading?: boolean;
  error?: string;
};

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data || data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No inventory data available</p>
        <p className="text-sm mt-1">Add items to locations to see data</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[120px]">{item.label}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              GH₵{item.value.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-rose-600 h-2 rounded-full transition-all"
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({
  data,
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  if (!data || data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No sales category data available</p>
        <p className="text-sm mt-1">Make sales to see category breakdown</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No sales data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const prevPercentages = data
                .slice(0, index)
                .reduce((sum, d) => sum + (d.value / total) * 100, 0);
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="20"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={-prevPercentages}
                  className="transition-all"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="text-sm min-w-0">
              <div className="font-medium truncate">{item.label}</div>
              <div className="text-muted-foreground">
                {((item.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardMain({
  data,
  initialPeriod = "7d",
  isLoading = false,
  error,
}: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // ✅ Push the new range to URL → triggers server re-render with fresh data
  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newRange);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600">Failed to load dashboard</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const bigCards = [
    {
      title: "Inventory Value",
      value: `GH₵${(data.inventoryValue || 0).toLocaleString()}`,
      icon: DollarSign,
      href: "/dashboard/inventory",
    },
    {
      title: "Total Items",
      value: (data.totalItems || 0).toString(),
      icon: Package,
      href: "/dashboard/inventory/items",
    },
    {
      title: "Total Sales Orders",
      value: `GH₵${(data.salesOrdersValue || 0).toLocaleString()}`,
      icon: ShoppingCart,
      href: "/dashboard/sales/orders",
    },
    {
      title: "Total Purchase Orders",
      value: `GH₵${(data.purchaseOrdersValue || 0).toLocaleString()}`,
      icon: ShoppingBag,
      href: "/dashboard/purchases/purchase-orders",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto space-y-6 p-6">

        {/* ✅ Header — DateRangePicker replaces Select */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Here's your statistics overview.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ Supports presets, single day (click once), and ranges (click start then end) */}
            <DateRangePicker
              value={initialPeriod}
              onChange={handleRangeChange}
            />
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </div>

        {/* Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bigCards.map((card, index) => (
            <Card
              key={index}
              className="relative overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <Link href={card.href}>
                  <div className="flex items-center text-sm text-green-600 hover:text-green-800 cursor-pointer mt-2">
                    View details
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Link>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <card.icon className="h-24 w-24 text-primary" />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inventory by Location
              </CardTitle>
              <CardDescription>Value distribution across locations</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={(data.inventoryByLocation || []).map((loc) => ({
                  label: loc.location,
                  value: loc.value,
                }))}
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Sales by Category
              </CardTitle>
              <CardDescription>Revenue breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={(data.salesByCategory || []).map((cat, index) => ({
                  label: cat.category,
                  value: cat.value,
                  color: [
                    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
                    "#10b981", "#ef4444", "#84cc16", "#06b6d4",
                  ][index % 8],
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Low Stock Alerts */}
          <Card className="col-span-7 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Low Stock Alerts</span>
                </CardTitle>
                <CardDescription>Items below minimum stock level</CardDescription>
              </div>
              <Link href="/dashboard/inventory/items?filter=low-stock">
                <Button variant="link" size="sm">
                  View Details <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(data.lowStockItems || []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No low stock items</p>
                  <p className="text-sm mt-2">All items are well stocked</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Qty</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.lowStockItems || []).map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <span className="text-red-600 font-semibold">{item.currentQty}</span>
                        </TableCell>
                        <TableCell>{item.minLevel}</TableCell>
                        <TableCell className="text-muted-foreground">{item.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card className="col-span-5 hover:shadow-md transition-shadow">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products by sales</CardDescription>
              </div>
              <Link href="/dashboard/inventory/items?sort=salesCount-desc">
                <Button variant="link" size="sm">
                  View Details <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(data.topSellingProducts || []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No sales data available</p>
                  <p className="text-sm">Start making sales to see top products</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Sales Count</TableHead>
                      <TableHead>Sales Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.topSellingProducts || []).map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.salesCount}</TableCell>
                        <TableCell className="font-semibold">
                          GH₵{item.salesTotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales Orders */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Sales Orders</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </div>
              <Link href="/dashboard/sales/orders">
                <Button variant="link" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(data.recentSalesOrders || []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent orders</p>
                  <p className="text-sm mt-2">New sales orders will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.recentSalesOrders || []).map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>GH₵{order.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              order.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : order.status === "PROCESSING"
                                ? "bg-rose-100 text-rose-800"
                                : order.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "CANCELLED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Link href={`/dashboard/sales/orders/${order.id}/details`}>
                              <Button variant="ghost" size="sm" title="View">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link
                              href={`/dashboard/sales/orders/${order.id}/invoice`}
                              target="_blank"
                            >
                              <Button variant="ghost" size="sm" title="Print">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                  />
                                </svg>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}