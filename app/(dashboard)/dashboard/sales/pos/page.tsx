// app/dashboard/sales/pos/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  X, 
  Download, 
  Upload, 
  User, 
  CreditCard, 
  Eye, 
  Calendar,
  ShoppingCart,
  Receipt
} from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { getSalesOrders } from "@/actions/sales-orders"
import { formatCurrency, formatDate } from "../orders/so-utils"
import type { SalesOrder } from "@/types/sales-order"
import POSDetailView from "./components/details/pos-detail-view"

// Date filter options
const dateFilterOptions = [
  { value: "ALL", label: "All Dates" },
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
  { value: "LAST_90_DAYS", label: "Last 90 Days" },
  { value: "THIS_YEAR", label: "This Year" },
]

// POS Transaction Card Component - MOVED OUTSIDE and memo-ized
const POSTransactionCard = ({ 
  transaction, 
  isSelected, 
  onClick,
  onViewDetails
}: { 
  transaction: SalesOrder
  isSelected: boolean
  onClick: () => void
  onViewDetails: () => void
}) => {
  const total = (transaction.subtotal || 0) + (transaction.taxAmount || 0) + (transaction.shippingCost || 0) - (transaction.discount || 0)
  
  return (
    <div
      className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer group relative ${
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "bg-background hover:bg-accent hover:shadow-sm"
      }`}
    >
      {/* Eye Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onViewDetails()
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-md p-2 hover:bg-primary/90 shadow-md z-10"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Main content button */}
      <button
        onClick={onClick}
        className="w-full text-left"
      >
        {/* Transaction ID and Customer */}
        <div className="flex items-center justify-between gap-3 mb-3 pr-10">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 mb-1">
              {transaction.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {transaction.customer?.name || "Walk-in Customer"}
            </p>
          </div>
        </div>

        {/* Status Badge - Centered */}
        <div className="flex items-center justify-center mb-3">
          <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1 font-semibold">
            {transaction.status}
          </Badge>
        </div>
        
        {/* Date and Amount */}
        <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(transaction.createdAt)}</span>
          </div>
          <span className="font-bold text-sm text-gray-900">{formatCurrency(total)}</span>
        </div>
        
        {/* Payment Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-3 py-1">
              {transaction.paymentStatus}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            {transaction.paymentMethod && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1 flex-1 justify-center">
                <CreditCard className="w-3 h-3" />
                <span>{transaction.paymentMethod.toLowerCase().replace('_', ' ')}</span>
              </Badge>
            )}
            
            {transaction.createdBy && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 flex-1 justify-center">
                <User className="w-3 h-3" />
                <span className="truncate">{transaction.createdBy.name || transaction.createdBy.email || 'Unknown'}</span>
              </Badge>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

export default function POSPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [posTransactions, setPosTransactions] = useState<SalesOrder[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<SalesOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL")
  const [dateFilter, setDateFilter] = useState("ALL")

  useEffect(() => {
    loadPOSTransactions()
  }, [])

  const loadPOSTransactions = async () => {
    try {
      setIsLoading(true)
      const orders = await getSalesOrders()
      
      const posOnly = orders.filter((order: any) => 
        order.orderNumber.startsWith("POS-")
      )
      
      setPosTransactions(posOnly as unknown as SalesOrder[])
      
      if (posOnly.length > 0 && !selectedTransaction) {
        setSelectedTransaction(posOnly[0] as unknown as SalesOrder)
      }
      
      if (selectedTransaction) {
        const updatedTransaction = posOnly.find((o: any) => o.id === selectedTransaction.id)
        if (updatedTransaction) {
          setSelectedTransaction(updatedTransaction as unknown as SalesOrder)
        }
      }
    } catch (error) {
      console.error("Failed to load POS transactions:", error)
      toast.error("Failed to load POS transactions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (transaction: SalesOrder) => {
    router.push(`/dashboard/sales/pos/${transaction.id}/details`)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const headers = ['Transaction ID', 'Customer', 'Date', 'Payment Method', 'Cashier', 'Total']
      const csvData = filteredTransactions.map(transaction => {
        const total = (transaction.subtotal || 0) + (transaction.taxAmount || 0) + (transaction.shippingCost || 0) - (transaction.discount || 0)
        return [
          transaction.orderNumber,
          transaction.customer?.name || 'Walk-in',
          formatDate(transaction.createdAt),
          transaction.paymentMethod || 'Not Specified',
          transaction.createdBy?.name || transaction.createdBy?.email || 'Unknown',
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
      a.download = `pos-transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success("Export completed successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export transactions")
    } finally {
      setIsExporting(false)
    }
  }

  const handleReceiveFromPOS = () => {
    toast.info("Receiving data from POS system...")
    loadPOSTransactions()
  }

  const filterByDate = (transaction: SalesOrder, dateRange: string) => {
    if (dateRange === "ALL") return true
    
    const transactionDate = new Date(transaction.createdAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (dateRange) {
      case "TODAY":
        const transactionDay = new Date(transactionDate)
        transactionDay.setHours(0, 0, 0, 0)
        return transactionDay.getTime() === today.getTime()
      
      case "LAST_7_DAYS":
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return transactionDate >= sevenDaysAgo
      
      case "LAST_30_DAYS":
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return transactionDate >= thirtyDaysAgo
      
      case "LAST_90_DAYS":
        const ninetyDaysAgo = new Date(today)
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        return transactionDate >= ninetyDaysAgo
      
      case "THIS_YEAR":
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        return transactionDate >= startOfYear
      
      default:
        return true
    }
  }

  const filteredTransactions = posTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.paymentMethod && transaction.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.createdBy?.name && transaction.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.createdBy?.email && transaction.createdBy.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesPaymentMethod = paymentMethodFilter === "ALL" || transaction.paymentMethod === paymentMethodFilter
    const matchesDate = filterByDate(transaction, dateFilter)

    return matchesSearch && matchesPaymentMethod && matchesDate
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading POS transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Receipt className="w-7 h-7 sm:w-8 sm:h-8" />
                POS Transactions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View and manage point of sale transactions
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button variant="outline" onClick={handleReceiveFromPOS}>
                <Upload className="w-4 h-4 mr-2" />
                Receive from POS
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || filteredTransactions.length === 0}
              >
                {isExporting ? (
                  <Spinner className="w-4 h-4 mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
              <Button 
                onClick={() => router.push("/pos")}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="w-4 h-4" />
                Open POS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by transaction ID, customer, payment method, or cashier..."
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
            
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:h-full">
              {/* Transaction List */}
              <div className="lg:col-span-1 xl:col-span-2 flex flex-col lg:h-full lg:overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h2 className="font-semibold text-sm text-muted-foreground">
                    {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  </h2>
                  {(paymentMethodFilter !== "ALL" || searchTerm || dateFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPaymentMethodFilter("ALL")
                        setSearchTerm("")
                        setDateFilter("ALL")
                      }}
                      className="h-7 text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex-1 lg:overflow-hidden border rounded-lg bg-background max-h-[70vh] lg:max-h-none">
                  <ScrollArea className="h-full lg:h-full">
                    <div className="p-4 space-y-4">
                      {filteredTransactions.length === 0 ? (
                        <div className="text-center py-12">
                          {searchTerm || paymentMethodFilter !== "ALL" || dateFilter !== "ALL" ? (
                            <>
                              <p className="text-muted-foreground mb-2">No transactions found</p>
                              <p className="text-sm text-muted-foreground mb-4">
                                Try adjusting your search or filters
                              </p>
                              <Button
                                variant="link"
                                onClick={() => {
                                  setSearchTerm("")
                                  setPaymentMethodFilter("ALL")
                                  setDateFilter("ALL")
                                }}
                              >
                                Clear all filters
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground mb-4">No POS transactions yet</p>
                              <Button onClick={() => router.push("/pos")} variant="outline">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Start First Transaction
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        filteredTransactions.map((transaction) => (
                          <POSTransactionCard
                            key={transaction.id}
                            transaction={transaction}
                            isSelected={selectedTransaction?.id === transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            onViewDetails={() => handleViewDetails(transaction)}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Detail View */}
              <div className="lg:col-span-3 xl:col-span-3 lg:h-full lg:overflow-hidden mt-6 lg:mt-0">
                {selectedTransaction ? (
                  <div className="h-full flex flex-col">
                    <div className="h-full overflow-hidden border rounded-lg shadow-sm bg-background">
                      <POSDetailView
                        transaction={selectedTransaction}
                        onPrint={handlePrint}
                        onExport={handleExport}
                        onRefresh={loadPOSTransactions}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg bg-background">
                      <div className="text-center text-muted-foreground p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                          <Receipt className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium mb-2">No transaction selected</p>
                        <p className="text-sm">Select a transaction from the list to view details</p>
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