'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Download, Mail, MoreVertical, Package, Calendar, TrendingUp, Printer, FileText, Sheet, Trash2, QrCode, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

import { GoodsReceiptWithRelations } from '@/types/goods-receipt'
import { GoodsReceiptListSkeleton } from './components/goods-receipt-skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { deleteGoodsReceipt, getGoodsReceipts, handleExportGoodsReceipt, handleSendEmail } from '@/actions/goods-receipt'

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { 
        label: 'Completed',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        icon: '✓'
      }
    default:
      return { 
        label: 'Completed',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        icon: '✓'
      }
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(value)
}

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const calculateReceiptTotal = (lines: Array<{ receivedQuantity: number; unitPrice: number }>) => {
  return lines.reduce((total, line) => total + (line.receivedQuantity * line.unitPrice), 0)
}

function hasError(result: any): result is { success: boolean; error: string; data?: undefined } {
  return !result.success && 'error' in result
}

export default function GoodsReceiptsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptWithRelations | null>(null)
  const [receipts, setReceipts] = useState<GoodsReceiptWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadReceipts()
  }, [])

  const loadReceipts = async () => {
    try {
      setIsLoading(true)
      const result = await getGoodsReceipts()
      
      if (result.success && result.data) {
        const receiptsData = result.data as unknown as GoodsReceiptWithRelations[]
        setReceipts(receiptsData)
        
        if (receiptsData.length > 0 && !selectedReceipt) {
          setSelectedReceipt(receiptsData[0])
        }
      } else if (hasError(result)) {
        toast.error(result.error || 'Failed to load goods receipts')
      } else {
        toast.error('Failed to load goods receipts')
      }
    } catch (error) {
      console.error('Error loading receipts:', error)
      toast.error('Failed to load goods receipts')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.purchaseOrder?.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.purchaseOrder?.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const calculateReceiptTotal = (lines: Array<{ 
    receivedQuantity: number; 
    unitPrice?: number; 
    purchaseOrderLine?: { unitPrice: number } 
  }>) => {
    return lines.reduce((total, line) => {
      const unitPrice = line.unitPrice || line.purchaseOrderLine?.unitPrice || 0
      return total + (line.receivedQuantity * unitPrice)
    }, 0)
  }

  const totalValue = receipts.reduce((sum, receipt) => {
    const receiptTotal = calculateReceiptTotal(receipt.lines)
    return sum + receiptTotal
  }, 0)

  const totalItems = receipts.reduce(
    (sum, receipt) => sum + receipt.lines.reduce((s, line) => s + line.receivedQuantity, 0), 
    0
  )

  const handleAddGoodsReceipt = () => {
    router.push('/dashboard/purchases/purchase-orders')
  }

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/purchases/goods-receipt/${id}`)
  }

  const handlePrint = async (id: string) => {
    setActionLoading(`print-${id}`)
    try {
      if (typeof window !== 'undefined') {
        window.print()
      }
      toast.success('Print dialog opened')
    } catch (error) {
      console.error('Error printing:', error)
      toast.error('Failed to print')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExport = async (id: string, format: 'pdf' | 'excel') => {
    setActionLoading(`export-${id}-${format}`)
    try {
      const result = await handleExportGoodsReceipt(id, format)
      if (result.success) {
        toast.success(`Exported as ${format.toUpperCase()}`)
      } else if (hasError(result)) {
        toast.error(result.error || 'Export failed')
      } else {
        toast.error('Export failed')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Failed to export')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmail = async (id: string) => {
    setActionLoading(`email-${id}`)
    try {
      const result = await handleSendEmail(id)
      if (result.success) {
        toast.success('Email sent successfully')
      } else if (hasError(result)) {
        toast.error(result.error || 'Failed to send email')
      } else {
        toast.error('Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = async (id: string) => {
    await handleExport(id, 'pdf')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goods receipt? This will reverse inventory changes and cannot be undone.')) {
      return
    }

    setActionLoading(`delete-${id}`)
    try {
      const result = await deleteGoodsReceipt(id)
      if (result.success) {
        toast.success('Goods receipt deleted successfully')
        await loadReceipts()
        
        if (selectedReceipt?.id === id) {
          setSelectedReceipt(receipts[0] || null)
        }
      } else if (hasError(result)) {
        toast.error(result.error || 'Failed to delete goods receipt')
      } else {
        toast.error('Failed to delete goods receipt')
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast.error('Failed to delete goods receipt')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading goods receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Modern Header */}
      <div className="border-b px-6 py-4 flex-shrink-0 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Goods Receipts
              </h1>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Completed purchase order receipts ready for review
              </p>
            </div>
            <Button 
              onClick={handleAddGoodsReceipt}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg"
            >
              View Purchase Orders
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Receipts</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{receipts.length}</p>
                  </div>
                  <div className="p-2 bg-rose-100 rounded-full">
                    <FileText className="w-5 h-5 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Items Received</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{totalItems}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Value</p>
                    <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Panel - Receipt List */}
            <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
              <Card className="h-full flex flex-col shadow-md border border-slate-200">
                {/* Search */}
                <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search receipt or supplier..."
                      className="pl-10 border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredReceipts.length > 0 ? (
                        filteredReceipts.map((receipt, index) => {
                          const statusConfig = getStatusConfig(receipt.status)
                          const receiptTotal = calculateReceiptTotal(receipt.lines)
                          
                          return (
                            <motion.button
                              key={receipt.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2, delay: index * 0.03 }}
                              onClick={() => setSelectedReceipt(receipt)}
                              disabled={!!actionLoading}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedReceipt?.id === receipt.id
                                  ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg scale-[1.02]'
                                  : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                    <p className="font-bold text-rose-600 truncate">
                                      {receipt.receiptNumber}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {receipt.purchaseOrder?.supplier?.name || 'Unknown Supplier'}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                    {formatDate(receipt.receivedDate)}
                                  </p>
                                </div>
                                <Badge className="bg-green-100 text-green-700 border-green-300 flex-shrink-0 ml-2 font-medium text-xs px-3 py-1">
                                  ✓
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                <div className="flex-1">
                                  <p className="text-xs text-slate-500 mb-0.5">Total Value</p>
                                  <p className="text-xl font-bold text-slate-900">
                                    {formatCurrency(receiptTotal)}
                                  </p>
                                </div>
                                <div className="text-right flex-1">
                                  <p className="text-xs text-slate-500 mb-0.5">Items</p>
                                  <p className="text-xl font-bold text-slate-900">
                                    {receipt.lines.reduce((sum, line) => sum + line.receivedQuantity, 0)}
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          )
                        })
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-slate-500"
                        >
                          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                          <p className="font-medium mb-2">No receipts found</p>
                          <p className="text-sm mb-4">Try adjusting your search</p>
                          <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/purchases/purchase-orders')}
                          >
                            Go to Purchase Orders
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Right Panel - Detail or Selection Prompt */}
            <div className="lg:col-span-2 h-full overflow-hidden">
              {selectedReceipt ? (
                <Card className="h-full flex items-center justify-center shadow-md border border-slate-200">
                  <CardContent className="text-center p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 mb-6">
                      <FileText className="w-10 h-10 text-rose-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900">
                      Receipt Selected
                    </h3>
                    <p className="text-slate-600 mb-2">
                      {selectedReceipt.receiptNumber}
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      Click below to view complete details, print, or email this receipt
                    </p>
                    <Button 
                      onClick={() => handleViewDetails(selectedReceipt.id)}
                      className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg"
                      size="lg"
                    >
                      View Full Details
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center shadow-md border border-slate-200">
                  <CardContent className="text-center text-slate-400 p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
                      <FileText className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-xl font-semibold mb-2 text-slate-600">No receipt selected</p>
                    <p className="text-sm text-slate-500">
                      Select a receipt from the list to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}